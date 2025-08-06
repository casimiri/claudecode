import { 
  stripe, 
  getUser, 
  setUser,
  findUserBySubscriptionId,
  getTierName 
} from '../../lib/stripe-new.js';

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
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).json({ error: 'Webhook signature verification failed' });
  }

  console.log('Processing webhook event:', event.type);

  try {
    switch (event.type) {
      case 'customer.subscription.created':
        await handleSubscriptionCreated(event.data.object);
        break;
      
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object);
        break;
      
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object);
        break;
      
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    res.status(200).json({ 
      success: true, 
      eventType: event.type,
      message: 'Webhook processed successfully'
    });

  } catch (error) {
    console.error('Webhook processing error:', error);
    res.status(500).json({ 
      error: 'Webhook processing failed',
      details: error.message 
    });
  }
}

async function handleSubscriptionCreated(subscription) {
  console.log('Processing subscription.created:', subscription.id);
  
  try {
    // Get customer details
    const customer = await stripe.customers.retrieve(subscription.customer);
    const email = customer.email;
    
    if (!email) {
      console.error('No email found for customer:', subscription.customer);
      return;
    }

    // Get the price ID from the subscription
    const priceId = subscription.items.data[0]?.price?.id;
    
    if (!priceId) {
      console.error('No price ID found in subscription:', subscription.id);
      return;
    }

    const tierName = getTierName(priceId);
    
    // Update user data
    const existingUser = getUser(email) || {};
    setUser(email, {
      ...existingUser,
      customerId: subscription.customer,
      subscriptionId: subscription.id,
      priceId: priceId,
      status: subscription.status
    });

    console.log(`✅ Subscription created for ${email}: ${tierName} plan (${subscription.id})`);
    
  } catch (error) {
    console.error('Error handling subscription.created:', error);
    throw error;
  }
}

async function handleSubscriptionUpdated(subscription) {
  console.log('Processing subscription.updated:', subscription.id);
  
  try {
    // Find user by subscription ID
    const userData = findUserBySubscriptionId(subscription.id);
    
    if (!userData) {
      console.error('No user found for subscription:', subscription.id);
      return;
    }

    const email = userData.email;
    const priceId = subscription.items.data[0]?.price?.id;
    const tierName = getTierName(priceId);

    // Update user data
    setUser(email, {
      ...userData,
      priceId: priceId,
      status: subscription.status
    });

    console.log(`✅ Subscription updated for ${email}: ${tierName} plan (${subscription.id})`);
    
    // Log if subscription is set to cancel
    if (subscription.cancel_at_period_end) {
      const cancelDate = new Date(subscription.current_period_end * 1000);
      console.log(`📅 Subscription will cancel on ${cancelDate.toLocaleDateString()}`);
    }
    
  } catch (error) {
    console.error('Error handling subscription.updated:', error);
    throw error;
  }
}

async function handleSubscriptionDeleted(subscription) {
  console.log('Processing subscription.deleted:', subscription.id);
  
  try {
    // Find user by subscription ID
    const userData = findUserBySubscriptionId(subscription.id);
    
    if (!userData) {
      console.error('No user found for subscription:', subscription.id);
      return;
    }

    const email = userData.email;
    const oldTierName = getTierName(userData.priceId);

    // Reset user to free tier
    setUser(email, {
      customerId: userData.customerId, // Keep customer ID
      subscriptionId: null,
      priceId: null, // Free tier
      status: 'canceled'
    });

    console.log(`✅ Subscription deleted for ${email}: ${oldTierName} → free (${subscription.id})`);
    
  } catch (error) {
    console.error('Error handling subscription.deleted:', error);
    throw error;
  }
}