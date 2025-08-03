import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createEmbedding, generateChatResponse } from '../../../../lib/openai'
import { estimateTokens, consumeUserTokens, canUserConsumeTokens } from '../../../../lib/tokenUsage'
import { createConversation, saveChatExchange, generateConversationTitle } from '../../../../lib/chatPersistence'

export async function POST(request: NextRequest) {
  try {
    const { message, conversationHistory, conversationId } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const cookieStore = await cookies()
    
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value
          },
          set(name: string, value: string, options: any) {
            cookieStore.set({ name, value, ...options })
          },
          remove(name: string, options: any) {
            cookieStore.set({ name, value: '', ...options })
          },
        },
      }
    )
    
    // Get the current user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log('Chat API auth result:', { 
      userId: user?.id, 
      userEmail: user?.email,
      authError: authError?.message,
      cookieCount: cookieStore.getAll().length 
    })
    
    if (authError || !user) {
      console.log('Auth failed in chat API:', authError)
      return NextResponse.json({ 
        error: 'Unauthorized', 
        details: authError?.message || 'No user found' 
      }, { status: 401 })
    }

    // Check if user has active subscription
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('subscription_status, subscription_plan')
      .eq('id', user.id)
      .single()

    console.log('User data query result:', { userData, userError, userId: user.id })

    if (userError || !userData) {
      console.log('User not found or error:', userError)
      return NextResponse.json({ 
        error: 'User profile not found. Please complete your registration.',
        code: 'USER_NOT_FOUND'
      }, { status: 404 })
    }

    if (userData.subscription_status !== 'active') {
      console.log('User subscription not active:', userData.subscription_status)
      return NextResponse.json({ 
        error: 'Active subscription required',
        code: 'SUBSCRIPTION_REQUIRED'
      }, { status: 403 })
    }

    // Estimate tokens needed for this request
    const estimatedTokens = estimateTokens.chatMessage(message)
    
    // Check if user has enough tokens (only for free plan)
    if (userData.subscription_plan === 'free') {
      const canConsume = await canUserConsumeTokens(user.id, estimatedTokens)
      
      if (!canConsume) {
        return NextResponse.json({ 
          error: 'Token limit exceeded', 
          code: 'TOKEN_LIMIT_EXCEEDED',
          message: 'You have reached your monthly token limit. Please upgrade to continue using the service.'
        }, { status: 429 })
      }
    }

    // Create embedding for the user's message
    const embedding = await createEmbedding(message)

    // Search for relevant document chunks using vector similarity
    const { data: relevantChunks, error: searchError } = await supabase.rpc(
      'search_document_chunks',
      {
        query_embedding: embedding,
        match_threshold: 0.7,
        match_count: 5,
      }
    )

    if (searchError) {
      console.error('Error searching document chunks:', searchError)
      // Continue without context if search fails
    }

    // Extract context from relevant chunks
    const context = relevantChunks?.map((chunk: any) => chunk.content) || []

    // Generate response using OpenAI with conversation history
    const chatResponse = await generateChatResponse(
      message, 
      context, 
      conversationHistory || []
    )

    // Use actual tokens from OpenAI response instead of estimation
    const actualTokensUsed = chatResponse.usage?.total_tokens || estimatedTokens

    // Handle conversation persistence
    let currentConversationId = conversationId
    
    // Create new conversation if none provided (first message)
    if (!currentConversationId) {
      const conversationTitle = generateConversationTitle(message)
      currentConversationId = await createConversation(user.id, conversationTitle)
    }

    // Save the chat exchange to database
    try {
      await saveChatExchange(
        currentConversationId,
        user.id,
        message,
        chatResponse.content,
        actualTokensUsed,
        relevantChunks?.length || 0,
        {
          prompt_tokens: chatResponse.usage?.prompt_tokens || 0,
          completion_tokens: chatResponse.usage?.completion_tokens || 0,
          total_tokens: chatResponse.usage?.total_tokens || 0,
          sources: relevantChunks?.map((chunk: any) => ({
            similarity: chunk.similarity,
            content_preview: chunk.content.substring(0, 100)
          })) || []
        }
      )
    } catch (persistenceError) {
      console.error('Failed to save chat to database:', persistenceError)
      // Continue with response even if persistence fails
    }

    // Consume tokens for free plan users after successful response
    if (userData.subscription_plan === 'free') {
      const tokenConsumption = await consumeUserTokens(
        user.id, 
        actualTokensUsed, 
        'chat',
        { 
          message: message.substring(0, 100), // First 100 chars for logging
          sources: relevantChunks?.length || 0,
          response_length: chatResponse.content.length,
          prompt_tokens: chatResponse.usage?.prompt_tokens || 0,
          completion_tokens: chatResponse.usage?.completion_tokens || 0,
          total_tokens: chatResponse.usage?.total_tokens || 0,
          conversation_id: currentConversationId
        }
      )
      
      if (!tokenConsumption.success) {
        console.error('Failed to consume tokens after successful response:', tokenConsumption.error)
      }

      return NextResponse.json({ 
        response: chatResponse.content,
        sources: relevantChunks?.length || 0,
        tokensUsed: actualTokensUsed,
        tokensRemaining: tokenConsumption.tokensRemaining,
        usage: chatResponse.usage,
        conversationId: currentConversationId
      })
    }

    return NextResponse.json({ 
      response: chatResponse.content,
      sources: relevantChunks?.length || 0,
      usage: chatResponse.usage,
      conversationId: currentConversationId
    })
  } catch (error: any) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}