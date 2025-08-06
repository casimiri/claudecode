'use client'

import { useEffect, useState, useRef } from 'react'
import { supabase } from '../../../../lib/supabase'
import { getCurrentUser } from '../../../../lib/auth'
import { User } from '@supabase/supabase-js'
import { Scale, MessageCircle, Settings, LogOut, Zap, Gift, ChevronDown, User as UserIcon } from 'lucide-react'
import Link from 'next/link'
import { signOut } from '../../../../lib/auth'
import toast from 'react-hot-toast'
import { useParams } from 'next/navigation'

interface UserProfile {
  id: string
  email: string
  full_name: string | null
  tokens_used_this_period?: number
  tokens_limit?: number
  total_tokens_purchased?: number
  free_starter_claimed?: boolean
  tokens_purchase_history?: Array<{
    date: string
    tokens: number
    package_name: string
    stripe_session_id?: string
    amount?: number
    currency?: string
    payment_method?: string
  }>
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
  const locale = params?.locale as string
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [tokenStats, setTokenStats] = useState<TokenUsageStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [claimingFreeTokens, setClaimingFreeTokens] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])


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
          
          // Fetch token usage stats for all users
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
    } catch (error) {
      console.error('Error fetching user:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUser()
  }, [])

  const handleSignOut = async () => {
    try {
      await signOut()
      window.location.href = '/'
    } catch {
      toast.error('Failed to sign out')
    }
  }

  const claimFreeTokens = async () => {
    try {
      setClaimingFreeTokens(true)
      
      const response = await fetch('/api/tokens/claim-free', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      const data = await response.json()

      if (response.ok) {
        toast.success(data.message)
        // Refresh user data to update token display
        await fetchUser()
      } else {
        toast.error(data.error || 'Failed to claim free tokens')
      }
    } catch (error) {
      console.error('Error claiming free tokens:', error)
      toast.error('Failed to claim free tokens')
    } finally {
      setClaimingFreeTokens(false)
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
              {/* User Menu Dropdown */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center text-gray-700 hover:text-gray-900 focus:outline-none"
                >
                  <UserIcon className="w-4 h-4 mr-2" />
                  <span>{profile.full_name || profile.email}</span>
                  <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg py-1 z-50 border border-gray-200">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <div className="text-sm font-medium text-gray-900">
                        {profile.full_name || 'User'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {profile.email}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        Member since {new Date(user.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short'
                        })}
                      </div>
                    </div>
                    <Link
                      href={`/${locale}/dashboard/profile`}
                      className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      Account Settings
                    </Link>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false)
                        handleSignOut()
                      }}
                      className="flex items-center w-full px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
              
              {profile && (profile.total_tokens_purchased || 0) > 0 ? (
                <Link
                  href={`/${locale}/chat`}
                  className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Start Chatting
                </Link>
              ) : (
                <Link
                  href={`/${locale}/buy-tokens`}
                  className="inline-flex items-center bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Buy Tokens
                </Link>
              )}
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Token Balance */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Token Balance</h2>
          <div className="flex items-center justify-between">
            <div className="flex space-x-8">
              <div>
                <div className="flex items-center">
                  <span className="text-3xl font-bold text-blue-600">
                    {tokenStats ? tokenStats.tokensRemaining.toLocaleString() : '---'}
                  </span>
                  <span className="ml-2 text-sm text-gray-600">available tokens</span>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Ready to use for AI conversations
                </p>
              </div>
              <div>
                <div className="flex items-center">
                  <span className="text-3xl font-bold text-green-600">
                    {profile ? (profile.total_tokens_purchased || 0).toLocaleString() : '---'}
                  </span>
                  <span className="ml-2 text-sm text-gray-600">total purchased</span>
                </div>
                <p className="mt-1 text-sm text-gray-500">
                  Tokens never expire
                </p>
              </div>
            </div>
            <div className="flex space-x-2">
              <Link
                href={`/${locale}/buy-tokens`}
                className="flex items-center bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 rounded-md text-sm transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Zap className="w-4 h-4 mr-2" />
                Buy Tokens
              </Link>
            </div>
          </div>

          {/* AI Legal Assistant Sub-section */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex items-center mb-4">
              <MessageCircle className="h-6 w-6 text-blue-600" />
              <h4 className="ml-2 text-md font-medium text-gray-900">AI Legal Assistant</h4>
            </div>
            <p className="text-gray-600 text-sm mb-4">
              Get instant answers to your legal questions using our AI-powered assistant trained on local law documents.
            </p>
            {profile && (profile.total_tokens_purchased || 0) > 0 ? (
              <Link 
                href={`/${locale}/chat`}
                className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Start Chatting
              </Link>
            ) : (
              <div>
                <p className="text-red-600 text-sm mb-2">Tokens required to use AI chat</p>
                <Link 
                  href={`/${locale}/buy-tokens`}
                  className="inline-flex items-center bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white px-4 py-2 rounded-md text-sm transition-all duration-200 shadow-lg hover:shadow-xl"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Buy Tokens
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Free Starter Kit */}
        {profile && profile.free_starter_claimed !== true && (
          <div className="bg-gradient-to-r from-green-50 to-blue-50 border border-green-200 rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Gift className="h-6 w-6 text-green-600 mr-2" />
              Free Starter Kit Available!
            </h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-700 mb-2">
                  <strong>Welcome bonus:</strong> Claim your free 10,000 tokens to get started with AI legal assistance.
                </p>
                <p className="text-sm text-gray-600">
                  • One-time offer for new users • Tokens never expire • Start chatting immediately
                </p>
              </div>
              <div>
                <button
                  onClick={claimFreeTokens}
                  disabled={claimingFreeTokens}
                  className="flex items-center bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white px-6 py-3 rounded-md text-lg font-medium transition-colors"
                >
                  {claimingFreeTokens ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Claiming...
                    </>
                  ) : (
                    <>
                      <Gift className="w-5 h-5 mr-2" />
                      Claim 10,000 Free Tokens
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Token Usage */}
        {tokenStats && (
          <div className="bg-white rounded-lg shadow p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Zap className="h-6 w-6 text-yellow-500 mr-2" />
              AI Token Usage
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Total Token Usage</span>
                  <span className="text-sm text-gray-500">
                    {tokenStats.tokensUsed.toLocaleString()} tokens used
                  </span>
                </div>
                {tokenStats.tokensLimit > 0 && (
                  <>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full transition-all duration-300 ${
                          tokenStats.usagePercentage >= 90 
                            ? 'bg-red-500' 
                            : tokenStats.usagePercentage >= 75 
                            ? 'bg-orange-500' 
                            : 'bg-blue-500'
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
                          : 'text-blue-600'
                      }`}>
                        {tokenStats.tokensRemaining.toLocaleString()} tokens remaining
                      </span>
                    </div>
                  </>
                )}
              </div>
              
              {profile && (profile.total_tokens_purchased || 0) <= 1000 && (
                <div className="p-3 rounded-md bg-orange-50 border border-orange-200">
                  <p className="text-sm text-orange-700">
                    You&apos;re running low on tokens! Purchase more to continue using AI features.
                  </p>
                  <Link 
                    href={`/${locale}/buy-tokens`}
                    className="inline-flex items-center mt-2 px-3 py-1 rounded-md text-sm font-medium bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white transition-all duration-200 shadow-lg hover:shadow-xl"
                  >
                    <Zap className="w-4 h-4 mr-1" />
                    Buy More Tokens
                  </Link>
                </div>
              )}
            </div>

          </div>
        )}


        {/* Recent Activity - Token Purchase History */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          
          {profile?.tokens_purchase_history && profile.tokens_purchase_history.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {profile.tokens_purchase_history
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .slice(0, 6)
                .map((purchase, index) => (
                  <div key={index} className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center">
                        <Zap className="w-4 h-4 text-blue-600 mr-2" />
                        <span className="font-semibold text-gray-900">
                          {purchase.tokens.toLocaleString()} tokens
                        </span>
                      </div>
                      {purchase.amount && (
                        <span className="text-sm text-gray-600">
                          ${(purchase.amount).toFixed(2)}
                        </span>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-600 mb-1">
                      {purchase.package_name}
                    </div>
                    
                    <div className="text-xs text-gray-500">
                      {new Date(purchase.date).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </div>
                    
                    {purchase.payment_method && (
                      <div className="mt-2">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          purchase.payment_method === 'free' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {purchase.payment_method === 'free' ? 'Free Starter Kit' : 'Card Payment'}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Zap className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>No token purchases yet</p>
              <p className="text-sm">Purchase your first token package to get started!</p>
              <Link 
                href={`/${locale}/buy-tokens`}
                className="inline-flex items-center mt-4 px-4 py-2 text-sm font-medium bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-white rounded-md transition-all duration-200 shadow-lg hover:shadow-xl"
              >
                <Zap className="w-4 h-4 mr-1" />
                Buy Tokens
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}