import * as cheerio from 'cheerio'

export interface UrlProcessingResult {
  content: string
  title: string
  description: string
  contentType: string
  url: string
}

export interface UrlMetadata {
  title: string
  description: string
  contentType: string
}

/**
 * Extract text content from HTML
 */
function extractTextFromHtml(html: string): { content: string; metadata: UrlMetadata } {
  const $ = cheerio.load(html)
  
  // Remove script and style elements
  $('script, style, nav, header, footer, aside').remove()
  
  // Get title
  const title = $('title').text().trim() || 
                $('h1').first().text().trim() || 
                'Untitled Document'
  
  // Get description from meta tag or first paragraph
  let description = $('meta[name="description"]').attr('content') || 
                   $('meta[property="og:description"]').attr('content') || 
                   ''
  
  if (!description) {
    const firstParagraph = $('p').first().text().trim()
    description = firstParagraph.length > 160 ? 
                  firstParagraph.substring(0, 160) + '...' : 
                  firstParagraph
  }
  
  // Extract main content - prioritize article, main, or body content
  let content = ''
  const contentSelectors = [
    'article',
    'main',
    '[role="main"]',
    '.content',
    '.post-content',
    '.entry-content',
    '#content',
    'body'
  ]
  
  for (const selector of contentSelectors) {
    const element = $(selector).first()
    if (element.length) {
      content = element.text()
      break
    }
  }
  
  // Clean up the content
  content = content
    .replace(/\s+/g, ' ') // Replace multiple whitespace with single space
    .replace(/\n\s*\n/g, '\n') // Remove empty lines
    .trim()
  
  return {
    content,
    metadata: {
      title: title.substring(0, 255), // Limit title length
      description: description.substring(0, 500), // Limit description length
      contentType: 'text/html'
    }
  }
}

/**
 * Fetch and process content from a URL
 */
export async function fetchAndProcessUrl(url: string): Promise<UrlProcessingResult> {
  try {
    // Validate URL
    const urlObj = new URL(url)
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      throw new Error('Only HTTP and HTTPS URLs are supported')
    }
    
    // Fetch the content
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LocalLawyer-AI/1.0)',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,text/plain;q=0.8,*/*;q=0.5',
        'Accept-Language': 'en-US,en;q=0.5',
        'Accept-Encoding': 'gzip, deflate',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      // Add timeout
      signal: AbortSignal.timeout(30000) // 30 seconds
    })
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status} - ${response.statusText}`)
    }
    
    const contentType = response.headers.get('content-type') || ''
    const text = await response.text()
    
    if (!text.trim()) {
      throw new Error('Empty response from URL')
    }
    
    // Process based on content type
    if (contentType.includes('text/html') || contentType.includes('application/xhtml')) {
      const { content, metadata } = extractTextFromHtml(text)
      
      if (content.length < 100) {
        throw new Error('Insufficient content extracted from HTML (less than 100 characters)')
      }
      
      return {
        content,
        title: metadata.title,
        description: metadata.description,
        contentType: metadata.contentType,
        url
      }
    } else if (contentType.includes('text/plain')) {
      // For plain text, extract title from first line if it looks like a title
      const lines = text.split('\n').filter(line => line.trim())
      const firstLine = lines[0]?.trim() || ''
      
      const title = firstLine.length > 5 && firstLine.length < 100 ? 
                   firstLine : 
                   'Plain Text Document'
      
      const description = lines.slice(1, 3).join(' ').substring(0, 200)
      
      return {
        content: text,
        title: title.substring(0, 255),
        description: description || 'Plain text document',
        contentType: 'text/plain',
        url
      }
    } else {
      throw new Error(`Unsupported content type: ${contentType}`)
    }
    
  } catch (error: any) {
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - URL took too long to respond')
    } else if (error.name === 'TypeError' && error.message.includes('fetch')) {
      throw new Error('Failed to connect to URL - check if the URL is accessible')
    } else {
      throw new Error(`Failed to fetch URL: ${error.message}`)
    }
  }
}

/**
 * Validate if a URL is accessible and contains processable content
 */
export async function validateUrl(url: string): Promise<{ valid: boolean; error?: string; contentType?: string }> {
  try {
    const urlObj = new URL(url)
    if (!['http:', 'https:'].includes(urlObj.protocol)) {
      return { valid: false, error: 'Only HTTP and HTTPS URLs are supported' }
    }
    
    // Make a HEAD request first to check if accessible
    const headResponse = await fetch(url, {
      method: 'HEAD',
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; LocalLawyer-AI/1.0)'
      },
      signal: AbortSignal.timeout(10000) // 10 seconds for validation
    })
    
    if (!headResponse.ok) {
      return { valid: false, error: `URL returned ${headResponse.status}: ${headResponse.statusText}` }
    }
    
    const contentType = headResponse.headers.get('content-type') || ''
    
    if (!contentType.includes('text/html') && 
        !contentType.includes('application/xhtml') && 
        !contentType.includes('text/plain')) {
      return { 
        valid: false, 
        error: `Unsupported content type: ${contentType}. Only HTML and plain text are supported.` 
      }
    }
    
    return { valid: true, contentType }
    
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return { valid: false, error: 'URL validation timeout' }
    } else if (error instanceof TypeError) {
      return { valid: false, error: 'Invalid URL format' }
    } else {
      return { valid: false, error: `Validation failed: ${error.message}` }
    }
  }
}