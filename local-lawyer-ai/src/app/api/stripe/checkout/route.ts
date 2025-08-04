import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createCheckoutSession, createCustomer, PRICE_IDS } from '../../../../../lib/stripe'
import { getSupabaseAdmin } from '../../../../../lib/supabase'

export async function POST(request: NextRequest) {
  try {
    const { plan } = await request.json()
    
    if (!plan || !PRICE_IDS[plan as keyof typeof PRICE_IDS]) {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
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

    // If user not found, create them with default free plan
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
          subscription_plan: 'free',
          subscription_status: 'active',
          tokens_used_this_period: 0,
          tokens_limit: 10000,
          period_start_date: new Date().toISOString(),
          period_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
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

    let customerId = userData.stripe_customer_id || userData.customer_id

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await createCustomer({
        email: userData.email,
        name: userData.full_name || undefined,
        metadata: {
          userId: userData.id,
        },
      })

      customerId = customer.id

      // Update user with customer ID (support both old and new column names)
      await supabase
        .from('users')
        .update({ 
          stripe_customer_id: customerId,
          customer_id: customerId 
        })
        .eq('id', userData.id)
    }

    const priceId = PRICE_IDS[plan as keyof typeof PRICE_IDS]
    
    // Extract locale from URL for proper redirect
    const urlParts = request.nextUrl.pathname.split('/')
    const locale = urlParts[1] || 'en'
    
    const checkoutSession = await createCheckoutSession({
      priceId,
      customerId,
      successUrl: `${request.nextUrl.origin}/${locale}/subscription?success=true&session_id={CHECKOUT_SESSION_ID}`,
      cancelUrl: `${request.nextUrl.origin}/${locale}/subscription?canceled=true`,
      metadata: {
        userId: userData.id,
        plan,
      },
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