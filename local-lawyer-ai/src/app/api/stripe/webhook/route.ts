import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { getSupabaseAdmin } from '../../../../../lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
})

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  const body = await request.text()
  const signature = request.headers.get('stripe-signature')

  if (!signature) {
    console.error('❌ No stripe signature found')
    return NextResponse.json({ error: 'No signature' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, endpointSecret)
  } catch (err: any) {
    console.error('❌ Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  console.log(`🔔 Stripe webhook received: ${event.type}`)

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object as Stripe.Checkout.Session)
        break
      
      default:
        console.log(`🤷 Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('❌ Webhook processing error:', error)
    return NextResponse.json(
      { error: 'Webhook processing failed' },
      { status: 500 }
    )
  }
}

async function handleCheckoutSessionCompleted(session: Stripe.Checkout.Session) {
  console.log('🛒 Processing completed checkout session:', session.id)
  
  const { 
    user_id, 
    tokens_purchased, 
    package_name, 
    purchase_type 
  } = session.metadata || {}

  // Only process token purchases
  if (purchase_type !== 'tokens') {
    console.log('⏭️ Skipping non-token purchase')
    return
  }

  if (!user_id || !tokens_purchased) {
    console.error('❌ Missing required metadata:', { user_id, tokens_purchased })
    return
  }

  const tokensToAdd = parseInt(tokens_purchased)
  if (isNaN(tokensToAdd) || tokensToAdd <= 0) {
    console.error('❌ Invalid token amount:', tokens_purchased)
    return
  }

  console.log(`💰 Adding ${tokensToAdd} tokens to user ${user_id}`)

  try {
    const supabase = getSupabaseAdmin()

    // Get current user data
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('total_tokens_purchased, tokens_purchase_history, email')
      .eq('id', user_id)
      .single()

    if (fetchError || !userData) {
      console.error('❌ Failed to fetch user:', fetchError)
      return
    }

    // Calculate new totals
    const currentTokens = userData.total_tokens_purchased || 0
    const newTokenTotal = currentTokens + tokensToAdd
    
    // Create purchase record
    const purchaseRecord = {
      date: new Date().toISOString(),
      tokens: tokensToAdd,
      package_name: package_name,
      stripe_session_id: session.id,
      amount: session.amount_total ? session.amount_total / 100 : null,
      currency: session.currency || 'usd'
    }
    
    // Update purchase history
    const currentHistory = userData.tokens_purchase_history || []
    const newPurchaseHistory = [...currentHistory, purchaseRecord]
    
    // Calculate total purchase history (sum of all token purchases)
    const totalPurchaseHistory = newPurchaseHistory.reduce((sum, purchase) => sum + purchase.tokens, 0)

    // Update user's token balance and purchase history
    const { error: updateError } = await supabase
      .from('users')
      .update({
        total_tokens_purchased: newTokenTotal,
        tokens_purchase_history: newPurchaseHistory
      })
      .eq('id', user_id)

    if (updateError) {
      console.error('❌ Failed to update user tokens:', updateError)
      return
    }

    // Log the token purchase
    const { error: logError } = await supabase
      .from('token_usage_logs')
      .insert({
        user_id: user_id,
        tokens_used: -tokensToAdd, // Negative to indicate tokens added
        action_type: 'token_purchase',
        request_details: {
          tokens_added: tokensToAdd,
          package_name: package_name,
          stripe_session_id: session.id,
          purchase_date: new Date().toISOString(),
          previous_total: currentTokens,
          new_total: newTokenTotal
        }
      })

    if (logError) {
      console.error('⚠️ Failed to log token purchase:', logError)
      // Continue even if logging fails
    }

    console.log(`✅ Successfully added ${tokensToAdd} tokens to user ${userData.email}`)
    console.log(`📊 Token balance: ${currentTokens} → ${newTokenTotal}`)
    console.log(`📈 Total purchase history: ${totalPurchaseHistory} tokens`)
    console.log(`📋 Purchase record added:`, purchaseRecord)

  } catch (error) {
    console.error('❌ Error processing token purchase:', error)
  }
}