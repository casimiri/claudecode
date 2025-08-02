import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createCheckoutSession, createCustomer, PRICE_IDS } from '../../../../../lib/stripe'

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
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (userError) {
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