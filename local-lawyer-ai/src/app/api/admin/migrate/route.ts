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
    // Verify admin authentication
    try {
      verifyAdminToken(request)
    } catch (authError: any) {
      console.error('Admin authentication failed:', authError.message)
      return NextResponse.json({ error: 'Authentication required. Please login as admin.' }, { status: 401 })
    }

    console.log('Applying database migration to update search function...')
    
    // Test current search function to see what fields it returns
    const { data: currentTest, error: currentTestError } = await supabaseAdmin
      .rpc('search_document_chunks', {
        query_embedding: Array(1536).fill(0.1),
        match_threshold: 0.1,
        match_count: 1
      })
    
    if (currentTestError) {
      console.error('Current function test failed:', currentTestError)
    } else {
      const currentFields = currentTest && currentTest[0] ? Object.keys(currentTest[0]) : []
      console.log('Current function returns fields:', currentFields)
      
      // Check if we already have the new fields
      if (currentFields.includes('filename') && currentFields.includes('source_url')) {
        return NextResponse.json({ 
          success: true,
          message: 'Migration already applied. Search function already returns source information.',
          current_fields: currentFields
        })
      }
    }

    // Since we can't easily modify the function via RPC, let's provide instructions
    const migrationSQL = `-- COPY AND RUN THIS IN SUPABASE SQL EDITOR:

DROP FUNCTION IF EXISTS search_document_chunks(vector(1536), float, int);

CREATE OR REPLACE FUNCTION search_document_chunks(
  query_embedding vector(1536),
  match_threshold float,
  match_count int
)
RETURNS TABLE (
  id uuid,
  document_id uuid,
  content text,
  metadata jsonb,
  similarity float,
  filename text,
  source_type varchar(10),
  source_url text,
  url_title text
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id,
    dc.document_id,
    dc.content,
    dc.metadata,
    1 - (dc.embedding <=> query_embedding) AS similarity,
    ld.filename,
    ld.source_type,
    ld.source_url,
    ld.url_title
  FROM document_chunks dc
  JOIN legal_documents ld ON dc.document_id = ld.id
  WHERE 
    ld.processed = true
    AND ld.is_current = true
    AND dc.embedding IS NOT NULL
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;`

    return NextResponse.json({ 
      success: false,
      message: 'Manual migration required. Please run the provided SQL in Supabase SQL Editor.',
      migration_sql: migrationSQL,
      current_fields: currentTest && currentTest[0] ? Object.keys(currentTest[0]) : []
    })

  } catch (error: any) {
    console.error('Migration error:', error)
    return NextResponse.json(
      { error: error.message || 'Migration failed' },
      { status: 500 }
    )
  }
}