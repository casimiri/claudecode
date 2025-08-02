import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import Stripe from 'stripe'

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
})

export async function POST(request: NextRequest) {
  try {
    const { plan } = await request.json()

    if (!plan) {
      return NextResponse.json(
        { error: 'Plan is required' },
        { status: 400 }
      )
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

    const currentPlan = userData.subscription_plan
    const planHierarchy = ['free', 'weekly', 'monthly', 'yearly']
    const currentIndex = planHierarchy.indexOf(currentPlan)
    const newIndex = planHierarchy.indexOf(plan)

    // Handle downgrade to free plan
    if (plan === 'free') {
      // Cancel current subscription if exists
      if (userData.stripe_customer_id) {
        try {
          const subscriptions = await stripe.subscriptions.list({
            customer: userData.stripe_customer_id,
            status: 'active',
          })

          for (const subscription of subscriptions.data) {
            await stripe.subscriptions.update(subscription.id, {
              cancel_at_period_end: true,
            })
          }
        } catch (stripeError) {
          console.error('Error canceling subscription:', stripeError)
        }
      }

      // Update to free plan with reset tokens
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
        message: 'Successfully switched to free plan',
        plan: 'free'
      })
    }

    // Handle upgrade or paid plan change
    const priceIds = {
      weekly: process.env.STRIPE_WEEKLY_PRICE_ID!,
      monthly: process.env.STRIPE_MONTHLY_PRICE_ID!,
      yearly: process.env.STRIPE_YEARLY_PRICE_ID!,
    }

    const priceId = priceIds[plan as keyof typeof priceIds]
    if (!priceId) {
      return NextResponse.json(
        { error: 'Invalid plan selected' },
        { status: 400 }
      )
    }

    // If upgrading from free or no current subscription, create checkout session
    if (currentPlan === 'free' || !userData.stripe_customer_id) {
      const session = await stripe.checkout.sessions.create({
        customer_email: user.email,
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${request.nextUrl.origin}/${request.nextUrl.pathname.split('/')[1]}/subscription?success=true`,
        cancel_url: `${request.nextUrl.origin}/${request.nextUrl.pathname.split('/')[1]}/subscription?canceled=true`,
        metadata: {
          user_id: user.id,
          plan: plan,
        },
      })

      return NextResponse.json({ url: session.url })
    }

    // Handle subscription modification for existing customers
    try {
      const subscriptions = await stripe.subscriptions.list({
        customer: userData.stripe_customer_id,
        status: 'active',
        limit: 1,
      })

      if (subscriptions.data.length === 0) {
        // No active subscription, create new checkout session
        const session = await stripe.checkout.sessions.create({
          customer: userData.stripe_customer_id,
          line_items: [
            {
              price: priceId,
              quantity: 1,
            },
          ],
          mode: 'subscription',
          success_url: `${request.nextUrl.origin}/${request.nextUrl.pathname.split('/')[1]}/subscription?success=true`,
          cancel_url: `${request.nextUrl.origin}/${request.nextUrl.pathname.split('/')[1]}/subscription?canceled=true`,
          metadata: {
            user_id: user.id,
            plan: plan,
          },
        })

        return NextResponse.json({ url: session.url })
      }

      // Modify existing subscription
      const subscription = subscriptions.data[0]
      const updatedSubscription = await stripe.subscriptions.update(subscription.id, {
        items: [
          {
            id: subscription.items.data[0].id,
            price: priceId,
          },
        ],
        proration_behavior: newIndex > currentIndex ? 'create_prorations' : 'none',
      })

      // Update user plan immediately for upgrades
      if (newIndex > currentIndex) {
        const { error: resetError } = await supabase
          .rpc('reset_user_token_period', { user_uuid: user.id })

        if (resetError) {
          console.error('Error resetting token period:', resetError)
        }

        const { error: updateError } = await supabase
          .from('users')
          .update({
            subscription_plan: plan,
            subscription_status: 'active',
          })
          .eq('id', user.id)

        if (updateError) {
          console.error('Error updating user plan:', updateError)
        }
      }

      return NextResponse.json({
        message: 'Subscription updated successfully',
        plan: plan,
        subscriptionId: updatedSubscription.id
      })

    } catch (stripeError: any) {
      console.error('Stripe error:', stripeError)
      return NextResponse.json(
        { error: 'Failed to update subscription with payment provider' },
        { status: 500 }
      )
    }

  } catch (error: any) {
    console.error('Subscription change error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}