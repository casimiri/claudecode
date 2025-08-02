import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../../../lib/supabase'
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
  } catch (error) {
    throw new Error('Invalid token')
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Verify admin authentication
    const admin = verifyAdminToken(request)
    const { id: documentId } = await params

    if (!documentId) {
      return NextResponse.json({ error: 'Document ID is required' }, { status: 400 })
    }

    // Get document metadata to get file path
    const { data: document, error: fetchError } = await supabaseAdmin
      .from('legal_documents')
      .select('*')
      .eq('id', documentId)
      .single()

    if (fetchError || !document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Delete document chunks first (cascading delete)
    const { error: chunksError } = await supabaseAdmin
      .from('document_chunks')
      .delete()
      .eq('document_id', documentId)

    if (chunksError) {
      console.error('Error deleting document chunks:', chunksError)
      return NextResponse.json({ error: 'Failed to delete document chunks' }, { status: 500 })
    }

    // Delete file from storage
    const { error: storageError } = await supabaseAdmin.storage
      .from('legal-documents')
      .remove([document.file_path])

    if (storageError) {
      console.error('Error deleting file from storage:', storageError)
      // Continue with database deletion even if storage deletion fails
    }

    // Delete document record from database
    const { error: deleteError } = await supabaseAdmin
      .from('legal_documents')
      .delete()
      .eq('id', documentId)

    if (deleteError) {
      console.error('Error deleting document record:', deleteError)
      return NextResponse.json({ error: 'Failed to delete document record' }, { status: 500 })
    }

    return NextResponse.json({
      success: true,
      message: 'Document deleted successfully'
    })
  } catch (error: any) {
    console.error('Delete error:', error)
    return NextResponse.json(
      { error: error.message || 'Delete failed' },
      { status: error.message === 'Invalid token' ? 401 : 500 }
    )
  }
}