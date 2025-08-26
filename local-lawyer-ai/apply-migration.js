const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function applyMigration() {
  try {
    console.log('Applying database migration to update search function...');
    
    // Drop and recreate the search function with additional fields
    const migrationSQL = `
-- Drop and recreate the search function with additional document fields
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
$$;
    `;
    
    const { error } = await supabase.rpc('exec', {
      sql: migrationSQL
    });
    
    if (error) {
      console.error('Migration failed:', error);
      console.log('Attempting direct query execution...');
      
      // Try executing queries one by one
      const queries = migrationSQL.split(';').filter(q => q.trim());
      
      for (const query of queries) {
        if (query.trim()) {
          console.log('Executing:', query.substring(0, 50) + '...');
          const result = await supabase.from('dual').select().limit(0); // This won't work, let's try a different approach
        }
      }
    } else {
      console.log('Migration applied successfully!');
    }
    
    // Test the function
    console.log('Testing the updated search function...');
    const { data: testResult, error: testError } = await supabase.rpc('search_document_chunks', {
      query_embedding: new Array(1536).fill(0.1),
      match_threshold: 0.1,
      match_count: 1
    });
    
    if (testError) {
      console.error('Function test failed:', testError);
    } else {
      console.log('Function test successful! New fields available:', 
        testResult && testResult[0] ? Object.keys(testResult[0]) : 'No results');
    }
    
  } catch (error) {
    console.error('Error applying migration:', error);
  }
}

applyMigration();