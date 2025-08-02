'use client'

import { useEffect, useState } from 'react'
import { supabase } from '../../../../lib/supabase'
import { getCurrentUser } from '../../../../lib/auth'
import { User } from '@supabase/supabase-js'
import { Scale, MessageCircle, CreditCard, Settings, LogOut, Zap, Clock } from 'lucide-react'
import Link from 'next/link'
import { signOut } from '../../../../lib/auth'
import toast from 'react-hot-toast'
import { useParams } from 'next/navigation'

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  subscription_status: string
  subscription_plan: string | null
  current_period_end: string | null
  tokens_used_this_period?: number
  tokens_limit?: number
  period_end_date?: string
}

interface TokenUsageStats {
  tokensUsed: number
  tokensLimit: number
  tokensRemaining: number
  periodStart: string
  periodEnd: string
  planType: string
  usagePercentage: number
}

export default function DashboardPage() {
  const params = useParams()
  const locale = params.locale as string
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [tokenStats, setTokenStats] = useState<TokenUsageStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await getCurrentUser()
        if (currentUser) {
          setUser(currentUser)
          
          // Fetch user profile
          const { data: userProfile, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', currentUser.id)
            .single()

          if (error) {
            console.error('Error fetching profile:', error)
          } else {
            setProfile(userProfile)
            
            // Fetch token usage stats for free plan users
            if (userProfile.subscription_plan === 'free') {
              try {
                const response = await fetch('/api/tokens/usage')
                if (response.ok) {
                  const { data } = await response.json()
                  setTokenStats(data)
                }
              } catch (error) {
                console.error('Error fetching token stats:', error)
              }
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  const handleSignOut = async () => {
    try {
      await signOut()
      window.location.href = '/'
    } catch (error: any) {
      toast.error('Failed to sign out')
    }
  }

  const createBillingPortalSession = async () => {
    try {
      const response = await fetch('/api/stripe/portal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to create portal session')
      }

      window.location.href = data.url
    } catch (error: any) {
      toast.error(error.message || 'Failed to open billing portal')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  if (!user || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900">Access Denied</h1>
          <p className="mt-2 text-gray-600">Please sign in to access your dashboard.</p>
          <Link href={`/${locale}/login`} className="mt-4 inline-block bg-blue-600 text-white px-4 py-2 rounded-md">
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Scale className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">Local Lawyer AI</span>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-gray-700">Welcome, {profile.full_name || profile.email}</span>
              <button
                onClick={handleSignOut}
                className="flex items-center text-gray-500 hover:text-gray-700"
              >
                <LogOut className="w-4 h-4 mr-1" />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Subscription Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Subscription Status</h2>
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  profile.subscription_status === 'active' 
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {profile.subscription_status === 'active' ? 'Active' : 'Inactive'}
                </span>
                {profile.subscription_plan && (
                  <span className="ml-2 text-sm text-gray-600">
                    {profile.subscription_plan.charAt(0).toUpperCase() + profile.subscription_plan.slice(1)} Plan
                  </span>
                )}
              </div>
              {profile.current_period_end && (
                <p className="mt-1 text-sm text-gray-500">
                  Next billing: {new Date(profile.current_period_end).toLocaleDateString()}
                </p>
              )}
            </div>
            <div className="flex space-x-2">
              <Link
                href={`/${locale}/subscription`}
                className="flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
              >
                <Settings className="w-4 h-4 mr-2" />
                Manage Subscription
              </Link>
              {profile.subscription_status === 'active' && profile.subscription_plan !== 'free' && (
                <button
                  onClick={createBillingPortalSession}
                  className="flex items-center bg-gray-100 hover:bg-gray-200 text-gray-800 px-4 py-2 rounded-md text-sm"
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  Billing Portal
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Token Usage for Free Plan */}
        {profile.subscription_plan === 'free' && tokenStats && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Zap className="h-6 w-6 text-yellow-500 mr-2" />
              AI Token Usage
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Monthly Usage</span>
                  <span className="text-sm text-gray-500">
                    {tokenStats.tokensUsed.toLocaleString()} / {tokenStats.tokensLimit.toLocaleString()} tokens
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-300 ${
                      tokenStats.usagePercentage >= 90 
                        ? 'bg-red-500' 
                        : tokenStats.usagePercentage >= 75 
                        ? 'bg-orange-500' 
                        : 'bg-green-500'
                    }`}
                    style={{ width: `${Math.min(tokenStats.usagePercentage, 100)}%` }}
                  ></div>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className={`text-sm font-medium ${
                    tokenStats.usagePercentage >= 90 
                      ? 'text-red-600' 
                      : tokenStats.usagePercentage >= 75 
                      ? 'text-orange-600' 
                      : 'text-green-600'
                  }`}>
                    {tokenStats.usagePercentage}% used
                  </span>
                  <span className="text-sm text-gray-500 flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    Resets {new Date(tokenStats.periodEnd).toLocaleDateString()}
                  </span>
                </div>
              </div>
              
              {tokenStats.usagePercentage >= 80 && (
                <div className={`p-3 rounded-md ${
                  tokenStats.usagePercentage >= 90 
                    ? 'bg-red-50 border border-red-200' 
                    : 'bg-orange-50 border border-orange-200'
                }`}>
                  <p className={`text-sm ${
                    tokenStats.usagePercentage >= 90 
                      ? 'text-red-700' 
                      : 'text-orange-700'
                  }`}>
                    {tokenStats.usagePercentage >= 90 
                      ? 'You\'re almost out of tokens! Consider upgrading to continue using AI features.'
                      : 'You\'re using most of your monthly tokens. Consider upgrading for unlimited access.'
                    }
                  </p>
                  <Link 
                    href={`/${locale}/subscribe`}
                    className={`inline-flex items-center mt-2 px-3 py-1 rounded-md text-sm font-medium ${
                      tokenStats.usagePercentage >= 90 
                        ? 'bg-red-600 text-white hover:bg-red-700' 
                        : 'bg-orange-600 text-white hover:bg-orange-700'
                    }`}
                  >
                    Upgrade Now
                  </Link>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Main Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Chat with AI */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <MessageCircle className="h-8 w-8 text-blue-600" />
              <h3 className="ml-3 text-lg font-semibold text-gray-900">AI Legal Assistant</h3>
            </div>
            <p className="text-gray-600 mb-4">
              Get instant answers to your legal questions using our AI-powered assistant trained on local law documents.
            </p>
            {profile.subscription_status === 'active' ? (
              <Link 
                href={`/${locale}/chat`}
                className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
              >
                Start Chatting
              </Link>
            ) : (
              <div>
                <p className="text-red-600 text-sm mb-2">Active subscription required</p>
                <Link 
                  href={`/${locale}/subscribe`}
                  className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
                >
                  Subscribe Now
                </Link>
              </div>
            )}
          </div>

          {/* Account Settings */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center mb-4">
              <Settings className="h-8 w-8 text-gray-600" />
              <h3 className="ml-3 text-lg font-semibold text-gray-900">Account Settings</h3>
            </div>
            <div className="space-y-2 text-sm text-gray-600">
              <p><strong>Email:</strong> {profile.email}</p>
              <p><strong>Name:</strong> {profile.full_name || 'Not provided'}</p>
              <p><strong>Member since:</strong> {new Date(user.created_at).toLocaleDateString()}</p>
            </div>
            <div className="mt-4">
              <button className="text-blue-600 hover:text-blue-800 text-sm">
                Update Profile
              </button>
            </div>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="text-center py-8 text-gray-500">
            <MessageCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No recent activity</p>
            <p className="text-sm">Start a conversation with the AI assistant to see your history here.</p>
          </div>
        </div>
      </div>
    </div>
  )
}