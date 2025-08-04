import { NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Stripe from 'stripe'
import { getSupabaseAdmin } from '../../../../../lib/supabase'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
})

export async function GET() {
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
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Get user subscription data, create if doesn't exist
    const { data: initialUserData, error: userError } = await supabase
      .from('users')
      .select(`
        subscription_plan,
        subscription_status,
        tokens_used_this_period,
        tokens_limit,
        period_start_date,
        period_end_date,
        stripe_customer_id
      `)
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
        .select(`
          subscription_plan,
          subscription_status,
          tokens_used_this_period,
          tokens_limit,
          period_start_date,
          period_end_date,
          stripe_customer_id
        `)
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
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // Get token stats
    const { data: tokenStats, error: tokenError } = await supabase
      .rpc('get_user_token_stats', { user_uuid: user.id })

    if (tokenError) {
      console.error('Error fetching token stats:', tokenError)
    }

    let stripeSubscription = null
    let nextBillingDate = null
    let billingAmount = null

    // Get Stripe subscription details if customer exists
    if (userData.stripe_customer_id && userData.subscription_plan !== 'free') {
      try {
        const subscriptions = await stripe.subscriptions.list({
          customer: userData.stripe_customer_id,
          status: 'active',
          limit: 1,
        })

        if (subscriptions.data.length > 0) {
          stripeSubscription = subscriptions.data[0]
          nextBillingDate = new Date((stripeSubscription as any).current_period_end * 1000).toISOString()
          
          // Get the price amount
          if (stripeSubscription.items.data.length > 0) {
            const price = stripeSubscription.items.data[0].price
            billingAmount = {
              amount: price.unit_amount,
              currency: price.currency,
              interval: price.recurring?.interval,
            }
          }
        }
      } catch (stripeError) {
        console.error('Error fetching Stripe subscription:', stripeError)
      }
    }

    // Get recent token usage logs
    const { data: usageLogs, error: logsError } = await supabase
      .from('token_usage_logs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(10)

    if (logsError) {
      console.error('Error fetching usage logs:', logsError)
    }

    return NextResponse.json({
      subscription: {
        plan: userData.subscription_plan,
        status: userData.subscription_status,
        tokens_used: userData.tokens_used_this_period,
        tokens_limit: userData.tokens_limit,
        period_start: userData.period_start_date,
        period_end: userData.period_end_date,
        next_billing_date: nextBillingDate,
        billing_amount: billingAmount,
      },
      token_stats: tokenStats && tokenStats.length > 0 ? tokenStats[0] : null,
      usage_logs: usageLogs || [],
      stripe_subscription: stripeSubscription ? {
        id: stripeSubscription.id,
        status: stripeSubscription.status,
        current_period_start: (stripeSubscription as any).current_period_start,
        current_period_end: (stripeSubscription as any).current_period_end,
        cancel_at_period_end: stripeSubscription.cancel_at_period_end,
      } : null,
    })

  } catch (error: any) {
    console.error('Subscription details error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}