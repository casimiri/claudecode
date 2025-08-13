'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import { useTranslations } from 'next-intl'
import { Send, Scale, ArrowLeft, Loader2, Zap, AlertTriangle, MessageSquare, Plus, Wallet, Menu, X, CreditCard, LogOut, ChevronDown, Settings, User as UserIcon } from 'lucide-react'
import Link from 'next/link'
import { useParams, useSearchParams } from 'next/navigation'
import { getCurrentUser, signOut } from '../../../../lib/auth'
import { User } from '@supabase/supabase-js'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import LanguageSwitcher from '../../../components/LanguageSwitcher'
import ThemeToggle from '../../../components/ThemeToggle'
import { useTheme } from '../../../contexts/ThemeContext'

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
  const searchParams = useSearchParams()
  const locale = params?.locale as string
  const t = useTranslations()
  
  const [messages, setMessages] = useState<Message[]>([])
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null)
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [authChecked, setAuthChecked] = useState(false)
  const [showSidebar, setShowSidebar] = useState(false) // Start hidden, will be set based on screen size
  const [loadingConversation, setLoadingConversation] = useState(false)
  const [user, setUser] = useState<User | null>(null)
  const [tokenStats, setTokenStats] = useState<TokenStats | null>(null)
  const { theme } = useTheme()
  const darkMode = theme === 'dark'
  const [showScrollToBottom, setShowScrollToBottom] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const messagesContainerRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const userMenuRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleSignOut = async () => {
    try {
      await signOut()
      window.location.href = '/'
    } catch {
      // Silent error handling - user will see if sign out failed
    }
  }


  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    const container = messagesContainerRef.current
    if (container) {
      const handleScrollEvent = () => {
        const { scrollTop, scrollHeight, clientHeight } = container
        const isAtBottom = scrollHeight - scrollTop - clientHeight < 100
        setShowScrollToBottom(!isAtBottom && messages.length > 3)
      }
      
      container.addEventListener('scroll', handleScrollEvent)
      return () => container.removeEventListener('scroll', handleScrollEvent)
    }
  }, [messages])

  // Auto-resize textarea
  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current
    if (textarea) {
      textarea.style.height = 'auto'
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px'
    }
  }

  useEffect(() => {
    adjustTextareaHeight()
  }, [input])

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
    setLoadingConversation(true)
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
      } else {
        console.error('Failed to load conversation:', response.statusText)
        // Show error message to user
        setMessages([{
          id: 'error',
          role: 'assistant',
          content: 'Sorry, I couldn\'t load this conversation. Please try again.',
          timestamp: new Date(),
        }])
      }
    } catch (error) {
      console.error('Failed to load conversation messages:', error)
      // Show error message to user
      setMessages([{
        id: 'error',
        role: 'assistant',
        content: 'Sorry, I encountered an error loading this conversation. Please try again.',
        timestamp: new Date(),
      }])
    } finally {
      setLoadingConversation(false)
    }
  }

  // Start a new conversation
  const startNewConversation = useCallback(() => {
    setCurrentConversationId(null)
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      content: t('chat.welcomeMessage'),
      timestamp: new Date(),
    }])
  }, [t])

  // Select a conversation
  const selectConversation = async (conversation: Conversation) => {
    setCurrentConversationId(conversation.id)
    await loadConversationMessages(conversation.id)
    // Sidebar remains open in desktop, auto-close on mobile
    if (window.innerWidth < 768) {
      setShowSidebar(false)
    }
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
        
        // Check if there's a conversation ID in the URL parameters
        const conversationId = searchParams?.get('conversation')
        if (conversationId) {
          // Load the specific conversation
          setCurrentConversationId(conversationId)
          await loadConversationMessages(conversationId)
        } else {
          // Start with a new conversation
          startNewConversation()
        }
      } catch (error) {
        console.error('Auth check error:', error)
        setAuthChecked(true)
        // Redirect to login on auth error
        window.location.href = `/${locale}/login`
      }
    }
    
    checkAuth()
  }, [locale, searchParams, startNewConversation])

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setUserMenuOpen(false)
      }
    }
    
    if (userMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [userMenuOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return
    
    // Check if user has sufficient tokens
    if (tokenStats && tokenStats.tokensRemaining < 100) {
      return // Prevent submission if tokens are too low
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    }

    const currentMessages = [...messages, userMessage]
    setMessages(currentMessages)
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



  // Initialize sidebar visibility based on screen size
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) { // md breakpoint
        setShowSidebar(true)
      } else {
        setShowSidebar(false)
      }
    }
    
    // Set initial state
    handleResize()
    
    // Listen for resize events
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Removed: toggleDarkMode - using new theme system

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

  const themeClass = darkMode ? 'dark bg-gray-900' : 'bg-gray-50'
  const headerClass = darkMode ? 'bg-gray-800 shadow-sm' : 'bg-white shadow-sm'
  const textClass = darkMode ? 'text-white' : 'text-gray-900'

  return (
    <div className={`flex h-screen ${themeClass} relative`}>
      {/* Mobile backdrop */}
      {showSidebar && (
        <div 
          className="md:hidden fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={() => setShowSidebar(false)}
        />
      )}
      {/* Left Sidebar */}
      <div className={`${showSidebar ? 'w-80' : 'w-0'} md:relative absolute md:translate-x-0 ${showSidebar ? 'translate-x-0' : '-translate-x-full'} transition-all duration-300 overflow-hidden flex-shrink-0 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'} border-r z-50 h-full`}>
        <div className="flex flex-col h-full">
          {/* Sidebar Header */}
          <div className={`p-4 border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-sm font-semibold ${textClass}`}>{t('chat.chatHistory')}</h2>
              <button
                onClick={() => setShowSidebar(false)}
                className={`md:hidden p-1 rounded hover:bg-gray-100 ${darkMode ? 'hover:bg-gray-700' : ''}`}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <button
              onClick={startNewConversation}
              className="w-full flex items-center justify-center px-3 py-2 text-sm text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              {t('chat.newChat')}
            </button>
          </div>
          
          {/* Conversations List */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="space-y-2">
              {conversations.length === 0 ? (
                <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('chat.noConversations')}</p>
              ) : (
                conversations.map((conversation) => (
                  <button
                    key={conversation.id}
                    onClick={() => selectConversation(conversation)}
                    className={`w-full text-left p-3 rounded-lg transition-colors ${
                      currentConversationId === conversation.id 
                        ? 'bg-blue-50 border border-blue-200 text-blue-900' 
                        : darkMode 
                          ? 'hover:bg-gray-700 text-gray-300 hover:text-gray-100' 
                          : 'hover:bg-gray-50 text-gray-700 hover:text-gray-900'
                    }`}
                  >
                    <div className="flex items-start">
                      <MessageSquare className={`w-4 h-4 flex-shrink-0 mt-0.5 mr-2 ${darkMode ? 'text-gray-400' : 'text-gray-400'}`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {conversation.title}
                        </p>
                        <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-500'}`}>
                          {conversation.message_count} {t('chat.messages')}
                          {conversation.last_message_at && (
                            <span className="block">
                              {new Date(conversation.last_message_at).toLocaleDateString()}
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main Chat Area */}
      <div className="flex flex-col flex-1 min-w-0">
        {/* Header */}
        <header className={headerClass + ' px-4 py-4'}>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              {!showSidebar && (
                <button
                  onClick={() => setShowSidebar(true)}
                  className={`mr-3 p-1 rounded hover:bg-gray-100 ${
                    darkMode ? 'hover:bg-gray-700 text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Menu className="w-5 h-5" />
                </button>
              )}
              <Link 
                href={`/${locale}/dashboard`}
                className={`flex items-center mr-4 ${
                  darkMode ? 'text-gray-400 hover:text-gray-200' : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <ArrowLeft className="w-5 h-5 mr-1" />
                {t('common.back')}
              </Link>
              <Scale className="h-6 w-6 text-blue-600 mr-2" />
              <h1 className={`text-lg font-semibold ${textClass}`}>{t('chat.title')}</h1>
              
              {/* Theme Toggle */}
              <div className="ml-4">
                <ThemeToggle />
              </div>
              
              {/* Language Switcher */}
              <div className="ml-4">
                <LanguageSwitcher />
              </div>
            </div>
          
          {/* User info and token stats */}
          <div className="flex items-center space-x-4">
            {user && (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className={`bg-gray-50 rounded-lg px-4 py-2 shadow-sm border transition-colors hover:bg-gray-100 ${
                    darkMode ? 'bg-gray-700 border-gray-600 hover:bg-gray-600' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-medium text-blue-600">
                        {user.email?.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <div className="text-left">
                      <p className={`text-sm font-medium ${textClass}`}>
                        {user.user_metadata?.full_name || user.email}
                      </p>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {user.email}
                      </p>
                    </div>
                    <ChevronDown className={`w-4 h-4 transition-transform ${userMenuOpen ? 'rotate-180' : ''} ${
                      darkMode ? 'text-gray-400' : 'text-gray-600'
                    }`} />
                  </div>
                </button>
                
                {userMenuOpen && (
                  <div className={`absolute right-0 top-full mt-2 w-56 rounded-md shadow-lg py-1 z-50 border ${
                    darkMode 
                      ? 'bg-gray-800 border-gray-600' 
                      : 'bg-white border-gray-200'
                  }`}>
                    <div className={`px-4 py-3 border-b ${darkMode ? 'border-gray-600' : 'border-gray-100'}`}>
                      <div className={`text-sm font-medium ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        {user.user_metadata?.full_name || 'User'}
                      </div>
                      <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                        {user.email}
                      </div>
                      <div className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                        {t('dashboard.memberSince')} {new Date(user.created_at).toLocaleDateString('en-US', {
                          year: 'numeric',
                          month: 'short'
                        })}
                      </div>
                    </div>
                    <Link
                      href={`/${locale}/dashboard/profile`}
                      className={`flex items-center px-4 py-2 text-sm transition-colors ${
                        darkMode 
                          ? 'text-gray-300 hover:bg-gray-700' 
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Settings className="w-4 h-4 mr-2" />
                      {t('navigation.accountSettings')}
                    </Link>
                    <button
                      onClick={() => {
                        setUserMenuOpen(false)
                        handleSignOut()
                      }}
                      className={`flex items-center w-full px-4 py-2 text-sm transition-colors ${
                        darkMode 
                          ? 'text-gray-300 hover:bg-gray-700' 
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      {t('auth.signOut')}
                    </button>
                  </div>
                )}
              </div>
            )}
            
            {tokenStats && (
              <div className="flex items-center space-x-3">
                <div className={`rounded-lg px-4 py-2 shadow-sm border ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600' 
                    : 'bg-blue-50 border-blue-200'
                }`}>
                  <div className="flex items-center space-x-2">
                    <Wallet className="w-4 h-4 text-blue-600" />
                    <div>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>{t('chat.available')}</p>
                      <p className={`text-sm font-semibold ${
                        darkMode ? 'text-blue-400' : 'text-blue-900'
                      }`}>
                        {(tokenStats.tokensRemaining || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
                <div className={`rounded-lg px-4 py-2 shadow-sm border ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600' 
                    : 'bg-green-50 border-green-200'
                }`}>
                  <div className="flex items-center space-x-2">
                    <Zap className="w-4 h-4 text-green-600" />
                    <div>
                      <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>Total</p>
                      <p className={`text-sm font-semibold ${
                        darkMode ? 'text-green-400' : 'text-green-900'
                      }`}>
                        {(tokenStats.totalTokensPurchased || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Buy Tokens Button */}
                <Link 
                  href={`/${locale}/buy-tokens`}
                  className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                    tokenStats.tokensRemaining < 1000
                      ? 'bg-orange-600 hover:bg-orange-700 text-white' 
                      : darkMode
                        ? 'bg-blue-600 hover:bg-blue-700 text-white'
                        : 'bg-blue-600 hover:bg-blue-700 text-white'
                  }`}
                >
                  <CreditCard className="w-4 h-4 mr-2" />
                  {t('tokens.buyTokens')}
                </Link>
                
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

        {/* Messages */}
        <div 
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto px-4 py-6 relative"
        >
          <div className="max-w-4xl mx-auto space-y-6">
          {loadingConversation ? (
            <div className="flex justify-start">
              <div className={`max-w-3xl px-4 py-3 rounded-lg shadow-sm border ${
                darkMode ? 'bg-gray-800 text-gray-100 border-gray-700' : 'bg-white text-gray-900'
              }`}>
                <div className="flex items-center">
                  <Loader2 className="w-4 h-4 animate-spin mr-2 text-blue-600" />
                  <span className="text-sm">Loading conversation...</span>
                </div>
              </div>
            </div>
          ) : (
            messages.map((message) => (
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
                    : darkMode
                      ? 'bg-gray-800 text-gray-100 shadow-sm border border-gray-700'
                      : 'bg-white text-gray-900 shadow-sm border'
                }`}
              >
                {message.role === 'assistant' ? (
                  <div className="text-sm leading-relaxed">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        // Custom styling for markdown elements
                        h1: (props) => <h1 className={`text-lg font-bold mb-3 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`} {...props} />,
                        h2: (props) => <h2 className={`text-base font-bold mb-2 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`} {...props} />,
                        h3: (props) => <h3 className={`text-sm font-bold mb-2 ${darkMode ? 'text-gray-100' : 'text-gray-900'}`} {...props} />,
                        p: (props) => <p className={`mb-3 last:mb-0 ${darkMode ? 'text-gray-200' : 'text-gray-800'}`} {...props} />,
                        ul: (props) => <ul className="list-disc list-outside ml-4 mb-3 space-y-1" {...props} />,
                        ol: (props) => <ol className="list-decimal list-outside ml-4 mb-3 space-y-1" {...props} />,
                        li: (props) => <li className={darkMode ? 'text-gray-200' : 'text-gray-800'} {...props} />,
                        strong: (props) => <strong className={`font-semibold ${darkMode ? 'text-gray-100' : 'text-gray-900'}`} {...props} />,
                        em: (props) => <em className={`italic ${darkMode ? 'text-gray-200' : 'text-gray-800'}`} {...props} />,
                        code: (props) => <code className={`px-1.5 py-0.5 rounded text-xs font-mono ${darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-100 text-gray-800'}`} {...props} />,
                        pre: (props) => <pre className={`p-3 rounded mb-3 overflow-x-auto text-xs font-mono ${darkMode ? 'bg-gray-700' : 'bg-gray-100'}`} {...props} />,
                        blockquote: (props) => <blockquote className={`border-l-4 border-blue-300 pl-4 italic mb-3 py-2 ${darkMode ? 'text-gray-300 bg-gray-700' : 'text-gray-700 bg-blue-50'}`} {...props} />,
                        hr: (props) => <hr className={`my-4 ${darkMode ? 'border-gray-600' : 'border-gray-300'}`} {...props} />,
                        a: (props) => <a className="text-blue-600 hover:text-blue-800 underline" {...props} />,
                        table: (props) => <table className={`border-collapse border mb-3 w-full text-xs ${darkMode ? 'border-gray-600' : 'border-gray-300'}`} {...props} />,
                        th: (props) => <th className={`border px-2 py-1 font-semibold text-left ${darkMode ? 'border-gray-600 bg-gray-700' : 'border-gray-300 bg-gray-100'}`} {...props} />,
                        td: (props) => <td className={`border px-2 py-1 ${darkMode ? 'border-gray-600' : 'border-gray-300'}`} {...props} />
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
          )))}
          
          {loading && (
            <div className="flex justify-start">
              <div className={`max-w-3xl px-4 py-3 rounded-lg shadow-sm border ${
                darkMode ? 'bg-gray-800 text-gray-100 border-gray-700' : 'bg-white text-gray-900'
              }`}>
                <div className="flex items-center">
                  <Loader2 className="w-4 h-4 animate-spin mr-2 text-blue-600" />
                  <span className="text-sm">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Low Token Warning */}
        {tokenStats && tokenStats.tokensRemaining < 100 && (
          <div className={`border-t px-4 py-3 ${darkMode ? 'bg-amber-900 border-amber-700' : 'bg-amber-50 border-amber-200'}`}>
            <div className="max-w-4xl mx-auto flex items-center justify-between">
              <div className="flex items-center">
                <AlertTriangle className="w-5 h-5 text-amber-600 mr-2" />
                <div>
                  <p className={`text-sm font-medium ${darkMode ? 'text-amber-200' : 'text-amber-800'}`}>
                    {t('chat.insufficientTokens')}
                  </p>
                  <p className={`text-xs ${darkMode ? 'text-amber-300' : 'text-amber-600'}`}>
                    {t('chat.minimumTokensRequired')}
                  </p>
                </div>
              </div>
              <Link
                href={`/${locale}/buy-tokens`}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors"
              >
                <CreditCard className="w-4 h-4 mr-2" />
                {t('chat.buyTokensToChat')}
              </Link>
            </div>
          </div>
        )}

        {/* Input Form */}
        <div className={`border-t px-4 py-4 ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white'}`}>
        <form onSubmit={handleSubmit} className="max-w-4xl mx-auto">
          <div className="flex space-x-3">
            <div className="flex-1">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  const value = e.target.value
                  if (value.length <= 2000) {
                    setInput(value)
                  }
                }}
                placeholder={t('chat.inputPlaceholder')}
                aria-label="Chat message input"
                className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all ${
                  darkMode 
                    ? 'bg-gray-700 border-gray-600 text-gray-100 placeholder-gray-400' 
                    : 'border-gray-300'
                }`}
                rows={1}
                style={{ minHeight: '48px', maxHeight: '120px' }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e)
                  }
                }}
                disabled={loading || (tokenStats?.tokensRemaining ?? 0) < 100}
              />
              <div className="flex justify-between items-center mt-2">
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {t('chat.enterToSend')}
                </p>
                <p className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                  {t('chat.characterCount', { current: input.length, max: 2000 })}
                </p>
              </div>
            </div>
            <button
              type="submit"
              disabled={!input.trim() || loading || (tokenStats?.tokensRemaining ?? 0) < 100}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center transition-all transform hover:scale-105 disabled:hover:scale-100"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
        </div>
        
        {/* Floating Scroll to Bottom Button */}
        {showScrollToBottom && (
          <button
            onClick={scrollToBottom}
            className="fixed bottom-24 right-8 p-3 bg-blue-600 text-white rounded-full shadow-lg hover:bg-blue-700 transition-all transform hover:scale-105 z-10"
            title="Scroll to bottom"
          >
            <ArrowLeft className="w-4 h-4 transform -rotate-90" />
          </button>
        )}
      </div>
    </div>
  )
}