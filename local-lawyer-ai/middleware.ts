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
    // Protect admin routes with JWT token authentication
    if (req.nextUrl.pathname.startsWith('/admin') && !req.nextUrl.pathname.startsWith('/admin/login')) {
      const adminToken = req.cookies.get('admin-token')?.value
      
      if (!adminToken) {
        return NextResponse.redirect(new URL('/admin/login', req.url))
      }
      
      // Verify JWT token
      try {
        const { jwtVerify } = await import('jose')
        const secret = new TextEncoder().encode(process.env.NEXTAUTH_SECRET!)
        const { payload } = await jwtVerify(adminToken, secret)
        console.log('Admin token decoded:', payload)
        
        if (!payload || payload.role !== 'admin') {
          console.log('Admin token invalid - no role or wrong role:', payload)
          return NextResponse.redirect(new URL('/admin/login', req.url))
        }
      } catch (tokenError) {
        // Invalid token, redirect to login
        console.log('Admin token verification error:', tokenError)
        return NextResponse.redirect(new URL('/admin/login', req.url))
      }
    }

    // Handle regular user routes with Supabase auth
    const {
      data: { session },
    } = await supabase.auth.getSession()

    // Add any user-specific auth logic here if needed
    
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