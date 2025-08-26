# Source URL Display Implementation

This document outlines the implementation of source URL display in AI chat responses.

## Overview

The AI chat system now includes source URLs in responses, allowing users to see and access the original documents that were used to generate the response.

## Changes Made

### 1. Database Schema Updates

**File:** `migrations/add-source-info-to-search.sql`
- Updated `search_document_chunks` function to return document source information
- Added fields: `filename`, `source_type`, `source_url`, `url_title`

### 2. Backend API Changes

**File:** `src/app/api/chat/route.ts`
- Enhanced chat API to extract and process source information from search results
- Added deduplication logic to remove duplicate sources
- Updated response format to include `sources` array and `sourcesCount`

**Source Object Structure:**
```typescript
interface Source {
  filename: string
  source_type: 'file' | 'url'
  source_url?: string
  url_title?: string
  similarity: number
  content_preview: string
}
```

### 3. Frontend UI Updates

**File:** `src/app/[locale]/chat/page.tsx`
- Added `Source` interface and updated `Message` interface
- Enhanced message rendering to display sources section
- Added visual differentiation for URL vs file sources
- Implemented clickable links for URL sources
- Added similarity percentage display

## Features

### Source Attribution
- **File Sources**: Display document filename with file icon
- **URL Sources**: Display clickable links with external link icon
- **Similarity Score**: Show percentage match between query and source
- **Content Preview**: Show first 100 characters of the source content

### Visual Design
- Sources appear in a bordered section below the AI response
- Different icons for URLs (ExternalLink) vs files (FileText)
- Clickable links for URL sources that open in new tabs
- Similarity percentage shown for each source
- Responsive design that works in both light and dark modes

### Deduplication
- Sources are deduplicated based on `source_url` or `filename + source_type`
- Prevents showing the same document multiple times

## Usage

When a user asks a question and the AI finds relevant content from documents:

1. The system searches for relevant document chunks
2. Source information is extracted from matching documents
3. Sources are deduplicated and included in the API response
4. The UI displays sources below the AI response
5. Users can click URL sources to view the original documents

## Example Display

```
AI Response: Based on the legal documents, here's what you need to know...

Sources (2)
🔗 Legal Requirements Document - 85% match
   "This document outlines the basic requirements for..."

📄 compliance-guide.pdf - 78% match
   "All organizations must maintain proper documentation..."
```

## Database Migration Required

To use this feature, run the SQL migration:
```sql
-- See migrations/add-source-info-to-search.sql
```

This updates the search function to return the necessary source information.

## Technical Notes

- Sources are only displayed for assistant messages, not user messages
- The feature works with both existing file uploads and new URL uploads
- Source URLs are preserved in document chunks metadata during ingestion
- The UI gracefully handles cases where sources may not be available