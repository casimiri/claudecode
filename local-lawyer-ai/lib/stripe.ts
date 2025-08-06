import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2025-06-30.basil',
})



export const createCheckoutSession = async ({
  priceId,
  customerId,
  successUrl,
  cancelUrl,
  metadata = {},
  mode = 'subscription',
}: {
  priceId: string
  customerId?: string
  successUrl: string
  cancelUrl: string
  metadata?: Record<string, string>
  mode?: 'subscription' | 'payment'
}) => {
  const sessionData: any = {
    mode,
    payment_method_types: ['card'],
    line_items: [
      {
        price: priceId,
        quantity: 1,
      },
    ],
    customer: customerId,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata,
  }

  // Only add subscription_data for subscription mode
  if (mode === 'subscription') {
    sessionData.subscription_data = {
      metadata,
    }
  }

  const session = await stripe.checkout.sessions.create(sessionData)

  return session
}

export const createCustomer = async ({
  email,
  name,
  metadata = {},
}: {
  email: string
  name?: string
  metadata?: Record<string, string>
}) => {
  const customer = await stripe.customers.create({
    email,
    name,
    metadata,
  })

  return customer
}

export const getCustomer = async (customerId: string) => {
  return await stripe.customers.retrieve(customerId)
}

export const createPortalSession = async ({
  customerId,
  returnUrl,
}: {
  customerId: string
  returnUrl: string
}) => {
  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })

  return session
}

