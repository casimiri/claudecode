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
      console.error('Full error details:', JSON.stringify(error, null, 2))
      
      // For development, redirect to login page with error message
      const locale = requestUrl.searchParams.get('locale') || 'en'
      return NextResponse.redirect(new URL(`/${locale}/login?error=oauth_failed&message=${encodeURIComponent(error.message)}`, request.url))
    }

    if (data.user) {
      // The user should already be created by the database trigger
      // Let's just verify the user exists and optionally update their profile
      const supabaseAdmin = getSupabaseAdmin()
      
      try {
        // Check if user exists (should be created by trigger)
        const { data: existingUser, error: checkError } = await supabaseAdmin
          .from('users')
          .select('id, tokens_used_this_period, total_tokens_purchased, email, full_name, avatar_url')
          .eq('id', data.user.id)
          .single()

        if (checkError) {
          if (checkError.code === 'PGRST116') {
            // User doesn't exist - this should not happen with working trigger
            console.warn('User not found in database, trigger may have failed. Attempting manual creation.')
            
            // Fallback: create user manually
            const { error: insertError } = await supabaseAdmin
              .from('users')
              .insert({
                id: data.user.id,
                email: data.user.email!,
                full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || null,
                avatar_url: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture || null,
                provider: data.user.app_metadata?.provider || 'email',
                provider_id: data.user.user_metadata?.provider_id || data.user.id,
                tokens_used_this_period: 0,
                tokens_limit: 10000,
                total_tokens_purchased: 10000
              })
              
            if (insertError) {
              console.error('Fallback user creation failed:', insertError)
              return NextResponse.redirect(new URL(`/?error=user_creation_failed&details=${encodeURIComponent(insertError.message)}`, request.url))
            }
          } else {
            console.error('Error checking user existence:', checkError)
            return NextResponse.redirect(new URL(`/?error=user_check_failed&details=${encodeURIComponent(checkError.message)}`, request.url))
          }
        } else {
          // User exists, optionally update profile with latest data
          const shouldUpdate = 
            existingUser.email !== data.user.email ||
            !existingUser.full_name ||
            !existingUser.avatar_url
            
          if (shouldUpdate) {
            const { error: updateError } = await supabaseAdmin
              .from('users')
              .update({
                email: data.user.email!,
                full_name: data.user.user_metadata?.full_name || data.user.user_metadata?.name || existingUser.full_name,
                avatar_url: data.user.user_metadata?.avatar_url || data.user.user_metadata?.picture || existingUser.avatar_url,
                updated_at: new Date().toISOString()
              })
              .eq('id', data.user.id)
              
            if (updateError) {
              console.error('Error updating user profile:', updateError)
              // Don't fail the login for profile update errors
            }
          }
        }
      } catch (error) {
        console.error('Unexpected error in user profile handling:', error)
        return NextResponse.redirect(new URL(`/?error=profile_handling_failed&details=${encodeURIComponent(String(error))}`, request.url))
      }
    }
  }

  // URL to redirect to after sign in process completes
  // Get locale from URL parameters (passed during OAuth flow) or default to 'en'
  const locale = requestUrl.searchParams.get('locale') || 'en'
  
  return NextResponse.redirect(new URL(`/${locale}/dashboard`, request.url))
}