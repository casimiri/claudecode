import { NextRequest, NextResponse } from 'next/server'
import jwt from 'jsonwebtoken'
import { validateUrl, fetchAndProcessUrl } from '../../../../../lib/urlProcessor'

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
    
    const { url } = await request.json()

    if (!url || typeof url !== 'string') {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 })
    }

    // Validate the URL
    const validation = await validateUrl(url)
    
    if (!validation.valid) {
      return NextResponse.json({ 
        valid: false, 
        error: validation.error || 'Invalid URL' 
      }, { status: 400 })
    }

    // If valid, try to fetch a preview
    try {
      const preview = await fetchAndProcessUrl(url)
      return NextResponse.json({ 
        valid: true,
        contentType: validation.contentType,
        preview: {
          title: preview.title,
          description: preview.description
        }
      })
    } catch (previewError: any) {
      // URL is valid but we couldn't fetch preview - still allow it
      return NextResponse.json({ 
        valid: true,
        contentType: validation.contentType,
        preview: {
          title: 'URL Content',
          description: 'Content available for processing'
        },
        warning: previewError.message
      })
    }

  } catch (error: any) {
    console.error('URL validation error:', error)
    return NextResponse.json(
      { error: error.message || 'Validation failed' },
      { status: 500 }
    )
  }
}