import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
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

    // Protect dashboard and chat routes
    if (req.nextUrl.pathname.startsWith('/dashboard') || req.nextUrl.pathname.startsWith('/chat')) {
      if (!session) {
        return NextResponse.redirect(new URL('/login', req.url))
      }

      // Check subscription status (simplified for development)
      const { data: user } = await supabase
        .from('users')
        .select('subscription_status')
        .eq('id', session.user.id)
        .single()

      if (!user || user.subscription_status !== 'active') {
        return NextResponse.redirect(new URL('/subscribe', req.url))
      }
    }
  } catch (error) {
    // If there's an error, allow the request to continue
    console.log('Middleware error:', error)
  }

  return response
}

export const config = {
  matcher: []
}