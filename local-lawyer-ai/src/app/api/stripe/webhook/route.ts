import { NextRequest, NextResponse } from 'next/server'
import { headers } from 'next/headers'
import { stripe } from '../../../../../lib/stripe'
import { supabaseAdmin } from '../../../../../lib/supabase'
import Stripe from 'stripe'

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!

export async function POST(request: NextRequest) {
  const body = await request.text()
  const headersList = await headers()
  const signature = headersList.get('stripe-signature')!

  let event: Stripe.Event

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret)
  } catch (error: any) {
    console.error('Webhook signature verification failed:', error.message)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const userId = session.metadata?.userId
        const plan = session.metadata?.plan

        if (userId && session.subscription) {
          // Update user with subscription details
          await supabaseAdmin
            .from('users')
            .update({
              subscription_id: session.subscription as string,
              subscription_status: 'active',
              subscription_plan: plan || null,
              stripe_customer_id: session.customer as string,
              customer_id: session.customer as string, // Keep both for compatibility
            })
            .eq('id', userId)

          // Reset token period for new subscription
          await supabaseAdmin
            .rpc('reset_user_token_period', { user_uuid: userId })
        }
        break
      }

      case 'invoice.payment_succeeded': {
        const invoice = event.data.object as any // Use any to bypass TypeScript issues
        
        if (invoice.subscription && typeof invoice.subscription === 'string') {
          const subscription = await stripe.subscriptions.retrieve(
            invoice.subscription
          ) as any

          await supabaseAdmin
            .from('users')
            .update({
              subscription_status: 'active',
              current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
            })
            .eq('subscription_id', subscription.id)
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any // Use any to bypass TypeScript issues
        
        if (invoice.subscription) {
          await supabaseAdmin
            .from('users')
            .update({
              subscription_status: 'past_due',
            })
            .eq('subscription_id', invoice.subscription as string)
        }
        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as any // Use any to bypass TypeScript issues
        
        await supabaseAdmin
          .from('users')
          .update({
            subscription_status: subscription.status === 'active' ? 'active' : 'inactive',
            current_period_end: new Date(subscription.current_period_end * 1000).toISOString(),
          })
          .eq('subscription_id', subscription.id)
        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        
        // Switch user to free plan when subscription is deleted
        const { data: users } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('subscription_id', subscription.id)
          .limit(1)

        if (users && users.length > 0) {
          const userId = users[0].id

          // Reset to free plan with token limits
          await supabaseAdmin
            .rpc('reset_user_token_period', { user_uuid: userId })

          await supabaseAdmin
            .from('users')
            .update({
              subscription_status: 'active',
              subscription_id: null,
              subscription_plan: 'free',
            })
            .eq('id', userId)
        }
        break
      }

      default:
        console.log(`Unhandled event type: ${event.type}`)
    }

    return NextResponse.json({ received: true })
  } catch (error: any) {
    console.error('Webhook handler error:', error)
    return NextResponse.json(
      { error: 'Webhook handler failed' },
      { status: 500 }
    )
  }
}