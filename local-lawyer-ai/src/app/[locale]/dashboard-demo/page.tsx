'use client'

import { Scale, MessageCircle, Settings, Zap, ChevronDown, User as UserIcon, Clock, TrendingUp, Activity, BarChart3, FileText } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'

// Mock data for demonstration
const mockProfile = {
  id: 'demo-user-123',
  email: 'demo@example.com',
  full_name: 'Demo User',
  tokens_used_this_period: 2500,
  tokens_limit: 10000,
  total_tokens_purchased: 25000,
  free_starter_claimed: true,
  tokens_purchase_history: [
    {
      date: '2025-01-05T10:30:00Z',
      tokens: 10000,
      package_name: 'Starter Package',
      amount: 9.99,
      currency: 'usd',
      payment_method: 'card'
    },
    {
      date: '2025-01-03T15:20:00Z',
      tokens: 10000,
      package_name: 'Free Starter Kit',
      amount: 0,
      currency: 'usd',
      payment_method: 'free'
    }
  ]
}

const mockTokenStats = {
  tokensUsed: 2500,
  tokensLimit: 10000,
  tokensRemaining: 7500,
  periodStart: '2025-01-01T00:00:00Z',
  periodEnd: '2025-01-31T23:59:59Z',
  planType: 'starter',
  usagePercentage: 25
}

const mockRecentConversations = [
  {
    id: 'conv-1',
    title: 'Employment Contract Review',
    created_at: '2025-01-07T09:15:00Z',
    message_count: 8
  },
  {
    id: 'conv-2',
    title: 'Tenant Rights Question',
    created_at: '2025-01-06T14:30:00Z',
    message_count: 12
  },
  {
    id: 'conv-3',
    title: 'Business License Requirements',
    created_at: '2025-01-05T11:45:00Z',
    message_count: 6
  },
  {
    id: 'conv-4',
    title: 'Copyright Law Inquiry',
    created_at: '2025-01-04T16:20:00Z',
    message_count: 4
  }
]

const mockDashboardStats = {
  totalConversations: 4,
  tokensUsedToday: 350,
  averageTokensPerConversation: 625,
  lastActivityDate: '2025-01-07T09:15:00Z'
}

export default function DashboardDemoPage() {
  const params = useParams()
  const locale = params?.locale as string

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Scale className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">Local Lawyer AI</span>
              <span className="ml-4 px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">
                DEMO
              </span>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center text-gray-700">
                <UserIcon className="w-4 h-4 mr-2" />
                <span>{mockProfile.full_name}</span>
                <ChevronDown className="w-4 h-4 ml-1" />
              </div>
              
              <Link
                href={`/${locale}/chat`}
                className="inline-flex items-center bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
              >
                <MessageCircle className="w-4 h-4 mr-2" />
                Start Chatting
              </Link>
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
                    {mockTokenStats.tokensRemaining.toLocaleString()}
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
                    {mockProfile.total_tokens_purchased.toLocaleString()}
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
        </div>

        {/* Dashboard Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg">
                <MessageCircle className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Conversations</p>
                <p className="text-2xl font-bold text-gray-900">
                  {mockRecentConversations.length}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Tokens Used Today</p>
                <p className="text-2xl font-bold text-gray-900">
                  {mockDashboardStats.tokensUsedToday.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-12 h-12 bg-purple-100 rounded-lg">
                <BarChart3 className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Avg. Tokens/Chat</p>
                <p className="text-2xl font-bold text-gray-900">
                  {mockDashboardStats.averageTokensPerConversation.toLocaleString()}
                </p>
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center">
              <div className="flex items-center justify-center w-12 h-12 bg-orange-100 rounded-lg">
                <Activity className="h-6 w-6 text-orange-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Account Status</p>
                <p className="text-sm font-bold text-green-600">
                  Active
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions Panel */}
        <div className="bg-white rounded-lg shadow p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
            <Zap className="h-6 w-6 text-blue-600 mr-2" />
            Quick Actions
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg border-2 border-dashed border-blue-300 hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer">
              <div className="flex items-center">
                <MessageCircle className="h-8 w-8 text-blue-600 mr-3" />
                <div>
                  <h3 className="font-medium text-gray-900">Start New Chat</h3>
                  <p className="text-sm text-gray-600">Ask legal questions</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 rounded-lg border-2 border-dashed border-purple-300 hover:border-purple-500 hover:bg-purple-50 transition-colors cursor-pointer">
              <div className="flex items-center">
                <Zap className="h-8 w-8 text-purple-600 mr-3" />
                <div>
                  <h3 className="font-medium text-gray-900">Buy Tokens</h3>
                  <p className="text-sm text-gray-600">Get more AI credits</p>
                </div>
              </div>
            </div>
            
            <div className="p-4 rounded-lg border-2 border-dashed border-gray-300 hover:border-gray-500 hover:bg-gray-50 transition-colors cursor-pointer">
              <div className="flex items-center">
                <Settings className="h-8 w-8 text-gray-600 mr-3" />
                <div>
                  <h3 className="font-medium text-gray-900">Account Settings</h3>
                  <p className="text-sm text-gray-600">Manage your profile</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Conversations */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Clock className="h-6 w-6 text-blue-600 mr-2" />
              Recent Conversations
            </h2>
            <div className="space-y-3">
              {mockRecentConversations.map((conversation) => (
                <div
                  key={conversation.id}
                  className="block p-3 rounded-lg hover:bg-gray-50 border border-gray-200 transition-colors cursor-pointer"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 text-gray-400 mr-3" />
                      <div>
                        <p className="font-medium text-gray-900 truncate max-w-xs">
                          {conversation.title}
                        </p>
                        <p className="text-sm text-gray-500">
                          {new Date(conversation.created_at).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center">
                      <span className="text-xs text-gray-500 mr-2">
                        {conversation.message_count} messages
                      </span>
                      <ChevronDown className="h-4 w-4 text-gray-400 transform -rotate-90" />
                    </div>
                  </div>
                </div>
              ))}
              <div className="block p-3 text-center text-blue-600 hover:text-blue-700 font-medium text-sm rounded-lg hover:bg-blue-50 transition-colors cursor-pointer">
                View All Conversations
              </div>
            </div>
          </div>
          
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <BarChart3 className="h-6 w-6 text-green-600 mr-2" />
              Usage Analytics
            </h2>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">Token Usage Progress</span>
                  <span className="text-sm text-gray-500">
                    {mockTokenStats.usagePercentage.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="h-3 rounded-full transition-all duration-500 bg-green-500"
                    style={{ width: `${mockTokenStats.usagePercentage}%` }}
                  ></div>
                </div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-gray-500">
                    {mockTokenStats.tokensUsed.toLocaleString()} used
                  </span>
                  <span className="text-xs text-gray-500">
                    {mockTokenStats.tokensRemaining.toLocaleString()} remaining
                  </span>
                </div>
              </div>
              
              <div className="border-t pt-4">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-blue-600">
                      {mockProfile.total_tokens_purchased.toLocaleString()}
                    </p>
                    <p className="text-sm text-gray-600">Total Purchased</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-green-600">
                      {mockRecentConversations.length}
                    </p>
                    <p className="text-sm text-gray-600">Conversations</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Activity - Token Purchase History */}
        <div className="mt-8 bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {mockProfile.tokens_purchase_history
              .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
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
        </div>
      </div>
    </div>
  )
}