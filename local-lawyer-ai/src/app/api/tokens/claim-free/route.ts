import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../../../lib/supabase'

const FREE_STARTER_TOKENS = 10000

export async function POST() {
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
          set() {
            // Required for session management
          },
          remove() {
            // Required for session management
          },
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

    const adminSupabase = getSupabaseAdmin()

    // Check if user exists and if they've already claimed free tokens
    const { data: userData, error: fetchError } = await adminSupabase
      .from('users')
      .select('id, total_tokens_purchased, tokens_purchase_history, free_starter_claimed')
      .eq('id', user.id)
      .single()

    if (fetchError) {
      console.error('Error fetching user data:', fetchError)
      return NextResponse.json(
        { error: 'Failed to fetch user data' },
        { status: 500 }
      )
    }

    // Check if user has already claimed free starter kit
    if (userData.free_starter_claimed) {
      return NextResponse.json(
        { error: 'Free starter kit already claimed' },
        { status: 400 }
      )
    }

    // Add free tokens to user's account
    const currentTokens = userData.total_tokens_purchased || 0
    const newTokensPurchased = currentTokens + FREE_STARTER_TOKENS
    
    // Create purchase record for free starter kit
    const purchaseRecord = {
      date: new Date().toISOString(),
      tokens: FREE_STARTER_TOKENS,
      package_name: 'Free Starter Kit',
      stripe_session_id: 'free_starter_kit',
      amount: 0,
      currency: 'usd',
      payment_method: 'free'
    }
    
    // Update purchase history
    const currentHistory = userData.tokens_purchase_history || []
    const newPurchaseHistory = [...currentHistory, purchaseRecord]

    const { error: updateError } = await adminSupabase
      .from('users')
      .update({
        total_tokens_purchased: newTokensPurchased,
        tokens_purchase_history: newPurchaseHistory,
        free_starter_claimed: true
      })
      .eq('id', user.id)

    if (updateError) {
      console.error('Error updating user tokens:', updateError)
      return NextResponse.json(
        { error: 'Failed to claim free tokens' },
        { status: 500 }
      )
    }

    // Log the free token claim
    const { error: logError } = await adminSupabase
      .from('token_usage_logs')
      .insert({
        user_id: user.id,
        tokens_used: -FREE_STARTER_TOKENS, // Negative to indicate tokens added
        action_type: 'free_starter_kit',
        request_details: {
          tokens_added: FREE_STARTER_TOKENS,
          claim_date: new Date().toISOString()
        }
      })

    if (logError) {
      console.error('Error logging free token claim:', logError)
      // Continue even if logging fails
    }

    return NextResponse.json({
      success: true,
      message: `Free starter kit claimed! ${FREE_STARTER_TOKENS.toLocaleString()} tokens added to your account.`,
      tokensAdded: FREE_STARTER_TOKENS,
      newTokensPurchased: newTokensPurchased
    })

  } catch (error) {
    console.error('Free token claim API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}