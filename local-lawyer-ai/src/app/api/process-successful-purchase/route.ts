import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { getSupabaseAdmin } from '../../../../lib/supabase'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
})

// Process successful purchase when webhook isn't available (development fallback)
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
          set() {},
          remove() {},
        },
      }
    )

    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { session_id, tokens, package_name } = await request.json()

    if (!session_id || !tokens) {
      return NextResponse.json({ error: 'Missing session_id or tokens' }, { status: 400 })
    }

    console.log(`🔄 Processing successful purchase: ${tokens} tokens for user ${user.email}`)

    // Retrieve the session from Stripe to verify it was actually paid
    const session = await stripe.checkout.sessions.retrieve(session_id)
    
    if (session.payment_status !== 'paid') {
      console.error('❌ Session not paid:', session.payment_status)
      return NextResponse.json({ error: 'Payment not completed' }, { status: 400 })
    }

    // Verify the session belongs to this user
    if (session.metadata?.user_id !== user.id) {
      console.error('❌ Session user mismatch')
      return NextResponse.json({ error: 'Session user mismatch' }, { status: 403 })
    }

    const adminSupabase = getSupabaseAdmin()

    // Get current user data
    const { data: userData, error: fetchError } = await adminSupabase
      .from('users')
      .select('total_tokens_purchased, tokens_purchase_history, email')
      .eq('id', user.id)
      .single()

    if (fetchError || !userData) {
      console.error('❌ Failed to fetch user:', fetchError)
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Check if this purchase has already been processed
    const existingPurchase = userData.tokens_purchase_history?.find(
      (purchase: any) => purchase.stripe_session_id === session_id
    )

    if (existingPurchase) {
      console.log('⚠️ Purchase already processed:', session_id)
      return NextResponse.json({
        success: true,
        message: 'Purchase already processed',
        already_processed: true
      })
    }

    console.log('📊 Current user data:', {
      email: userData.email,
      total_tokens_purchased: userData.total_tokens_purchased,
      purchase_history_length: userData.tokens_purchase_history?.length || 0
    })

    // Calculate new totals
    const tokensToAdd = parseInt(tokens)
    const currentTokens = userData.total_tokens_purchased || 0
    const newTokenTotal = currentTokens + tokensToAdd
    
    // Create purchase record
    const purchaseRecord = {
      date: new Date().toISOString(),
      tokens: tokensToAdd,
      package_name: package_name || session.metadata?.package_name || 'Token Package',
      stripe_session_id: session_id,
      amount: session.amount_total ? session.amount_total / 100 : null,
      currency: session.currency || 'usd',
      payment_method: 'card',
      processed_via: 'success_callback'
    }
    
    // Update purchase history
    const currentHistory = userData.tokens_purchase_history || []
    const newPurchaseHistory = [...currentHistory, purchaseRecord]

    console.log('🔄 Updating user with:', {
      total_tokens_purchased: newTokenTotal,
      purchase_record: purchaseRecord
    })

    // Update user's token balance and purchase history
    const { error: updateError } = await adminSupabase
      .from('users')
      .update({
        total_tokens_purchased: newTokenTotal,
        tokens_purchase_history: newPurchaseHistory
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('❌ Failed to update user tokens:', updateError)
      return NextResponse.json({ 
        error: 'Failed to update tokens', 
        details: updateError 
      }, { status: 500 })
    }

    // Log the token purchase
    const { error: logError } = await adminSupabase
      .from('token_usage_logs')
      .insert({
        user_id: user.id,
        tokens_used: -tokensToAdd, // Negative to indicate tokens added
        action_type: 'token_purchase_success_callback',
        request_details: {
          tokens_added: tokensToAdd,
          package_name: purchaseRecord.package_name,
          stripe_session_id: session_id,
          purchase_date: new Date().toISOString(),
          previous_total: currentTokens,
          new_total: newTokenTotal,
          amount_paid: purchaseRecord.amount,
          processed_via: 'success_callback'
        }
      })

    if (logError) {
      console.error('⚠️ Failed to log token purchase:', logError)
      // Continue even if logging fails
    }

    console.log(`✅ Successfully processed purchase: ${tokensToAdd} tokens for user ${userData.email}`)
    console.log(`📊 Token balance: ${currentTokens} → ${newTokenTotal}`)

    return NextResponse.json({
      success: true,
      message: `Successfully added ${tokensToAdd} tokens to your account`,
      user_email: userData.email,
      previous_total: currentTokens,
      new_total: newTokenTotal,
      tokens_added: tokensToAdd,
      purchase_record: purchaseRecord
    })

  } catch (error: any) {
    console.error('❌ Process successful purchase error:', error)
    return NextResponse.json(
      { error: 'Failed to process purchase', details: error.message },
      { status: 500 }
    )
  }
}