import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
})

export async function POST(request: NextRequest) {
  try {
    const { immediate = false } = await request.json()

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

    // Get current user data
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('subscription_plan, subscription_status, stripe_customer_id')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      )
    }

    // If already on free plan, nothing to cancel
    if (userData.subscription_plan === 'free') {
      return NextResponse.json(
        { error: 'Already on free plan' },
        { status: 400 }
      )
    }

    // If no Stripe customer ID, just update to free plan
    if (!userData.stripe_customer_id) {
      const { error: resetError } = await supabase
        .rpc('reset_user_token_period', { user_uuid: user.id })

      if (resetError) {
        console.error('Error resetting token period:', resetError)
      }

      const { error: updateError } = await supabase
        .from('users')
        .update({
          subscription_plan: 'free',
          subscription_status: 'active',
        })
        .eq('id', user.id)

      if (updateError) {
        return NextResponse.json(
          { error: 'Failed to update subscription' },
          { status: 500 }
        )
      }

      return NextResponse.json({
        message: 'Subscription canceled and switched to free plan',
        plan: 'free'
      })
    }

    try {
      // Find active subscriptions
      const subscriptions = await stripe.subscriptions.list({
        customer: userData.stripe_customer_id,
        status: 'active',
      })

      if (subscriptions.data.length === 0) {
        // No active subscriptions in Stripe, just update database
        const { error: resetError } = await supabase
          .rpc('reset_user_token_period', { user_uuid: user.id })

        if (resetError) {
          console.error('Error resetting token period:', resetError)
        }

        const { error: updateError } = await supabase
          .from('users')
          .update({
            subscription_plan: 'free',
            subscription_status: 'active',
          })
          .eq('id', user.id)

        if (updateError) {
          return NextResponse.json(
            { error: 'Failed to update subscription' },
            { status: 500 }
          )
        }

        return NextResponse.json({
          message: 'Subscription canceled and switched to free plan',
          plan: 'free'
        })
      }

      // Cancel all active subscriptions
      const cancelPromises = subscriptions.data.map(async (subscription) => {
        if (immediate) {
          // Cancel immediately
          return await stripe.subscriptions.cancel(subscription.id)
        } else {
          // Cancel at period end
          return await stripe.subscriptions.update(subscription.id, {
            cancel_at_period_end: true,
          })
        }
      })

      await Promise.all(cancelPromises)

      // If immediate cancellation, update to free plan now
      if (immediate) {
        const { error: resetError } = await supabase
          .rpc('reset_user_token_period', { user_uuid: user.id })

        if (resetError) {
          console.error('Error resetting token period:', resetError)
        }

        const { error: updateError } = await supabase
          .from('users')
          .update({
            subscription_plan: 'free',
            subscription_status: 'active',
          })
          .eq('id', user.id)

        if (updateError) {
          console.error('Error updating user plan:', updateError)
        }

        return NextResponse.json({
          message: 'Subscription canceled immediately and switched to free plan',
          plan: 'free',
          immediate: true
        })
      } else {
        // For end-of-period cancellation, update status but keep current plan until period ends
        const { error: updateError } = await supabase
          .from('users')
          .update({
            subscription_status: 'canceling', // Custom status to indicate pending cancellation
          })
          .eq('id', user.id)

        if (updateError) {
          console.error('Error updating user status:', updateError)
        }

        return NextResponse.json({
          message: 'Subscription will be canceled at the end of the current billing period',
          plan: userData.subscription_plan,
          immediate: false,
          cancels_at: (subscriptions.data[0] as any).current_period_end
        })
      }

    } catch (stripeError: any) {
      console.error('Stripe cancellation error:', stripeError)
      return NextResponse.json(
        { error: 'Failed to cancel subscription with payment provider' },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('Subscription cancellation error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}