import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import createIntlMiddleware from 'next-intl/middleware'
import {locales} from './src/i18n'

const intlMiddleware = createIntlMiddleware({
  locales,
  defaultLocale: 'en',
  localePrefix: 'always'
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
  return intlMiddleware(req);
}

export const config = {
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)']
}