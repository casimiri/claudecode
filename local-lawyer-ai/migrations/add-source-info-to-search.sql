-- Migration to update search function to include document source information
-- Run this script to enhance the search results with source URLs

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