const { createClient } = require('@supabase/supabase-js');

// Load environment variables
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function testSources() {
  try {
    console.log('Testing document chunks and their metadata...\n');
    
    // Check for URL documents first
    const { data: urlDocs, error: urlError } = await supabase
      .from('legal_documents')
      .select('id, filename, source_type, source_url, url_title, processed')
      .eq('source_type', 'url');
    
    console.log('URL-based documents:', urlDocs);
    
    // Get chunks from URL documents to see their metadata
    const { data: chunks, error } = await supabase
      .from('document_chunks')
      .select(`
        id,
        content,
        metadata,
        legal_documents!inner(filename, source_type, source_url, url_title)
      `)
      .eq('legal_documents.source_type', 'url')
      .limit(3);
    
    if (error) {
      console.error('Error fetching chunks:', error);
      return;
    }
    
    console.log(`Found ${chunks?.length || 0} document chunks:`);
    
    chunks?.forEach((chunk, index) => {
      console.log(`\n--- Chunk ${index + 1} ---`);
      console.log('Content preview:', chunk.content.substring(0, 100) + '...');
      console.log('Metadata:', JSON.stringify(chunk.metadata, null, 2));
      console.log('Document info:', chunk.legal_documents);
    });
    
    // Test the search function
    console.log('\n\nTesting search function...');
    const { data: searchResults, error: searchError } = await supabase.rpc('search_document_chunks', {
      query_embedding: Array(1536).fill(0.1),
      match_threshold: 0.1,
      match_count: 2
    });
    
    if (searchError) {
      console.error('Search function error:', searchError);
    } else {
      console.log(`Search returned ${searchResults?.length || 0} results:`);
      searchResults?.forEach((result, index) => {
        console.log(`\n--- Search Result ${index + 1} ---`);
        console.log('Available fields:', Object.keys(result));
        console.log('Filename:', result.filename || 'Not available');
        console.log('Source URL:', result.source_url || 'Not available');
        console.log('Source Type:', result.source_type || 'Not available');
        console.log('Metadata source URL:', result.metadata?.source_url || 'Not available');
      });
    }
    
  } catch (error) {
    console.error('Test failed:', error);
  }
}

testSources();