'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Scale, ArrowLeft, Loader2, Zap, AlertTriangle, MessageSquare, Plus, History, Wallet } from 'lucide-react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { getCurrentUser } from '../../../../lib/auth'
import { User } from '@supabase/supabase-js'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  tokens_used?: number
  sources_count?: number
}

interface Conversation {
  id: string
  title: string
  message_count: number
  last_message_at: string | null
  created_at: string
  updated_at: string
}

interface TokenStats {
  tokensRemaining: number
  totalTokensPurchased: number
}

export default function ChatPage() {
  const params = useParams()
  const locale = params?.locale as string
  
  const [messages, setMessages] = useState<Message[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [showConversations, setShowConversations] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [tokenStats, setTokenStats] = useState<TokenStats | null>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  // Fetch token stats
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

  // Load conversations for the user
  const loadConversations = async () => {
    try {
      const response = await fetch('/api/chat/conversations', {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        setConversations(data.conversations || [])
      }
    } catch (error) {
      console.error('Failed to load conversations:', error)
    }
  }

  // Load messages for a specific conversation
  const loadConversationMessages = async (conversationId: string) => {
    try {
      const response = await fetch(`/api/chat/conversations/${conversationId}`, {
        credentials: 'include'
      })
      
      if (response.ok) {
        const data = await response.json()
        const formattedMessages = data.messages.map((msg: any) => ({
          id: msg.id,
          role: msg.role,
          content: msg.content,
          timestamp: new Date(msg.created_at),
          tokens_used: msg.tokens_used,
          sources_count: msg.sources_count
        }))
        setMessages(formattedMessages)
      }
    } catch (error) {
      console.error('Failed to load conversation messages:', error)
    }
  }

  // Start a new conversation
  const startNewConversation = () => {
    setCurrentConversationId(null)
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: 'Hello! I\'m your AI legal assistant. I can help you with questions about local laws and regulations. What would you like to know?',
      timestamp: new Date(),
    }])
  }

  // Select a conversation
  const selectConversation = async (conversation: Conversation) => {
    setCurrentConversationId(conversation.id)
    await loadConversationMessages(conversation.id)
    setShowConversations(false)
  }

  useEffect(() => {
    // Check authentication status when component mounts
    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser()
        console.log('Chat page - Current user:', currentUser)
        setAuthChecked(true)
        
        if (!currentUser) {
          console.log('No user found, redirecting to login')
          window.location.href = `/${locale}/login`
          return
        }

        setUser(currentUser)
        
        // Load user's conversations and token stats
        await Promise.all([
          loadConversations(),
          fetchTokenStats()
        ])
        
        // Start with a new conversation
        startNewConversation()
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

      

      console.log('Making API call to /api/chat...')
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include', // Include cookies for authentication
        body: JSON.stringify({
          message: userMessage.content,
          conversationHistory: conversationHistory.slice(0, -1), // Exclude current message
          conversationId: currentConversationId
        }),
      })

      const data = await response.json()
      console.log('API response status:', response.status)
      console.log('API response data:', data)

      if (!response.ok) {
        if (data.code === 'TOKEN_LIMIT_EXCEEDED') {
          throw new Error('You have reached your token limit. Please purchase more tokens to continue.')
        }
        if (data.code === 'USER_NOT_FOUND') {
          throw new Error('Please complete your registration by visiting your dashboard first.')
        }
        if (data.code === 'TOKENS_REQUIRED') {
          throw new Error('Tokens are required to use the chat feature. Please purchase tokens to continue.')
        }
        throw new Error(data.error || 'Failed to get response')
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: data.response,
        timestamp: new Date(),
        tokens_used: data.tokensUsed,
        sources_count: data.sources
      }

      setMessages(prev => [...prev, assistantMessage])
      
      // Update current conversation ID if this was a new conversation
      if (data.conversationId && !currentConversationId) {
        setCurrentConversationId(data.conversationId)
        // Reload conversations to show the new one
        loadConversations()
      }
      
      // Refresh token stats to keep UI in sync
      if (data.tokensUsed && data.tokensRemaining !== undefined) {
        fetchTokenStats()
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
        <div className="flex items-center justify-between">
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
            
            {/* Conversation controls */}
            <div className="ml-4 flex items-center space-x-2">
              <button
                onClick={() => setShowConversations(!showConversations)}
                className="flex items-center px-3 py-1 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded hover:bg-gray-50"
              >
                <History className="w-4 h-4 mr-1" />
                History
              </button>
              <button
                onClick={startNewConversation}
                className="flex items-center px-3 py-1 text-sm text-white bg-blue-600 rounded hover:bg-blue-700"
              >
                <Plus className="w-4 h-4 mr-1" />
                New
              </button>
            </div>
          </div>
          
          {/* User info and token stats */}
          <div className="flex items-center space-x-4">
            {user && (
              <div className="bg-gray-50 rounded-lg px-4 py-2 shadow-sm border border-gray-200">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-blue-600">
                      {user.email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {user.user_metadata?.full_name || user.email}
                    </p>
                    <p className="text-xs text-gray-500">
                      {user.email}
                    </p>
                  </div>
                </div>
              </div>
            )}
            
            {tokenStats && (
              <div className="flex items-center space-x-3">
                <div className="bg-blue-50 rounded-lg px-4 py-2 shadow-sm border border-blue-200">
                  <div className="flex items-center space-x-2">
                    <Wallet className="w-4 h-4 text-blue-600" />
                    <div>
                      <p className="text-xs text-gray-500">Available</p>
                      <p className="text-sm font-semibold text-blue-900">
                        {(tokenStats.tokensRemaining || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
                <div className="bg-green-50 rounded-lg px-4 py-2 shadow-sm border border-green-200">
                  <div className="flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-green-600" />
                    <div>
                      <p className="text-xs text-gray-500">Total</p>
                      <p className="text-sm font-semibold text-green-900">
                        {(tokenStats.totalTokensPurchased || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Low token warning */}
                {tokenStats.tokensRemaining < 1000 && (
                  <div className="flex items-center text-orange-600">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Conversation Sidebar */}
      {showConversations && (
        <div className="bg-white border-b shadow-sm">
          <div className="max-w-4xl mx-auto px-4 py-4">
            <h3 className="text-sm font-medium text-gray-900 mb-3">Recent Conversations</h3>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {conversations.length === 0 ? (
                <p className="text-sm text-gray-500">No previous conversations</p>
              ) : (
                conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => selectConversation(conversation)}
                    className={`w-full text-left p-3 rounded-lg border hover:bg-gray-50 ${
                      currentConversationId === conversation.id 
                        ? 'bg-blue-50 border-blue-200' 
                        : 'border-gray-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {conversation.title}
                        </p>
                        <p className="text-xs text-gray-500">
                          {conversation.message_count} messages
                          {conversation.last_message_at && (
                            <span className="ml-2">
                              • {new Date(conversation.last_message_at).toLocaleDateString()}
                            </span>
                          )}
                        </p>
                      </div>
                      <MessageSquare className="w-4 h-4 text-gray-400 flex-shrink-0 ml-2" />
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}

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
                {message.role === 'assistant' ? (
                  <div className="text-sm leading-relaxed">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        // Custom styling for markdown elements
                        h1: (props) => <h1 className="text-lg font-bold mb-3 text-gray-900" {...props} />,
                        h2: (props) => <h2 className="text-base font-bold mb-2 text-gray-900" {...props} />,
                        h3: (props) => <h3 className="text-sm font-bold mb-2 text-gray-900" {...props} />,
                        p: (props) => <p className="mb-3 last:mb-0 text-gray-800" {...props} />,
                        ul: (props) => <ul className="list-disc list-outside ml-4 mb-3 space-y-1" {...props} />,
                        ol: (props) => <ol className="list-decimal list-outside ml-4 mb-3 space-y-1" {...props} />,
                        li: (props) => <li className="text-gray-800" {...props} />,
                        strong: (props) => <strong className="font-semibold text-gray-900" {...props} />,
                        em: (props) => <em className="italic text-gray-800" {...props} />,
                        code: (props) => <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono text-gray-800" {...props} />,
                        pre: (props) => <pre className="bg-gray-100 p-3 rounded mb-3 overflow-x-auto text-xs font-mono" {...props} />,
                        blockquote: (props) => <blockquote className="border-l-4 border-blue-300 pl-4 italic text-gray-700 mb-3 bg-blue-50 py-2" {...props} />,
                        hr: (props) => <hr className="border-gray-300 my-4" {...props} />,
                        a: (props) => <a className="text-blue-600 hover:text-blue-800 underline" {...props} />,
                        table: (props) => <table className="border-collapse border border-gray-300 mb-3 w-full text-xs" {...props} />,
                        th: (props) => <th className="border border-gray-300 px-2 py-1 bg-gray-100 font-semibold text-left" {...props} />,
                        td: (props) => <td className="border border-gray-300 px-2 py-1" {...props} />
                      }}
                    >
                      {message.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">
                    {message.content}
                  </p>
                )}
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