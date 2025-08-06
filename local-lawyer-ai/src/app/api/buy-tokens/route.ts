import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
})

export async function POST(request: NextRequest) {
  try {
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

    // Get the current session
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    const { email, priceId, tokens, packageName } = await request.json()

    if (!email || !priceId || !tokens || !packageName) {
      console.error('❌ Missing required fields:', { email: !!email, priceId: !!priceId, tokens: !!tokens, packageName: !!packageName })
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    console.log(`🔍 Token purchase request: ${packageName} (${tokens} tokens) for ${email}`)
    console.log(`🔍 Using Stripe price ID: ${priceId}`)

    // Validate that the email matches the authenticated user
    if (email !== user.email) {
      return NextResponse.json({ error: 'Email mismatch' }, { status: 403 })
    }

    // Create or retrieve Stripe customer
    let customer

    // Check if user already has a Stripe customer ID
    const { data: userData } = await supabase
      .from('users')
      .select('customer_id')
      .eq('id', user.id)
      .single()

    if (userData?.customer_id) {
      try {
        // Try to use existing customer
        customer = await stripe.customers.retrieve(userData.customer_id)
        
        // Check if customer is deleted
        if (customer.deleted) {
          throw new Error('Customer is deleted')
        }
      } catch {
        console.log(`⚠️ Invalid customer ID ${userData.customer_id}, creating new customer`)
        
        // Create new customer if the old one doesn't exist or is deleted
        customer = await stripe.customers.create({
          email: email,
          metadata: {
            supabase_user_id: user.id,
          },
        })

        // Update user record with new Stripe customer ID
        await supabase
          .from('users')
          .update({ customer_id: customer.id })
          .eq('id', user.id)
      }
    } else {
      // Create new customer
      customer = await stripe.customers.create({
        email: email,
        metadata: {
          supabase_user_id: user.id,
        },
      })

      // Update user record with Stripe customer ID
      await supabase
        .from('users')
        .update({ customer_id: customer.id })
        .eq('id', user.id)
    }

    // Use Codespaces URL if in Codespaces environment, otherwise use request origin
    const baseUrl = process.env.CODESPACES === 'true' 
      ? `https://${process.env.CODESPACE_NAME}-3000.${process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN}`
      : request.nextUrl.origin

    // Create Stripe Checkout session for one-time payment
    const checkoutSession = await stripe.checkout.sessions.create({
      customer: customer.id,
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'payment', // One-time payment instead of subscription
      success_url: `${baseUrl}/en/buy-tokens?success=true&tokens=${tokens}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/en/buy-tokens?canceled=true`,
      metadata: {
        user_id: user.id,
        user_email: email,
        tokens_purchased: tokens.toString(),
        package_name: packageName,
        purchase_type: 'tokens'
      },
    })

    console.log(`🛒 Created token purchase session for ${email}: ${tokens} tokens (${packageName})`)
    console.log(`✅ Using Stripe customer: ${customer.id}`)

    return NextResponse.json({
      url: checkoutSession.url,
      sessionId: checkoutSession.id,
      message: `Redirecting to checkout for ${tokens} tokens`
    })

  } catch (error: any) {
    console.error('❌ Token purchase error:', error)
    return NextResponse.json({ 
      error: 'Failed to create token purchase session',
      details: error.message 
    }, { status: 500 })
  }
}