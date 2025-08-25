-- Migration to add URL support to legal documents
-- Run this script to update existing database schema

-- Add new columns to support URL-based documents
ALTER TABLE public.legal_documents
ADD COLUMN IF NOT EXISTS source_url TEXT,
ADD COLUMN IF NOT EXISTS source_type VARCHAR(10) NOT NULL DEFAULT 'file' CHECK (source_type IN ('file', 'url')),
ADD COLUMN IF NOT EXISTS url_title TEXT,
ADD COLUMN IF NOT EXISTS url_description TEXT,
ADD COLUMN IF NOT EXISTS last_fetched_at TIMESTAMPTZ;

-- Make file_path nullable since URL documents won't have file paths
ALTER TABLE public.legal_documents
ALTER COLUMN file_path DROP NOT NULL;

-- Make file_size nullable since URL documents may not have known sizes
ALTER TABLE public.legal_documents
ALTER COLUMN file_size DROP NOT NULL;

-- Add indexes for new columns
CREATE INDEX IF NOT EXISTS idx_legal_documents_source_type ON public.legal_documents(source_type);
CREATE INDEX IF NOT EXISTS idx_legal_documents_source_url ON public.legal_documents(source_url);

-- Add constraint to ensure URL documents have source_url
ALTER TABLE public.legal_documents
ADD CONSTRAINT check_url_source CHECK (
  (source_type = 'file' AND file_path IS NOT NULL) OR
  (source_type = 'url' AND source_url IS NOT NULL)
);

-- Update existing records to have source_type = 'file'
UPDATE public.legal_documents SET source_type = 'file' WHERE source_type IS NULL;