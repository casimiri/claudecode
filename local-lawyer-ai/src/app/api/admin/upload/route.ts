import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../../lib/supabase'
import jwt from 'jsonwebtoken'

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

export async function POST(request: NextRequest) {
  try {
    // Add better error logging for admin verification
    let admin
    try {
      admin = verifyAdminToken(request)
    } catch (authError: any) {
      console.error('Admin authentication failed:', authError.message)
      return NextResponse.json({ error: 'Authentication required. Please login as admin.' }, { status: 401 })
    }
    
    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ]

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: 'Invalid file type' }, { status: 400 })
    }

    // Generate unique filename
    const timestamp = Date.now()
    const filename = `${timestamp}-${file.name}`
    const filePath = `legal-documents/${filename}`

    // Upload to Supabase Storage
    const { error: uploadError } = await supabaseAdmin.storage
      .from('legal-documents')
      .upload(filePath, file)

    if (uploadError) {
      console.error('Storage upload error:', uploadError)
      return NextResponse.json({ error: 'Failed to upload file' }, { status: 500 })
    }

    // Mark previous documents as not current
    await supabaseAdmin
      .from('legal_documents')
      .update({ is_current: false })
      .eq('is_current', true)

    // Get next version number
    const { data: latestDoc } = await supabaseAdmin
      .from('legal_documents')
      .select('version')
      .order('version', { ascending: false })
      .limit(1)
      .single()

    const nextVersion = (latestDoc?.version || 0) + 1

    // Save document metadata
    const { data: document, error: dbError } = await supabaseAdmin
      .from('legal_documents')
      .insert({
        filename: file.name,
        file_path: filePath,
        file_size: file.size,
        content_type: file.type,
        version: nextVersion,
        is_current: true,
        processed: false,
        uploaded_by: admin.adminId,
      })
      .select()
      .single()

    if (dbError) {
      console.error('Database error:', dbError)
      // Clean up uploaded file
      await supabaseAdmin.storage
        .from('legal-documents')
        .remove([filePath])
      
      return NextResponse.json({ error: 'Failed to save document metadata' }, { status: 500 })
    }

    return NextResponse.json({ 
      success: true, 
      documentId: document.id,
      message: 'File uploaded successfully' 
    })
  } catch (error: any) {
    console.error('Upload error:', error)
    return NextResponse.json(
      { error: error.message || 'Upload failed' },
      { status: error.message === 'Invalid token' ? 401 : 500 }
    )
  }
}