import { NextRequest, NextResponse } from 'next/server'
import Stripe from 'stripe'
import { createClient } from '@supabase/supabase-js'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
})

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Helper function to find user by Stripe customer ID or email  
const findUserByStripeCustomerId = async (customerId: string) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('customer_id', customerId)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error finding user by customer ID:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Exception finding user by customer ID:', error)
    return null
  }
}

const findUserByEmail = async (email: string) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single()

    if (error && error.code !== 'PGRST116') {
      console.error('Error finding user by email:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Exception finding user by email:', error)
    return null
  }
}

// Helper function to process token purchase directly
const processTokenPurchase = async (
  userId: string,
  sessionId: string,
  tokensToAdd: number,
  amountPaid: number,
  packageName: string,
  purchaseDetails: any
) => {
  try {
    // Get current user data
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('total_tokens_purchased, tokens_purchase_history, email')
      .eq('id', userId)
      .single()

    if (fetchError || !userData) {
      console.error('Error fetching user data:', fetchError)
      return false
    }

    // Calculate new totals
    const currentTokens = userData.total_tokens_purchased || 0
    const newTokenTotal = currentTokens + tokensToAdd
    
    // Create purchase record
    const purchaseRecord = {
      date: new Date().toISOString(),
      tokens: tokensToAdd,
      package_name: packageName,
      stripe_session_id: sessionId,
      amount: amountPaid,
      currency: purchaseDetails.currency || 'usd',
      payment_method: purchaseDetails.payment_method || 'card'
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
      .eq('id', userId)

    if (updateError) {
      console.error('Error updating user tokens:', updateError)
      return false
    }

    // Log the token purchase
    const { error: logError } = await supabase
      .from('token_usage_logs')
      .insert({
        user_id: userId,
        tokens_used: -tokensToAdd, // Negative to indicate tokens added
        action_type: 'token_purchase',
        request_details: {
          tokens_added: tokensToAdd,
          package_name: packageName,
          stripe_session_id: sessionId,
          purchase_date: new Date().toISOString(),
          previous_total: currentTokens,
          new_total: newTokenTotal,
          amount_paid: amountPaid,
          purchase_details: purchaseDetails
        }
      })

    if (logError) {
      console.error('Warning: Failed to log token purchase:', logError)
      // Continue even if logging fails
    }

    console.log(`✅ Processed token purchase for user ${userId}: +${tokensToAdd} tokens (${packageName})`)
    console.log(`📊 Token balance: ${currentTokens} → ${newTokenTotal}`)
    console.log(`📈 Total purchase history: ${totalPurchaseHistory} tokens`)
    console.log(`📋 Purchase record added:`, purchaseRecord)
    return true
  } catch (error) {
    console.error('Exception processing token purchase:', error)
    return false
  }
}

export async function POST(request: NextRequest) {
  const sig = request.headers.get('stripe-signature')
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET

  if (!sig || !webhookSecret) {
    return NextResponse.json({ error: 'Missing webhook signature or secret' }, { status: 400 })
  }

  let event: Stripe.Event

  try {
    const rawBody = await request.text()
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret)
  } catch (err: any) {
    console.error('❌ Webhook signature verification failed:', err.message)
    return NextResponse.json({ error: 'Webhook signature verification failed' }, { status: 400 })
  }

  console.log(`🔔 Processing token webhook event: ${event.type} (${event.id})`)

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleTokenPurchaseCompleted(event.data.object as Stripe.Checkout.Session)
        break
      
      case 'payment_intent.succeeded':
        await handlePaymentSucceeded(event.data.object as Stripe.PaymentIntent)
        break
      
      default:
        console.log(`ℹ️ Unhandled token webhook event type: ${event.type}`)
    }

    console.log(`✅ Successfully processed token webhook: ${event.type}`)
    return NextResponse.json({ 
      success: true, 
      eventType: event.type,
      eventId: event.id,
      message: 'Token webhook processed successfully'
    })

  } catch (error: any) {
    console.error(`❌ Error processing token webhook ${event.type}:`, error)
    // Return 200 to prevent Stripe retries, but log the error
    return NextResponse.json({ 
      error: 'Token webhook processing failed',
      eventType: event.type,
      eventId: event.id,
      details: error.message 
    })
  }
}

async function handleTokenPurchaseCompleted(session: Stripe.Checkout.Session) {
  console.log('🪙 Processing token purchase completed:', session.id)
  
  try {
    // Verify this is a token purchase
    if (session.metadata?.purchase_type !== 'tokens') {
      console.log('ℹ️ Skipping non-token purchase session:', session.id)
      return
    }

    // Get customer details from Stripe
    const customer = await stripe.customers.retrieve(session.customer as string)
    
    if (!customer || customer.deleted) {
      console.error('❌ Customer not found or deleted:', session.customer)
      return
    }

    const customerEmail = customer.email
    const tokensPurchased = parseInt(session.metadata!.tokens_purchased)
    const packageName = session.metadata!.package_name
    
    if (!customerEmail || !tokensPurchased) {
      console.error('❌ Missing required data for token purchase:', {
        email: customerEmail,
        tokens: tokensPurchased
      })
      return
    }

    // Find user in Supabase by customer ID first, then by email
    let user = await findUserByStripeCustomerId(session.customer as string)
    
    if (!user) {
      user = await findUserByEmail(customerEmail)
    }

    if (!user) {
      console.error('❌ No Supabase user found for token purchase:', {
        customerId: session.customer,
        email: customerEmail
      })
      return
    }

    // Process token purchase
    const amountPaid = session.amount_total! / 100 // Convert from cents
    const purchaseDetails = {
      currency: session.currency,
      payment_status: session.payment_status,
      payment_method: session.payment_method_types?.[0] || 'card'
    }

    const success = await processTokenPurchase(
      user.id, 
      session.id, 
      tokensPurchased, 
      amountPaid, 
      packageName, 
      purchaseDetails
    )
    
    if (success) {
      console.log(`✅ Token purchase completed for user ${user.email}: +${tokensPurchased} tokens (${packageName})`)
    } else {
      console.error(`❌ Failed to process token purchase for user ${user.email}`)
    }
    
  } catch (error) {
    console.error('❌ Error handling token purchase completed:', error)
    throw error
  }
}

async function handlePaymentSucceeded(paymentIntent: Stripe.PaymentIntent) {
  console.log('💳 Processing payment succeeded:', paymentIntent.id)
  
  try {
    // Additional processing if needed for payment confirmation
    // This is mainly for logging and can be expanded later
    console.log(`✅ Payment succeeded: ${paymentIntent.id} for amount ${paymentIntent.amount / 100} ${paymentIntent.currency}`)
    
  } catch (error) {
    console.error('❌ Error handling payment succeeded:', error)
    throw error
  }
}