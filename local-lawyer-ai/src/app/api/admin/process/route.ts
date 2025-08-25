import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../../lib/supabase'
import { createEmbedding } from '../../../../../lib/openai'
import { fetchAndProcessUrl } from '../../../../../lib/urlProcessor'
import jwt from 'jsonwebtoken'
// Dynamic imports to avoid build issues
// import pdfParse from 'pdf-parse'
// import mammoth from 'mammoth'

function verifyAdminToken(request: NextRequest) {
  const token = request.cookies.get('admin-token')?.value

  if (!token) {
    throw new Error('No admin token')
  }

  try {
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as any
    if (decoded.role !== 'admin') {
      throw new Error('Invalid role')
    }
    return decoded
  } catch {
    throw new Error('Invalid token')
  }
}

function chunkText(text: string, maxLength: number = 1000): string[] {
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0)
  const chunks: string[] = []
  let currentChunk = ''

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim()
    if (currentChunk.length + trimmedSentence.length > maxLength) {
      if (currentChunk) {
        chunks.push(currentChunk.trim())
        currentChunk = trimmedSentence
      } else {
        // If a single sentence is longer than maxLength, add it anyway
        chunks.push(trimmedSentence)
      }
    } else {
      currentChunk += (currentChunk ? '. ' : '') + trimmedSentence
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk.trim())
  }

  return chunks.filter(chunk => chunk.length > 50) // Filter out very short chunks
}

async function extractTextFromFile(filePath: string, contentType: string): Promise<string> {
  console.log('Downloading file from storage:', filePath)
  
  // Download file from Supabase Storage
  const { data: fileData, error } = await supabaseAdmin.storage
    .from('legal-documents')
    .download(filePath)

  if (error || !fileData) {
    console.error('Storage download error:', error)
    throw new Error(`Failed to download file: ${error?.message || 'Unknown error'}`)
  }
  
  console.log('File downloaded successfully, size:', fileData.size)

  const buffer = Buffer.from(await fileData.arrayBuffer())

  switch (contentType) {
    case 'application/pdf':
      try {
        // Try to avoid the debug mode issue by requiring directly
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const pdfParse = require('pdf-parse')
        const pdfData = await pdfParse(buffer)
        return pdfData.text
      } catch (error: any) {
        console.error('PDF parsing failed:', error.message)
        throw new Error('Failed to parse PDF file')
      }

    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      const mammoth = await import('mammoth')
      const docxResult = await mammoth.extractRawText({ buffer })
      return docxResult.value

    case 'text/plain':
      return buffer.toString('utf-8')

    default:
      throw new Error('Unsupported file type')
  }
}

async function extractTextFromUrl(url: string): Promise<{ text: string; metadata: any }> {
  console.log('Fetching content from URL:', url)
  
  try {
    const result = await fetchAndProcessUrl(url)
    
    return {
      text: result.content,
      metadata: {
        title: result.title,
        description: result.description,
        contentType: result.contentType,
        url: result.url,
        fetchedAt: new Date().toISOString()
      }
    }
  } catch (error: any) {
    console.error('URL processing failed:', error.message)
    throw new Error(`Failed to fetch content from URL: ${error.message}`)
  }
}

export async function POST(request: NextRequest) {
  console.log('Process endpoint called')
  let documentId: string | null = null
  try {
    verifyAdminToken(request)
    const body = await request.json()
    documentId = body.documentId
    console.log('Process request body:', body)
    console.log('Document ID:', documentId)

    if (!documentId) {
      console.log('No document ID provided')
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
    }

    // Get document metadata
    const { data: document, error: docError } = await supabaseAdmin
      .from('legal_documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      console.log('Document not found:', docError)
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    console.log('Document found:', { id: document.id, filename: document.filename, processed: document.processed })

    if (document.processed) {
      console.log('Document already processed, returning 400')
      return NextResponse.json({ error: 'Document already processed' }, { status: 400 })
    }

    // Extract text based on document source type
    console.log('Processing document:', {
      id: documentId,
      filename: document.filename,
      sourceType: document.source_type,
      filePath: document.file_path,
      sourceUrl: document.source_url,
      contentType: document.content_type
    })
    
    let text: string
    let extractionMetadata: any = {}

    if (document.source_type === 'url') {
      // Extract text from URL
      if (!document.source_url) {
        throw new Error('URL document missing source_url')
      }
      const urlResult = await extractTextFromUrl(document.source_url)
      text = urlResult.text
      extractionMetadata = urlResult.metadata

      // Update document with fetched metadata if not already set
      const updateData: any = {
        last_fetched_at: new Date().toISOString()
      }
      
      if (!document.url_title && extractionMetadata.title) {
        updateData.url_title = extractionMetadata.title
      }
      
      if (!document.url_description && extractionMetadata.description) {
        updateData.url_description = extractionMetadata.description
      }

      await supabaseAdmin
        .from('legal_documents')
        .update(updateData)
        .eq('id', documentId)
    } else {
      // Extract text from file
      if (!document.file_path) {
        throw new Error('File document missing file_path')
      }
      text = await extractTextFromFile(document.file_path, document.content_type)
      extractionMetadata = {
        filename: document.filename,
        contentType: document.content_type,
        fileSize: document.file_size
      }
    }

    if (!text || text.trim().length === 0) {
      throw new Error('No text extracted from document')
    }

    // Chunk the text
    const chunks = chunkText(text)

    if (chunks.length === 0) {
      throw new Error('No valid chunks created from document')
    }

    // Process chunks in batches to avoid rate limits
    const batchSize = 5
    const chunkRecords = []

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize)
      
      const embeddings = await Promise.all(
        batch.map(chunk => createEmbedding(chunk))
      )

      for (let j = 0; j < batch.length; j++) {
        chunkRecords.push({
          document_id: documentId,
          chunk_index: i + j,
          content: batch[j],
          embedding: embeddings[j],
          metadata: {
            filename: document.filename,
            version: document.version,
            chunk_length: batch[j].length,
            source_type: document.source_type,
            source_url: document.source_url || null,
            ...extractionMetadata
          }
        })
      }

      // Small delay between batches
      if (i + batchSize < chunks.length) {
        await new Promise(resolve => setTimeout(resolve, 1000))
      }
    }

    // Save all chunks to database
    const { error: chunksError } = await supabaseAdmin
      .from('document_chunks')
      .insert(chunkRecords)

    if (chunksError) {
      console.error('Error inserting chunks:', chunksError)
      throw new Error('Failed to save document chunks')
    }

    // Mark document as processed
    const { error: updateError } = await supabaseAdmin
      .from('legal_documents')
      .update({ processed: true, updated_at: new Date().toISOString() })
      .eq('id', documentId)

    if (updateError) {
      console.error('Error updating document status:', updateError)
      throw new Error('Failed to update document status')
    }

    return NextResponse.json({
      success: true,
      message: `Document processed successfully. Created ${chunkRecords.length} chunks.`,
      chunksCreated: chunkRecords.length
    })
  } catch (error: any) {
    console.error('Processing error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    
    // Update document with error status
    if (documentId) {
      try {
        await supabaseAdmin
          .from('legal_documents')
          .update({ 
            processed: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', documentId)
      } catch (updateError) {
        console.error('Failed to update document status:', updateError)
      }
    }

    return NextResponse.json(
      { error: error.message || 'Processing failed' },
      { status: error.message === 'Invalid token' ? 401 : 500 }
    )
  }
}