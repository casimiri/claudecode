'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Scale, ArrowLeft, Loader2, Zap, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getCurrentUser } from '../../../../lib/auth'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}

export default function ChatPage() {
  const params = useParams()
  const locale = params.locale as string
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      role: 'assistant',
      content: 'Hello! I\'m your AI legal assistant. I can help you with questions about local laws and regulations. What would you like to know?',
      timestamp: new Date(),
    }
  ])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [tokenInfo, setTokenInfo] = useState<{used: number, remaining: number} | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    // Check authentication status when component mounts
    const checkAuth = async () => {
      try {
        const user = await getCurrentUser()
        console.log('Chat page - Current user:', user)
        setAuthChecked(true)
        
        if (!user) {
          console.log('No user found, redirecting to login')
          window.location.href = `/${locale}/login`
          return
        }
      } catch (error) {
        console.error('Auth check error:', error)
        setAuthChecked(true)
        // Redirect to login on auth error
        window.location.href = `/${locale}/login`
      }
    }
    
    checkAuth()
  }, [locale])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    const currentMessages = [...messages, userMessage]
    setInput('')
    setLoading(true)

    try {
      // Check if user is authenticated before making request
      const currentUser = await getCurrentUser()
      console.log('Before API call - Current user:', currentUser)
      
      if (!currentUser) {
        throw new Error('You must be logged in to use the chat feature.')
      }

      // Prepare conversation history for API
      const conversationHistory = currentMessages
        .slice(-10) // Keep last 10 messages for context
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }))

      // First test our auth endpoint
      console.log('Testing auth endpoint first...')
      const testResponse = await fetch('/api/test/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ test: true }),
      })
      
      const testData = await testResponse.json()
      console.log('Test auth response:', testResponse.status, testData)
      
      if (!testResponse.ok) {
        throw new Error(`Auth test failed: ${testData.error} - ${testData.details}`)
      }

      console.log('Making API call to /api/chat...')
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory: conversationHistory.slice(0, -1) // Exclude current message
        }),
      })

      const data = await response.json()
      console.log('API response status:', response.status)
      console.log('API response data:', data)

      if (!response.ok) {
        if (data.code === 'TOKEN_LIMIT_EXCEEDED') {
          throw new Error('You have reached your monthly token limit. Please upgrade your subscription to continue.')
        }
        if (data.code === 'USER_NOT_FOUND') {
          throw new Error('Please complete your registration by visiting your dashboard first.')
        }
        if (data.code === 'SUBSCRIPTION_REQUIRED') {
          throw new Error('An active subscription is required to use the chat feature.')
        }
        throw new Error(data.error || 'Failed to get response')
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, assistantMessage])
      
      // Show token usage info for free plan users
      if (data.tokensUsed && data.tokensRemaining !== undefined) {
        setTokenInfo({
          used: data.tokensUsed,
          remaining: data.tokensRemaining
        })
        console.log(`Tokens used: ${data.tokensUsed}, Remaining: ${data.tokensRemaining}`)
      }

    } catch (error: any) {
      console.error('Chat error:', error)
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: `Sorry, I encountered an error: ${error.message}`,
        timestamp: new Date(),
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  // Show loading while checking authentication
  if (!authChecked) {
    return (
      <div className="flex flex-col h-screen bg-gray-50">
        <header className="bg-white shadow-sm px-4 py-4">
          <div className="flex items-center">
            <Scale className="h-6 w-6 text-blue-600 mr-2" />
            <h1 className="text-lg font-semibold text-gray-900">Legal AI Assistant</h1>
          </div>
        </header>
        <div className="flex-1 flex items-center justify-center">
          <div className="flex items-center space-x-2">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-gray-600">Checking authentication...</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm px-4 py-4">
        <div className="flex items-center">
          <Link 
            href={`/${locale}/dashboard`}
            className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
          >
            <ArrowLeft className="w-5 h-5 mr-1" />
            Back
          </Link>
          <Scale className="h-6 w-6 text-blue-600 mr-2" />
          <h1 className="text-lg font-semibold text-gray-900">Legal AI Assistant</h1>
          
          {/* Token usage indicator for free plan users */}
          {tokenInfo && (
            <div className="ml-auto flex items-center space-x-2">
              <div className="flex items-center text-sm text-gray-600">
                <Zap className="w-4 h-4 mr-1 text-yellow-500" />
                <span>{tokenInfo.remaining.toLocaleString()} tokens remaining</span>
              </div>
              {tokenInfo.remaining < 1000 && (
                <div className="flex items-center text-orange-600">
                  <AlertTriangle className="w-4 h-4" />
                </div>
              )}
            </div>
          )}
        </div>
      </header>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="max-w-4xl mx-auto space-y-6">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <div
                className={`max-w-3xl px-4 py-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-900 shadow-sm border'
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {message.content}
                </p>
                <p
                  className={`text-xs mt-2 ${
                    message.role === 'user' ? 'text-blue-100' : 'text-gray-500'
                  }`}
                >
                  {formatTime(message.timestamp)}
                </p>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start">
              <div className="bg-white text-gray-900 shadow-sm border max-w-3xl px-4 py-3 rounded-lg">
                <div className="flex items-center">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input Form */}
      <div className="bg-white border-t px-4 py-4">
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex space-x-3">
            <div className="flex-1">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask me about local laws and regulations..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
                rows={1}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e)
                  }
                }}
                disabled={loading}
              />
            </div>
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Press Enter to send, Shift+Enter for new line
          </p>
        </form>
      </div>
    </div>
  )
}