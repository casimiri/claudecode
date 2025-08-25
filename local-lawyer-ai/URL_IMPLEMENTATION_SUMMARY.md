# URL-Based Document Processing Implementation

This document summarizes the changes made to convert the admin system from file uploads to URL-based document processing.

## Changes Made

### 1. Database Schema Updates
**File:** `migrations/url-support.sql`

Added new columns to the `legal_documents` table:
- `source_url` (TEXT) - URL of the document source
- `source_type` (VARCHAR) - Either 'file' or 'url', defaults to 'file' 
- `url_title` (TEXT) - Extracted title from the web page
- `url_description` (TEXT) - Extracted description from the web page
- `last_fetched_at` (TIMESTAMPTZ) - Timestamp of when URL was last fetched

Made existing columns nullable for URL documents:
- `file_path` - Not needed for URL documents
- `file_size` - Not applicable for URL documents

**Note:** This migration needs to be run manually in Supabase SQL Editor.

### 2. URL Processing Library
**File:** `lib/urlProcessor.ts`

New utility library with functions:
- `fetchAndProcessUrl()` - Main function to fetch and extract content from URLs
- `validateUrl()` - Validates if a URL is accessible and contains processable content
- `extractTextFromHtml()` - Extracts clean text content from HTML pages

Features:
- Supports HTML pages and plain text documents
- Intelligent content extraction (prioritizes article/main content)
- Extracts metadata (title, description)
- Proper error handling and validation
- 30-second timeout for URL fetching
- User-Agent string for better compatibility

### 3. Admin UI Changes
**File:** `src/app/admin/upload/page.tsx`

Completely redesigned the admin upload interface:
- Replaced file upload with URL input field
- Added real-time URL validation with debouncing
- URL preview showing extracted title and description
- Visual indicators for validation status
- Updated messaging and guidelines for URL-based processing

### 4. API Route Updates

#### URL Validation Endpoint
**File:** `src/app/api/admin/validate-url/route.ts`
- New endpoint for validating URLs before processing
- Returns validation status and content preview
- Handles authentication and error cases

#### Enhanced Upload Route
**File:** `src/app/api/admin/upload/route.ts`
- Now handles both JSON (URL) and FormData (file) payloads
- Stores URL documents with proper metadata
- Maintains backward compatibility with file uploads

#### Enhanced Process Route
**File:** `src/app/api/admin/process/route.ts`
- Added URL content fetching capability
- Processes both file and URL-based documents
- Updates document metadata with fetched information
- Includes source information in vector embeddings

### 5. Dependencies Added
- `cheerio` - For HTML parsing and content extraction
- `dotenv` - For environment variable loading in migration scripts

## Database Migration Required

Before using the URL functionality, run this SQL in your Supabase SQL Editor:

```sql
-- Add new columns for URL support
ALTER TABLE public.legal_documents
ADD COLUMN IF NOT EXISTS source_url TEXT,
ADD COLUMN IF NOT EXISTS source_type VARCHAR(10) DEFAULT 'file' CHECK (source_type IN ('file', 'url')),
ADD COLUMN IF NOT EXISTS url_title TEXT,
ADD COLUMN IF NOT EXISTS url_description TEXT,
ADD COLUMN IF NOT EXISTS last_fetched_at TIMESTAMPTZ;

-- Make file_path and file_size nullable for URL documents
ALTER TABLE public.legal_documents
ALTER COLUMN file_path DROP NOT NULL,
ALTER COLUMN file_size DROP NOT NULL;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_legal_documents_source_type ON public.legal_documents(source_type);
CREATE INDEX IF NOT EXISTS idx_legal_documents_source_url ON public.legal_documents(source_url);

-- Update existing records to have source_type = 'file'
UPDATE public.legal_documents 
SET source_type = 'file' 
WHERE source_type IS NULL OR source_type = '';
```

## Features

### URL Processing
- Extracts clean text content from HTML pages
- Removes navigation, ads, and other non-content elements
- Supports plain text documents
- Validates URLs before processing
- Provides content preview to admin before adding

### Content Intelligence
- Prioritizes main content areas (article, main tags)
- Extracts meaningful titles and descriptions
- Handles various HTML structures gracefully
- Filters out very short content chunks

### Error Handling
- Comprehensive validation of URL format and accessibility
- Proper error messages for different failure scenarios
- Timeout handling for slow-loading pages
- Graceful fallbacks for content extraction

## Testing the Implementation

1. Apply the database migration in Supabase SQL Editor
2. Start the development server: `npm run dev`
3. Access admin panel: `http://localhost:3000/admin/login`
4. Navigate to the upload page: `http://localhost:3000/admin/upload`
5. Enter a URL (e.g., a government legal document page)
6. Wait for validation and preview
7. Click "Add Document from URL"
8. The system will fetch, process, and create vector embeddings

## Backward Compatibility

- File upload functionality remains available in the API
- Existing file-based documents continue to work
- The chat system processes both file and URL documents seamlessly
- Admin dashboard shows both types of documents

## Security Considerations

- Only HTTP/HTTPS URLs are supported
- URLs must be publicly accessible (no authentication)
- Content extraction is safe and doesn't execute scripts
- Proper error handling prevents information disclosure
- Admin authentication required for all operations