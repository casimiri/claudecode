'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Check, Loader2, CreditCard, Calendar, Zap, AlertCircle, TrendingUp, ArrowLeft, Home } from 'lucide-react'
import toast from 'react-hot-toast'
import { getCurrentUser } from '../../../../lib/auth'
import { supabase } from '../../../../lib/supabase'

interface TokenStats {
  tokens_used: number
  tokens_limit: number
  tokens_remaining: number
  period_start: string
  period_end: string
  plan_type: string
  usage_percentage: number
}

interface SubscriptionData {
  subscription_plan: string
  subscription_status: string
  tokens_used_this_period: number
  tokens_limit: number
  period_start_date: string
  period_end_date: string
}

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: '$0',
    interval: 'per month',
    tokensPerPeriod: '10,000',
    features: [
      '10,000 AI tokens per month',
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
    tokensPerPeriod: '100,000',
    features: [
      '100,000 AI tokens per week',
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
    tokensPerPeriod: '500,000',
    features: [
      '500,000 AI tokens per month',
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
    tokensPerPeriod: '6,000,000',
    features: [
      '6,000,000 AI tokens per year',
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

export default function SubscriptionPage() {
  const params = useParams()
  const router = useRouter()
  const locale = params.locale as string
  
  const [loading, setLoading] = useState(true)
  const [changingPlan, setChangingPlan] = useState<string | null>(null)
  const [tokenStats, setTokenStats] = useState<TokenStats | null>(null)
  const [subscriptionData, setSubscriptionData] = useState<SubscriptionData | null>(null)
  const [user, setUser] = useState<any>(null)

  useEffect(() => {
    loadUserData()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const loadUserData = async () => {
    try {
      setLoading(true)
      
      // Get current user using the same method as dashboard
      const currentUser = await getCurrentUser()
      console.log('Current user:', currentUser) // Debug log
      
      // Also try direct Supabase call
      const { data: directAuth, error: directError } = await supabase.auth.getUser()
      console.log('Direct auth check:', { directAuth, directError })
      
      if (!currentUser) {
        console.log('No user found, redirecting to login') // Debug log
        // Temporarily comment out redirect to see what happens
        // router.push(`/${locale}/login`)
        // return
        toast.error('No user found - please check console for debug info')
      }
      
      setUser(currentUser)

      // Only proceed if we have a user
      if (currentUser) {
        // Get user subscription data
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('subscription_plan, subscription_status, tokens_used_this_period, tokens_limit, period_start_date, period_end_date')
          .eq('id', currentUser.id)
          .single()

        console.log('User data query result:', { userData, userError }) // Debug log

        if (userError) {
          console.error('Error fetching user data:', userError)
          // Check if it's a user not found error
          if (userError.code === 'PGRST116') {
            toast.error('User profile not found. Please complete your registration.')
          } else {
            toast.error('Failed to load subscription data')
          }
          return
        }

        setSubscriptionData(userData)

        // Get token stats
        const { data: stats, error: statsError } = await supabase
          .rpc('get_user_token_stats', { user_uuid: currentUser.id })

        if (statsError) {
          console.error('Error fetching token stats:', statsError)
        } else if (stats && stats.length > 0) {
          setTokenStats(stats[0])
        }
      }

    } catch (error) {
      console.error('Error loading user data:', error)
      // If it's an auth error, redirect to login
      if (error instanceof Error && error.message.includes('auth')) {
        console.log('Auth error detected, redirecting to login')
        router.push(`/${locale}/login`)
      } else {
        toast.error('Failed to load data')
      }
    } finally {
      setLoading(false)
    }
  }

  const handlePlanChange = async (planId: string) => {
    if (!user) return

    try {
      setChangingPlan(planId)

      // Handle free plan
      if (planId === 'free') {
        const response = await fetch('/api/subscription/free', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to switch to free plan')
        }

        toast.success('Successfully switched to free plan')
        await loadUserData()
        return
      }

      // Handle paid plans
      const response = await fetch('/api/subscription/change', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: planId }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to change subscription')
      }

      if (data.url) {
        // Redirect to Stripe checkout for upgrade
        window.location.href = data.url
      } else {
        toast.success('Subscription updated successfully')
        await loadUserData()
      }

    } catch (error: any) {
      toast.error(error.message || 'Failed to change subscription')
    } finally {
      setChangingPlan(null)
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 70) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <Link
              href={`/${locale}/dashboard`}
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              Back to Dashboard
            </Link>
            <Link
              href={`/${locale}/dashboard`}
              className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors"
            >
              <Home className="w-4 h-4 mr-2" />
              Dashboard
            </Link>
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">Subscription Management</h1>
            <p className="mt-2 text-gray-600">Manage your subscription and monitor your usage</p>
          </div>
        </div>

        {/* Current Subscription Status */}
        {subscriptionData && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <CreditCard className="w-5 h-5 mr-2 text-blue-600" />
                Current Plan
              </h2>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                subscriptionData.subscription_status === 'active' 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-red-100 text-red-800'
              }`}>
                {subscriptionData.subscription_status}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 capitalize">
                  {subscriptionData.subscription_plan} Plan
                </h3>
                <p className="text-gray-600">
                  {plans.find(p => p.id === subscriptionData.subscription_plan)?.price} {' '}
                  {plans.find(p => p.id === subscriptionData.subscription_plan)?.interval}
                </p>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Billing Period</h4>
                <div className="flex items-center text-gray-900">
                  <Calendar className="w-4 h-4 mr-1 text-gray-400" />
                  <span className="text-sm">
                    {formatDate(subscriptionData.period_start_date)} - {formatDate(subscriptionData.period_end_date)}
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-gray-500 mb-1">Next Billing</h4>
                <span className="text-sm text-gray-900">
                  {formatDate(subscriptionData.period_end_date)}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Token Usage */}
        {tokenStats && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center">
                <Zap className="w-5 h-5 mr-2 text-yellow-600" />
                Token Usage
              </h2>
              {tokenStats.usage_percentage >= 90 && (
                <div className="flex items-center text-red-600">
                  <AlertCircle className="w-4 h-4 mr-1" />
                  <span className="text-sm font-medium">Usage High</span>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900">
                  {tokenStats.tokens_used.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Tokens Used</div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900">
                  {tokenStats.tokens_remaining.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Tokens Remaining</div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900">
                  {tokenStats.tokens_limit.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">Total Limit</div>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900">
                  {tokenStats.usage_percentage}%
                </div>
                <div className="text-sm text-gray-600">Usage</div>
              </div>
            </div>

            {/* Usage Progress Bar */}
            <div className="mb-4">
              <div className="flex justify-between text-sm text-gray-600 mb-2">
                <span>Token Usage Progress</span>
                <span>{tokenStats.usage_percentage}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div 
                  className={`h-3 rounded-full transition-all duration-300 ${getUsageColor(tokenStats.usage_percentage)}`}
                  style={{ width: `${Math.min(tokenStats.usage_percentage, 100)}%` }}
                ></div>
              </div>
            </div>

            {tokenStats.usage_percentage >= 80 && (
              <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start">
                  <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5 mr-2" />
                  <div>
                    <h4 className="text-sm font-medium text-yellow-800">High Usage Warning</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      You&apos;ve used {tokenStats.usage_percentage}% of your tokens. Consider upgrading your plan to avoid service interruption.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Available Plans */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <TrendingUp className="w-5 h-5 mr-2 text-blue-600" />
            Available Plans
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {plans.map((plan) => {
              const isCurrentPlan = subscriptionData?.subscription_plan === plan.id
              const isDowngrade = subscriptionData && 
                ['yearly', 'monthly', 'weekly', 'free'].indexOf(subscriptionData.subscription_plan) > 
                ['yearly', 'monthly', 'weekly', 'free'].indexOf(plan.id)

              return (
                <div
                  key={plan.id}
                  className={`relative rounded-lg shadow-sm border p-6 ${
                    isCurrentPlan
                      ? 'border-blue-500 bg-blue-50'
                      : plan.popular
                      ? 'border-blue-300 bg-white'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  {plan.popular && !isCurrentPlan && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-blue-500 text-white">
                        Popular
                      </span>
                    </div>
                  )}
                  
                  {isCurrentPlan && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <span className="inline-flex px-3 py-1 rounded-full text-xs font-semibold bg-green-500 text-white">
                        Current Plan
                      </span>
                    </div>
                  )}

                  {plan.discount && (
                    <div className="absolute -top-3 right-4">
                      <span className="inline-flex px-2 py-1 rounded-full text-xs font-semibold bg-green-500 text-white">
                        {plan.discount}
                      </span>
                    </div>
                  )}

                  <div className="text-center">
                    <h3 className="text-lg font-semibold text-gray-900">{plan.name}</h3>
                    <div className="mt-2 flex items-baseline justify-center">
                      <span className="text-3xl font-bold text-gray-900">{plan.price}</span>
                      <span className="ml-1 text-sm text-gray-500">{plan.interval}</span>
                    </div>
                    <div className="mt-1 text-sm text-gray-600">
                      {plan.tokensPerPeriod} tokens
                    </div>
                  </div>

                  <ul className="mt-4 space-y-2">
                    {plan.features.slice(0, 4).map((feature, index) => (
                      <li key={index} className="flex items-start text-sm">
                        <Check className="flex-shrink-0 w-4 h-4 text-green-500 mt-0.5 mr-2" />
                        <span className="text-gray-600">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-6">
                    <button
                      onClick={() => handlePlanChange(plan.id)}
                      disabled={isCurrentPlan || changingPlan === plan.id}
                      className={`w-full py-2 px-4 rounded-md font-medium text-sm transition-colors ${
                        isCurrentPlan
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : plan.isFree
                          ? 'bg-green-600 text-white hover:bg-green-700'
                          : isDowngrade
                          ? 'bg-red-600 text-white hover:bg-red-700'
                          : 'bg-blue-600 text-white hover:bg-blue-700'
                      } disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center`}
                    >
                      {changingPlan === plan.id ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : isCurrentPlan ? (
                        'Current Plan'
                      ) : isDowngrade ? (
                        'Downgrade'
                      ) : plan.isFree ? (
                        'Switch to Free'
                      ) : (
                        'Upgrade'
                      )}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Help Section */}
        <div className="bg-gray-100 rounded-lg p-6 text-center">
          <h3 className="text-lg font-medium text-gray-900 mb-2">Need Help?</h3>
          <p className="text-gray-600 mb-4">
            Have questions about your subscription or need assistance with billing?
          </p>
          <div className="space-x-4">
            <a 
              href="mailto:support@locallawyer.ai" 
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              Contact Support
            </a>
            <a 
              href="#" 
              className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              View FAQ
            </a>
          </div>
        </div>
      </div>
    </div>
  )
}