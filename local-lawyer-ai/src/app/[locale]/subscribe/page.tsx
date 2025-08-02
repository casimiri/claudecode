'use client'

import { useState } from 'react'
import { Check, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useParams } from 'next/navigation'

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    interval: 'forever',
    features: [
      '5 legal questions per month',
      'Basic AI-powered responses',
      'Community support',
      'Public law document access',
    ],
    isFree: true,
  },
  {
    id: 'weekly',
    name: 'Weekly',
    price: '$9.99',
    interval: 'per week',
    features: [
      'Unlimited legal questions',
      'Access to latest law documents',
      'AI-powered responses',
      'Email support',
    ],
  },
  {
    id: 'monthly',
    name: 'Monthly',
    price: '$29.99',
    interval: 'per month',
    features: [
      'Unlimited legal questions',
      'Access to latest law documents',
      'AI-powered responses',
      'Priority email support',
      'Advanced search features',
    ],
    popular: true,
  },
  {
    id: 'yearly',
    name: 'Yearly',
    price: '$299.99',
    interval: 'per year',
    features: [
      'Unlimited legal questions',
      'Access to latest law documents',
      'AI-powered responses',
      'Priority support',
      'Advanced search features',
      'Early access to new features',
    ],
    discount: 'Save 17%',
  },
]

export default function SubscribePage() {
  const params = useParams()
  const locale = params.locale as string
  const [loading, setLoading] = useState<string | null>(null)

  const handleSubscribe = async (planId: string) => {
    try {
      setLoading(planId)
      
      // Handle free plan differently
      if (planId === 'free') {
        // For free plan, call our free subscription API
        const response = await fetch('/api/subscription/free', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to activate free subscription')
        }

        toast.success(data.message || 'Welcome! You can now access the free tier.')
        window.location.href = `/${locale}/dashboard`
        return
      }
      
      const response = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan: planId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create checkout session')
      }

      // Redirect to Stripe Checkout
      window.location.href = data.url
    } catch (error: any) {
      toast.error(error.message || 'Failed to start subscription')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">
            Choose Your Plan
          </h1>
          <p className="mt-4 text-xl text-gray-600">
            Get instant access to our AI-powered legal assistant
          </p>
        </div>

        <div className="mt-16 grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative rounded-lg shadow-lg ${
                plan.popular
                  ? 'border-2 border-blue-500 bg-white'
                  : 'border border-gray-200 bg-white'
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                  <span className="inline-flex px-4 py-1 rounded-full text-sm font-semibold bg-blue-500 text-white">
                    Most Popular
                  </span>
                </div>
              )}
              
              {plan.discount && (
                <div className="absolute -top-4 right-4">
                  <span className="inline-flex px-3 py-1 rounded-full text-sm font-semibold bg-green-500 text-white">
                    {plan.discount}
                  </span>
                </div>
              )}

              <div className="p-8">
                <div className="text-center">
                  <h3 className="text-2xl font-bold text-gray-900">{plan.name}</h3>
                  <div className="mt-4 flex items-baseline justify-center">
                    <span className="text-5xl font-extrabold text-gray-900">
                      {plan.price}
                    </span>
                    <span className="ml-1 text-xl text-gray-500">
                      {plan.interval}
                    </span>
                  </div>
                </div>

                <ul className="mt-8 space-y-4">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="flex-shrink-0 w-5 h-5 text-green-500 mt-0.5" />
                      <span className="ml-3 text-gray-700">{feature}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8">
                  <button
                    onClick={() => handleSubscribe(plan.id)}
                    disabled={loading === plan.id}
                    className={`w-full py-3 px-4 rounded-md font-semibold text-sm transition-colors ${
                      plan.isFree 
                        ? 'bg-green-600 text-white hover:bg-green-700'
                        : plan.popular
                        ? 'bg-blue-600 text-white hover:bg-blue-700'
                        : 'bg-gray-900 text-white hover:bg-gray-800'
                    } disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center`}
                  >
                    {loading === plan.id ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing...
                      </>
                    ) : plan.isFree ? (
                      'Start Free'
                    ) : (
                      'Get Started'
                    )}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-12 text-center text-gray-500">
          <p>All plans include a 7-day money-back guarantee</p>
          <p className="mt-2">
            Need help choosing? <a href="mailto:support@locallawyer.ai" className="text-blue-600 hover:underline">Contact our support team</a>
          </p>
        </div>
      </div>
    </div>
  )
}