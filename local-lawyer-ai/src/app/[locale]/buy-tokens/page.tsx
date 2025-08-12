'use client'

import React, { useState, useEffect } from 'react'
import { useRouter, useSearchParams, useParams } from 'next/navigation'
import { useTranslations } from 'next-intl'
import { getCurrentUser } from '../../../../lib/auth'
import { User } from '@supabase/supabase-js'
import { toast } from 'react-hot-toast'
import { Check, Loader2, Crown, Zap, ArrowLeft, Wallet, Scale } from 'lucide-react'
import Link from 'next/link'
import LanguageSwitcher from '../../../components/LanguageSwitcher'
import ThemeToggle from '../../../components/ThemeToggle'

// Token package configurations generator
const getTokenPackages = (t: any) => [
  {
    id: 'starter',
    name: t('tokens.packages.starterPack'),
    price: '$9',
    tokens: 10000,
    period: t('tokens.ui.oneTime'),
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_TOKENS_STARTER,
    features: [
      `10,000 ${t('tokens.ui.tokens')}`,
      t('tokens.features.neverExpires'),
      t('tokens.features.perfectForLightUsage'),
      t('tokens.features.emailSupport')
    ],
    popular: false,
    color: 'blue',
    valuePerToken: 0.0009, // $0.0009 per token
    savings: null
  },
  {
    id: 'popular',
    name: t('tokens.packages.popularPack'),
    price: '$39',
    tokens: 50000,
    period: t('tokens.ui.oneTime'),
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_TOKENS_POPULAR,
    features: [
      `50,000 ${t('tokens.ui.tokens')}`,
      t('tokens.features.neverExpires'),
      t('tokens.features.mostPopularChoice'),
      t('tokens.features.prioritySupport'),
      'Save 13% vs Starter'
    ],
    popular: true,
    color: 'purple',
    valuePerToken: 0.00078, // $0.00078 per token
    savings: '13%'
  },
  {
    id: 'power',
    name: t('tokens.packages.powerPack'),
    price: '$99',
    tokens: 150000,
    period: t('tokens.ui.oneTime'),
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_TOKENS_POWER,
    features: [
      `150,000 ${t('tokens.ui.tokens')}`,
      t('tokens.features.neverExpires'),
      t('tokens.features.greatForHeavyUsers'),
      t('tokens.features.prioritySupport'),
      'Save 27% vs Starter'
    ],
    popular: false,
    color: 'green',
    valuePerToken: 0.00066, // $0.00066 per token
    savings: '27%'
  },
  {
    id: 'enterprise',
    name: t('tokens.packages.enterprisePack'),
    price: '$299',
    tokens: 500000,
    period: t('tokens.ui.oneTime'),
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_TOKENS_ENTERPRISE,
    features: [
      `500,000 ${t('tokens.ui.tokens')}`,
      t('tokens.features.neverExpires'),
      t('tokens.features.maximumValue'),
      t('tokens.features.premiumSupport'),
      'Save 33% vs Starter',
      t('tokens.features.bulkDiscountPricing')
    ],
    popular: false,
    color: 'yellow',
    valuePerToken: 0.000598, // $0.000598 per token
    savings: '33%'
  }
]

const LoadingSpinner = ({ size = 'w-5 h-5' }) => (
  <Loader2 className={`${size} animate-spin`} />
)

interface TokenPackage {
  id: string
  name: string
  price: string
  tokens: number
  period: string
  priceId?: string
  features: string[]
  popular: boolean
  color: string
  valuePerToken: number
  savings: string | null
}

interface TokenPackageCardProps {
  package: TokenPackage
  onPurchase: (pkg: TokenPackage) => void
  isProcessing: string | null
  t: any
}

const TokenPackageCard = ({ package: tokenPackage, onPurchase, isProcessing, t }: TokenPackageCardProps) => {
  const isProcessingThisPackage = isProcessing === tokenPackage.id

  const getButtonState = () => {
    return {
      disabled: isProcessingThisPackage,
      text: isProcessingThisPackage ? t('tokens.ui.processing') : t('tokens.ui.buyTokens'),
      className: `bg-${tokenPackage.color}-600 hover:bg-${tokenPackage.color}-700 text-white ${isProcessingThisPackage ? 'opacity-75 cursor-wait' : ''}`
    }
  }

  const buttonState = getButtonState()

  const cardClass = `relative rounded-lg border-2 p-6 shadow-sm transition-all duration-200 bg-white dark:bg-gray-800 ${
    tokenPackage.popular
      ? 'border-purple-200 dark:border-purple-700 shadow-lg hover:shadow-xl hover:border-purple-300 dark:hover:border-purple-600'
      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-md'
  }`

  return (
    <div className={cardClass}>
      {/* Popular Badge */}
      {tokenPackage.popular && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
          <span className="bg-purple-600 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center">
            <Crown className="w-3 h-3 mr-1" />
            {t('tokens.ui.mostPopular')}
          </span>
        </div>
      )}

      {/* Best Value Badge */}
      {tokenPackage.savings && (
        <div className="absolute top-4 right-4">
          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
            {t('tokens.ui.save', { percentage: tokenPackage.savings })}
          </span>
        </div>
      )}

      <div className="text-center">
        <h3 className="text-2xl font-bold text-gray-900 dark:text-white">{tokenPackage.name}</h3>
        <div className="mt-4">
          <span className="text-4xl font-bold text-gray-900 dark:text-white">{tokenPackage.price}</span>
          <span className="text-gray-600 dark:text-gray-300 ml-2">{tokenPackage.period}</span>
        </div>
        <div className="mt-2">
          <span className="text-lg font-semibold text-blue-600 flex items-center justify-center">
            <Zap className="w-4 h-4 mr-1" />
            {tokenPackage.tokens.toLocaleString()} {t('tokens.ui.tokens')}
          </span>
        </div>
      </div>

      <ul className="mt-6 space-y-3">
        {tokenPackage.features.map((feature, index) => (
          <li key={index} className="flex items-start">
            <Check className="h-5 w-5 text-green-500 mt-0.5 mr-3 flex-shrink-0" />
            <span className="text-gray-600 dark:text-gray-300">{feature}</span>
          </li>
        ))}
      </ul>

      <div className="mt-8">
        <button
          onClick={() => onPurchase(tokenPackage)}
          disabled={buttonState.disabled}
          className={`w-full py-3 px-4 rounded-lg font-medium transition-colors duration-200 flex items-center justify-center ${buttonState.className}`}
        >
          {isProcessingThisPackage && (
            <LoadingSpinner size="w-4 h-4" />
          )}
          <span className={isProcessingThisPackage ? 'ml-2' : ''}>
            {buttonState.text}
          </span>
        </button>
      </div>
    </div>
  )
}

interface TokenStats {
  tokensRemaining: number
  totalTokensPurchased: number
}

export default function TokenPurchasePage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [processingPackage, setProcessingPackage] = useState<string | null>(null)
  const [tokenStats, setTokenStats] = useState<TokenStats | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()
  const params = useParams()
  const locale = params?.locale as string
  const t = useTranslations()

  const fetchTokenStats = async () => {
    try {
      const response = await fetch('/api/tokens/usage')
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.data) {
          setTokenStats({
            tokensRemaining: result.data.tokensRemaining || 0,
            totalTokensPurchased: result.data.tokensLimit || 0
          })
        }
      }
    } catch (error) {
      console.error('Failed to fetch token stats:', error)
    }
  }

  useEffect(() => {
    getCurrentUser().then((user) => {
      setUser(user)
      setLoading(false)
      if (user) {
        fetchTokenStats()
      }
    })
  }, [])

  // Handle success/cancellation from Stripe redirect
  useEffect(() => {
    if (!searchParams) return
    
    const success = searchParams.get('success')
    const canceled = searchParams.get('canceled')
    const tokens = searchParams.get('tokens')
    const sessionId = searchParams.get('session_id')
    
    if (success === 'true' && tokens && sessionId) {
      // Process the successful purchase via fallback API
      const processSuccessfulPurchase = async () => {
        try {
          const response = await fetch('/api/process-successful-purchase', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              session_id: sessionId,
              tokens: parseInt(tokens),
              package_name: 'Token Package' // This will be extracted from session metadata
            })
          })

          const data = await response.json()
          
          if (response.ok) {
            if (data.already_processed) {
              toast.success(`${parseInt(tokens).toLocaleString()} tokens were already added to your account.`)
            } else {
              toast.success(`Success! ${data.tokens_added.toLocaleString()} tokens have been added to your account.`)
            }
            // Refresh token stats after successful purchase
            fetchTokenStats()
          } else {
            console.error('Failed to process purchase:', data)
            toast.error('Purchase successful but tokens may take a few minutes to appear in your account.')
          }
        } catch (error) {
          console.error('Error processing successful purchase:', error)
          toast.error('Purchase successful but tokens may take a few minutes to appear in your account.')
        }
      }

      processSuccessfulPurchase()
      // Clear the query parameters
      router.replace(`/${locale}/buy-tokens`)
    } else if (canceled === 'true') {
      toast.error('Token purchase was canceled.')
      // Clear the query parameters
      router.replace(`/${locale}/buy-tokens`)
    }
  }, [searchParams, router])

  const handleTokenPurchase = async (tokenPackage: TokenPackage) => {
    if (!user) {
      toast.error('Please log in to purchase tokens')
      return
    }

    // Check if priceId is available
    if (!tokenPackage.priceId) {
      toast.error(`Price ID not configured for ${tokenPackage.name}. Please check environment variables.`)
      console.error('Missing price ID for package:', tokenPackage)
      return
    }

    try {
      setProcessingPackage(tokenPackage.id)
      
      console.log('🔍 Purchasing token package:', {
        packageName: tokenPackage.name,
        tokens: tokenPackage.tokens,
        priceId: tokenPackage.priceId,
        email: user.email
      })
      
      const response = await fetch('/api/buy-tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: user.email,
          priceId: tokenPackage.priceId,
          tokens: tokenPackage.tokens,
          packageName: tokenPackage.name
        })
      })

      const data = await response.json()

      if (response.ok) {
        if (data.url) {
          // Redirect to Stripe Checkout
          window.location.href = data.url
        } else {
          toast.success(data.message || 'Tokens purchased successfully')
        }
      } else {
        toast.error(data.error || 'Failed to process token purchase')
      }
    } catch (error) {
      console.error('Token purchase error:', error)
      toast.error('Failed to process token purchase')
    } finally {
      setProcessingPackage(null)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <LoadingSpinner size="w-8 h-8" />
      </div>
    )
  }

  // Show login message if user is not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">{t('tokens.ui.pleaseLogIn')}</h1>
          <p className="text-gray-600 dark:text-gray-300 mb-6">{t('tokens.ui.mustBeLoggedIn')}</p>
          <button
            onClick={() => router.push(`/${locale}/login`)}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {t('tokens.ui.goToLogin')}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Navigation and Token Balance */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center space-x-4">
            <Link href={`/${locale}`} className="flex items-center">
              <Scale className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900 dark:text-white">{t('common.appName')}</span>
            </Link>
            
            <Link 
              href={`/${locale}/dashboard`}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              {t('tokens.ui.backToDashboard')}
            </Link>
            
            <ThemeToggle />
            <LanguageSwitcher />
            
            {user && (
              <div className="bg-white dark:bg-gray-800 rounded-lg px-4 py-3 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">
                      {user.email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {user.user_metadata?.full_name || user.email}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {user.email}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {tokenStats && (
            <div className="flex items-center space-x-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg px-6 py-3 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-2">
                  <Wallet className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('tokens.ui.availableTokens')}</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {(tokenStats.tokensRemaining || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-white dark:bg-gray-800 rounded-lg px-6 py-3 shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-2">
                  <Zap className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{t('tokens.ui.totalPurchased')}</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {(tokenStats.totalTokensPurchased || 0).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">{t('tokens.ui.buyTokensTitle')}</h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            {t('tokens.ui.buyTokensSubtitle')}
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12">
          {getTokenPackages(t).map((tokenPackage) => (
            <TokenPackageCard
              key={tokenPackage.id}
              package={tokenPackage}
              onPurchase={handleTokenPurchase}
              isProcessing={processingPackage}
              t={t}
            />
          ))}
        </div>
      </div>
    </div>
  )
}