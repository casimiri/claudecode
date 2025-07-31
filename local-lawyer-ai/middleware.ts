import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'

const intlMiddleware = createIntlMiddleware({
  locales: ['en', 'fr'],
  defaultLocale: 'en'
});

async function handleAuthMiddleware(req: NextRequest) {
  let response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return req.cookies.get(name)?.value
        },
        set(name: string, value: string, options: any) {
          req.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: any) {
          req.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()

    // Protect admin routes
    if (req.nextUrl.pathname.startsWith('/admin') && !req.nextUrl.pathname.startsWith('/admin/login')) {
      if (!session) {
        return NextResponse.redirect(new URL('/admin/login', req.url))
      }
      
      // Check if user is admin (simplified for development)
      const { data: admin } = await supabase
        .from('admins')
        .select('*')
        .eq('email', session.user.email)
        .single()

      if (!admin) {
        return NextResponse.redirect(new URL('/', req.url))
      }
    }
  } catch (error) {
    // If there's an error, allow the request to continue
    console.log('Middleware error:', error)
  }

  return response
}

export async function middleware(req: NextRequest) {
  // Skip intl middleware for API routes, admin routes, and auth routes
  if (req.nextUrl.pathname.startsWith('/api') || 
      req.nextUrl.pathname.startsWith('/admin') || 
      req.nextUrl.pathname.startsWith('/auth')) {
    // Handle auth-related logic for non-intl routes
    return handleAuthMiddleware(req);
  }

  // Handle internationalization for all other routes
  const intlResponse = intlMiddleware(req);
  if (intlResponse) {
    return intlResponse;
  }

  // For localized routes, we need to handle auth differently
  // since the routes now include locale (e.g., /en/dashboard, /fr/login)
  const locale = req.nextUrl.pathname.split('/')[1];
  const pathWithoutLocale = req.nextUrl.pathname.replace(`/${locale}`, '');

  // Handle auth for localized protected routes
  if (pathWithoutLocale.startsWith('/dashboard') || pathWithoutLocale.startsWith('/chat')) {
    // Auth logic will be handled in the page components for now
    // to avoid complexity with locale-based redirects
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
}