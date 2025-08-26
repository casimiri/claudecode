import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createEmbedding, generateChatResponse } from '../../../../lib/openai'
import { estimateTokens, consumeUserTokens, canUserConsumeTokens } from '../../../../lib/tokenUsage'
import { createConversation, saveChatExchange, generateConversationTitle } from '../../../../lib/chatPersistence'

export async function POST(request: NextRequest) {
  try {
    console.log('CHAT API: Starting request processing');

    let message, conversationHistory, conversationId;
    try {
      const body = await request.json();
      console.log('CHAT API: Request body parsed:', body);
      ({ message, conversationHistory, conversationId } = body);
    } catch (error) {
      console.error('CHAT API: Error parsing request body:', error);
      return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
    }

    if (!message || typeof message !== 'string') {
      console.log('CHAT API: Message is missing or not a string');
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    console.log('CHAT API: Creating Supabase client');
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
    
    console.log('CHAT API: Getting user from Supabase');
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    console.log('Chat API auth result:', { 
      userId: user?.id, 
      userEmail: user?.email,
      authError: authError?.message,
      cookieCount: cookieStore.getAll().length 
    })
    
    if (authError || !user) {
      console.error('CHAT API: Auth failed:', authError);
      return NextResponse.json({ 
        error: 'Unauthorized', 
        details: authError?.message || 'No user found' 
      }, { status: 401 })
    }

    console.log(`CHAT API: User ${user.id} authenticated. Checking token balance.`);
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id')
      .eq('id', user.id)
      .single()

    console.log('User data query result:', { userData, userError, userId: user.id })

    if (userError || !userData) {
      console.error(`CHAT API: User ${user.id} not found in database:`, userError);
      return NextResponse.json({ 
        error: 'User profile not found. Please complete your registration.',
        code: 'USER_NOT_FOUND'
      }, { status: 404 })
    }

    console.log(`CHAT API: User ${user.id} found. Estimating tokens.`);
    const estimatedTokens = estimateTokens.chatMessage(message)
    
    console.log(`CHAT API: User ${user.id} checking token balance.`);
    const canConsume = await canUserConsumeTokens(user.id, estimatedTokens)
    
    if (!canConsume) {
      console.log(`CHAT API: User ${user.id} has insufficient tokens.`);
      return NextResponse.json({ 
        error: 'Insufficient tokens', 
        code: 'TOKEN_LIMIT_EXCEEDED',
        message: 'You have insufficient tokens to continue. Please purchase more tokens to use the service.'
      }, { status: 429 })
    }

    console.log(`CHAT API: Creating embedding for message.`);
    const embedding = await createEmbedding(message)

    console.log(`CHAT API: Searching for relevant document chunks.`);
    const { data: relevantChunks, error: searchError } = await supabase.rpc(
      'search_document_chunks',
      {
        query_embedding: embedding,
        match_threshold: 0.7,
        match_count: 5,
      }
    )

    if (searchError) {
      console.error('CHAT API: Error searching document chunks:', searchError)
    }

    const context = relevantChunks?.map((chunk: any) => chunk.content) || []
    console.log(`CHAT API: Found ${context.length} relevant chunks.`);

    // Extract unique sources for attribution
    const sources = relevantChunks?.map((chunk: any) => {
      // Try to get source info from the new fields (if migration applied)
      // Otherwise fall back to metadata (for backwards compatibility)
      const metadata = chunk.metadata || {}
      
      return {
        filename: chunk.filename || metadata.filename || 'Unknown Document',
        source_type: chunk.source_type || metadata.source_type || 'file',
        source_url: chunk.source_url || metadata.source_url,
        url_title: chunk.url_title || metadata.title,
        similarity: chunk.similarity,
        content_preview: chunk.content.substring(0, 100)
      }
    }) || []

    // Remove duplicate sources based on document_id or source_url
    const uniqueSources = sources.reduce((acc: any[], current: any) => {
      const isDuplicate = acc.some(item => 
        item.source_url === current.source_url || 
        (item.filename === current.filename && item.source_type === current.source_type)
      )
      if (!isDuplicate) {
        acc.push(current)
      }
      return acc
    }, [])

    console.log(`CHAT API: Generating chat response from OpenAI.`);
    const chatResponse = await generateChatResponse(
      message, 
      context, 
      conversationHistory || []
    )

    const actualTokensUsed = chatResponse.usage?.total_tokens || estimatedTokens
    console.log(`CHAT API: OpenAI response generated. Tokens used: ${actualTokensUsed}`);

    let currentConversationId = conversationId
    
    if (!currentConversationId) {
      console.log(`CHAT API: No conversation ID provided. Creating new conversation.`);
      const conversationTitle = generateConversationTitle(message)
      currentConversationId = await createConversation(user.id, conversationTitle)
      console.log(`CHAT API: Created new conversation with ID: ${currentConversationId}`);
    }

    console.log(`CHAT API: Saving chat exchange to database for conversation ${currentConversationId}.`);
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
          sources: uniqueSources
        }
      )
      console.log(`CHAT API: Chat exchange saved successfully.`);
    } catch (persistenceError) {
      console.error('CHAT API: Failed to save chat to database:', persistenceError)
    }

    console.log(`CHAT API: Consuming tokens for user ${user.id}.`);
    const tokenConsumption = await consumeUserTokens(
      user.id, 
      actualTokensUsed, 
      'chat',
      { 
        message: message.substring(0, 100),
        sources: relevantChunks?.length || 0,
        response_length: chatResponse.content.length,
        prompt_tokens: chatResponse.usage?.prompt_tokens || 0,
        completion_tokens: chatResponse.usage?.completion_tokens || 0,
        total_tokens: chatResponse.usage?.total_tokens || 0,
        conversation_id: currentConversationId
      }
    )
    
    if (!tokenConsumption.success) {
      console.error(`CHAT API: Failed to consume tokens for user ${user.id}:`, tokenConsumption.error)
    }

    console.log(`CHAT API: Returning response for user ${user.id}.`);
    return NextResponse.json({ 
      response: chatResponse.content,
      sources: uniqueSources,
      sourcesCount: uniqueSources.length,
      tokensUsed: actualTokensUsed,
      tokensRemaining: tokenConsumption.tokensRemaining,
      usage: chatResponse.usage,
      conversationId: currentConversationId
    })
  } catch (error: any) {
    console.error('CHAT API: Unhandled error in chat API:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}