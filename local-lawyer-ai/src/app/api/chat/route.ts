import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createEmbedding, generateChatResponse } from '../../../../lib/openai'

export async function POST(request: NextRequest) {
  try {
    const { message } = await request.json()

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user has active subscription
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('subscription_status')
      .eq('id', session.user.id)
      .single()

    if (userError || !user || user.subscription_status !== 'active') {
      return NextResponse.json({ error: 'Active subscription required' }, { status: 403 })
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

    // Generate response using OpenAI
    const response = await generateChatResponse(message, context)

    return NextResponse.json({ 
      response,
      sources: relevantChunks?.length || 0
    })
  } catch (error: any) {
    console.error('Chat API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}