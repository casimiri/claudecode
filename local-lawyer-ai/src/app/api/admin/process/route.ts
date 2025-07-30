import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../../lib/supabase'
import { createEmbedding } from '../../../../../lib/openai'
import jwt from 'jsonwebtoken'
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
  } catch (error) {
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
  // Download file from Supabase Storage
  const { data: fileData, error } = await supabaseAdmin.storage
    .from('legal-documents')
    .download(filePath)

  if (error || !fileData) {
    throw new Error('Failed to download file')
  }

  const buffer = Buffer.from(await fileData.arrayBuffer())

  switch (contentType) {
    case 'application/pdf':
      const pdfData = await pdfParse(buffer)
      return pdfData.text

    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      const docxResult = await mammoth.extractRawText({ buffer })
      return docxResult.value

    case 'text/plain':
      return buffer.toString('utf-8')

    default:
      throw new Error('Unsupported file type')
  }
}

export async function POST(request: NextRequest) {
  try {
    const admin = verifyAdminToken(request)
    const { documentId } = await request.json()

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
    }

    // Get document metadata
    const { data: document, error: docError } = await supabaseAdmin
      .from('legal_documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (docError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    if (document.processed) {
      return NextResponse.json({ error: 'Document already processed' }, { status: 400 })
    }

    // Extract text from file
    const text = await extractTextFromFile(document.file_path, document.content_type)

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
            chunk_length: batch[j].length
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
    console.error('Processing error:', error)
    
    // Update document with error status
    if (request.body) {
      try {
        const { documentId } = await request.json()
        await supabaseAdmin
          .from('legal_documents')
          .update({ 
            processed: false,
            updated_at: new Date().toISOString()
          })
          .eq('id', documentId)
      } catch (e) {
        // Ignore errors in error handling
      }
    }

    return NextResponse.json(
      { error: error.message || 'Processing failed' },
      { status: error.message === 'Invalid token' ? 401 : 500 }
    )
  }
}