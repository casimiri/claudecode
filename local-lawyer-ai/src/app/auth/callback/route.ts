import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getSupabaseAdmin } from '../../../../lib/supabase'

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )
    
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (error) {
      console.error('Error exchanging code for session:', error)
      return NextResponse.redirect(new URL('/?error=auth_failed', request.url))
    }

    if (data.user) {
      // Use admin client to bypass RLS for user creation
      const supabaseAdmin = getSupabaseAdmin()
      
      const { error: upsertError } = await supabaseAdmin
        .from('users')
        .upsert({
          id: data.user.id,
          email: data.user.email!,
          full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || null,
          avatar_url: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture || null,
          provider: data.user.app_metadata?.provider || 'google',
          provider_id: data.user.user_metadata?.provider_id || data.user.id,
          subscription_plan: 'free',
          subscription_status: 'active',
          tokens_used_this_period: 0,
          tokens_limit: 10000,
          period_start_date: new Date().toISOString(),
          period_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString() // 30 days from now
        }, {
          onConflict: 'id',
          ignoreDuplicates: false
        })

      if (upsertError) {
        console.error('Error creating user profile:', upsertError)
        console.error('User data attempted:', {
          id: data.user.id,
          email: data.user.email,
          metadata: data.user.user_metadata,
          app_metadata: data.user.app_metadata
        })
        return NextResponse.redirect(new URL('/?error=profile_creation_failed&details=' + encodeURIComponent(upsertError.message), request.url))
      }
    }
  }

  // URL to redirect to after sign in process completes
  // Get locale from URL parameters (passed during OAuth flow) or default to 'en'
  const locale = requestUrl.searchParams.get('locale') || 'en'
  
  return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url))
}