import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createCheckoutSession } from '../../../../../lib/stripe'
import { getSupabaseAdmin } from '../../../../../lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { priceId, tokens, packageName } = await request.json()
    
    if (!priceId || !tokens || !packageName) {
      return NextResponse.json({ error: 'Missing required parameters: priceId, tokens, packageName' }, { status: 400 })
    }

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
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get or create user record
    const { data: initialUserData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    let userData = initialUserData

    // If user not found, create them
    if (userError && userError.code === 'PGRST116') {
      const supabaseAdmin = getSupabaseAdmin()
      
      const { error: createError } = await supabaseAdmin
        .from('users')
        .insert({
          id: user.id,
          email: user.email!,
          full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
          avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
          provider: user.app_metadata?.provider || 'google',
          provider_id: user.user_metadata?.provider_id || user.id,
        })

      if (createError) {
        console.error('Error creating user:', createError)
        return NextResponse.json(
          { error: 'Failed to create user profile' },
          { status: 500 }
        )
      }

      // Retry getting user data after creation
      const { data: newUserData, error: retryError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (retryError || !newUserData) {
        return NextResponse.json(
          { error: 'Failed to retrieve user after creation' },
          { status: 500 }
        )
      }

      userData = newUserData
    } else if (userError || !userData) {
      console.error('User lookup error:', userError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Use Codespaces URL if in Codespaces environment, otherwise use request origin
    const baseUrl = process.env.CODESPACES === 'true' 
      ? `https://${process.env.CODESPACE_NAME}-3000.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`
      : request.nextUrl.origin
    
    const checkoutSession = await createCheckoutSession({
      priceId,
      customerId: userData.customer_id, // Pass existing customer_id if available
      successUrl: `${baseUrl}/buy-tokens?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${baseUrl}/buy-tokens?canceled=true`,
      metadata: {
        userId: userData.id,
        tokens: tokens.toString(),
        packageName,
      },
      mode: 'payment',
    })

    return NextResponse.json({ 
      url: checkoutSession.url,
      sessionId: checkoutSession.id 
    })
  } catch (error: any) {
    console.error('Stripe checkout error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}