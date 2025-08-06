import Stripe from 'stripe';
import { createClient } from '@supabase/supabase-js';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Disable body parsing for webhooks
export const config = {
  api: {
    bodyParser: false,
  },
};

// Helper function to get raw body
const getRawBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
};

// Helper function to determine plan from price ID
const determinePlanFromPriceId = (priceId) => {
  if (!priceId) return null;
  
  if (priceId === process.env.STRIPE_PRICE_WEEKLY) return 'weekly';
  if (priceId === process.env.STRIPE_PRICE_MONTHLY) return 'monthly';
  if (priceId === process.env.STRIPE_PRICE_YEARLY) return 'yearly';
  
  return null;
};

// Helper function to find user by Stripe customer ID or email  
const findUserByStripeCustomerId = async (customerId) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('stripe_customer_id', customerId)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error finding user by customer ID:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception finding user by customer ID:', error);
    return null;
  }
};

const findUserByEmail = async (email) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error finding user by email:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception finding user by email:', error);
    return null;
  }
};

// Helper function to update user subscription data
const updateUserSubscription = async (userId, subscriptionData) => {
  try {
    const { error } = await supabase
      .from('users')
      .update(subscriptionData)
      .eq('id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating user subscription:', error);
      return false;
    }

    console.log(`✅ Updated user ${userId} subscription:`, subscriptionData);
    return true;
  } catch (error) {
    console.error('Exception updating user subscription:', error);
    return false;
  }
};

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const sig = req.headers['stripe-signature'];
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let event;

  try {
    const rawBody = await getRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('❌ Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  console.log(`🔔 Processing webhook event: ${event.type} (${event.id})`);

  try {
    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutSessionCompleted(event.data.object);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      
      default:
        console.log(`ℹ️ Unhandled event type: ${event.type}`);
    }

    console.log(`✅ Successfully processed webhook: ${event.type}`);
    return res.status(200).json({ 
      success: true, 
      eventType: event.type,
      eventId: event.id,
      message: 'Webhook processed successfully'
    });

  } catch (error) {
    console.error(`❌ Error processing webhook ${event.type}:`, error);
    // Return 200 to prevent Stripe retries, but log the error
    return res.status(200).json({ 
      error: 'Webhook processing failed',
      eventType: event.type,
      eventId: event.id,
      details: error.message 
    });
  }
}

async function handleCheckoutSessionCompleted(session) {
  console.log('🛒 Processing checkout.session.completed:', session.id);
  
  try {
    // Get customer details from Stripe
    const customer = await stripe.customers.retrieve(session.customer);
    
    if (!customer || customer.deleted) {
      console.error('❌ Customer not found or deleted:', session.customer);
      return;
    }

    const customerEmail = customer.email;
    
    if (!customerEmail) {
      console.error('❌ No email found for customer:', session.customer);
      return;
    }

    // Find user in Supabase by customer ID first, then by email
    let user = await findUserByStripeCustomerId(session.customer);
    
    if (!user) {
      user = await findUserByEmail(customerEmail);
    }

    if (!user) {
      console.error('❌ No Supabase user found for customer:', {
        customerId: session.customer,
        email: customerEmail
      });
      return;
    }

    // Get subscription details if exists
    if (session.subscription) {
      const subscription = await stripe.subscriptions.retrieve(session.subscription);
      const priceId = subscription.items?.data?.[0]?.price?.id;
      const plan = determinePlanFromPriceId(priceId);

      const subscriptionData = {
        stripe_customer_id: session.customer,
        stripe_subscription_id: session.subscription,
        subscription_price_id: priceId,
        subscription_status: subscription.status,
        subscription_plan: plan
      };

      await updateUserSubscription(user.id, subscriptionData);
      
      console.log(`✅ Checkout completed for user ${user.email}: ${plan} plan`);
    } else {
      // One-time payment - just update customer ID
      await updateUserSubscription(user.id, {
        stripe_customer_id: session.customer
      });
      
      console.log(`✅ One-time payment completed for user ${user.email}`);
    }
    
  } catch (error) {
    console.error('❌ Error handling checkout.session.completed:', error);
    throw error;
  }
}

async function handleSubscriptionUpdated(subscription) {
  console.log('🔄 Processing customer.subscription.updated:', subscription.id);
  
  try {
    // Find user by subscription ID first
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('stripe_subscription_id', subscription.id);

    if (error) {
      console.error('❌ Error finding user by subscription ID:', error);
      return;
    }

    let user = users?.[0];

    // If not found by subscription ID, try by customer ID
    if (!user && subscription.customer) {
      user = await findUserByStripeCustomerId(subscription.customer);
    }

    if (!user) {
      console.error('❌ No user found for subscription:', {
        subscriptionId: subscription.id,
        customerId: subscription.customer
      });
      return;
    }

    const priceId = subscription.items?.data?.[0]?.price?.id;
    const plan = determinePlanFromPriceId(priceId);

    const subscriptionData = {
      stripe_subscription_id: subscription.id,
      subscription_price_id: priceId,
      subscription_status: subscription.status,
      subscription_plan: plan
    };

    // Only update customer ID if it's missing
    if (!user.stripe_customer_id && subscription.customer) {
      subscriptionData.stripe_customer_id = subscription.customer;
    }

    await updateUserSubscription(user.id, subscriptionData);
    
    console.log(`✅ Subscription updated for user ${user.email}: ${plan} plan (${subscription.status})`);
    
    // Log if subscription is set to cancel
    if (subscription.cancel_at_period_end) {
      const cancelDate = new Date(subscription.current_period_end * 1000);
      console.log(`📅 Subscription will cancel on ${cancelDate.toISOString()}`);
    }
    
  } catch (error) {
    console.error('❌ Error handling customer.subscription.updated:', error);
    throw error;
  }
}

async function handleSubscriptionDeleted(subscription) {
  console.log('🗑️ Processing customer.subscription.deleted:', subscription.id);
  
  try {
    // Find user by subscription ID
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .eq('stripe_subscription_id', subscription.id);

    if (error) {
      console.error('❌ Error finding user by subscription ID:', error);
      return;
    }

    const user = users?.[0];

    if (!user) {
      console.error('❌ No user found for deleted subscription:', subscription.id);
      return;
    }

    // Reset user to free plan
    const subscriptionData = {
      stripe_subscription_id: null,
      subscription_price_id: null,
      subscription_status: 'inactive',
      subscription_plan: 'free'
      // Keep stripe_customer_id for future subscriptions
    };

    await updateUserSubscription(user.id, subscriptionData);
    
    console.log(`✅ Subscription deleted for user ${user.email}: reset to free plan`);
    
  } catch (error) {
    console.error('❌ Error handling customer.subscription.deleted:', error);
    throw error;
  }
}