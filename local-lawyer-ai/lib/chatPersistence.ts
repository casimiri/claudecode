import { getSupabaseAdmin } from './supabase'

export interface ChatConversation {
  id: string
  title: string
  message_count: number
  last_message_at: string | null
  created_at: string
  updated_at: string
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  tokens_used: number
  sources_count: number
  metadata: Record<string, any>
  created_at: string
}

export interface CreateMessageData {
  role: 'user' | 'assistant'
  content: string
  tokens_used?: number
  sources_count?: number
  metadata?: Record<string, any>
}

// Get all conversations for a user
export async function getUserConversations(userId: string): Promise<ChatConversation[]> {
  try {
    const supabase = getSupabaseAdmin()
    
    const { data, error } = await supabase.rpc('get_user_conversations', {
      user_uuid: userId
    })

    if (error) {
      console.error('Error fetching user conversations:', error)
      throw new Error('Failed to fetch conversations')
    }

    return data || []
  } catch (error) {
    console.error('getUserConversations error:', error)
    throw error
  }
}

// Get messages for a specific conversation
export async function getConversationMessages(
  conversationId: string,
  userId: string
): Promise<ChatMessage[]> {
  try {
    console.log(`Getting messages for conversation ${conversationId} and user ${userId}`)
    const supabase = getSupabaseAdmin()
    
    // First, let's try a direct query to see if the issue is with the RPC function
    console.log('Attempting direct query first...')
    
    // Check if conversation exists and belongs to user
    const { data: conversation, error: convError } = await supabase
      .from('chat_conversations')
      .select('id, title, user_id')
      .eq('id', conversationId)
      .eq('user_id', userId)
      .single()
    
    if (convError) {
      console.error('Conversation verification error:', convError)
      throw new Error(`Conversation not found or access denied: ${convError.message}`)
    }
    
    console.log('Conversation found:', conversation)
    
    // Get messages directly from table
    const { data: messages, error: messagesError } = await supabase
      .from('chat_messages')
      .select('id, role, content, tokens_used, sources_count, metadata, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
    
    if (messagesError) {
      console.error('Messages query error:', messagesError)
      throw new Error(`Failed to fetch messages: ${messagesError.message}`)
    }
    
    console.log(`Successfully fetched ${messages?.length || 0} messages via direct query`)
    return messages || []
    
  } catch (error) {
    console.error('getConversationMessages error:', error)
    throw error
  }
}

// Clean up old conversations beyond the 20 limit
export async function cleanupOldConversations(userId: string): Promise<void> {
  try {
    const supabase = getSupabaseAdmin()
    
    // Get conversation count
    const { count, error: countError } = await supabase
      .from('chat_conversations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
    
    if (countError) {
      console.error('Error counting conversations:', countError)
      return
    }
    
    if (count && count > 20) {
      // Get oldest conversations to delete
      const { data: oldConversations, error: fetchError } = await supabase
        .from('chat_conversations')
        .select('id')
        .eq('user_id', userId)
        .order('updated_at', { ascending: true })
        .limit(count - 20)
      
      if (fetchError) {
        console.error('Error fetching old conversations:', fetchError)
        return
      }
      
      if (oldConversations && oldConversations.length > 0) {
        const idsToDelete = oldConversations.map(conv => conv.id)
        
        const { error: deleteError } = await supabase
          .from('chat_conversations')
          .delete()
          .in('id', idsToDelete)
        
        if (deleteError) {
          console.error('Error deleting old conversations:', deleteError)
        } else {
          console.log(`Cleaned up ${idsToDelete.length} old conversations`)
        }
      }
    }
  } catch (error) {
    console.error('cleanupOldConversations error:', error)
  }
}

// Create a new conversation (with automatic cleanup of old conversations beyond 20)
export async function createConversation(
  userId: string,
  title: string = 'New Conversation'
): Promise<string> {
  try {
    const supabase = getSupabaseAdmin()
    
    const { data, error } = await supabase.rpc('create_user_conversation', {
      user_uuid: userId,
      conversation_title: title
    })

    if (error) {
      console.error('Error creating conversation:', error)
      throw new Error('Failed to create conversation')
    }

    // Cleanup old conversations in the background
    cleanupOldConversations(userId).catch(err => {
      console.error('Background cleanup failed:', err)
    })

    return data
  } catch (error) {
    console.error('createConversation error:', error)
    throw error
  }
}

// Add a message to a conversation
export async function addMessageToConversation(
  conversationId: string,
  userId: string,
  messageData: CreateMessageData
): Promise<string> {
  try {
    const supabase = getSupabaseAdmin()
    
    const { data, error } = await supabase.rpc('add_message_to_conversation', {
      conversation_uuid: conversationId,
      user_uuid: userId,
      message_role: messageData.role,
      message_content: messageData.content,
      message_tokens_used: messageData.tokens_used || 0,
      message_sources_count: messageData.sources_count || 0,
      message_metadata: messageData.metadata || {}
    })

    if (error) {
      console.error('Error adding message to conversation:', error)
      throw new Error('Failed to add message to conversation')
    }

    return data
  } catch (error) {
    console.error('addMessageToConversation error:', error)
    throw error
  }
}

// Update conversation title
export async function updateConversationTitle(
  conversationId: string,
  userId: string,
  title: string
): Promise<void> {
  try {
    const supabase = getSupabaseAdmin()
    
    const { error } = await supabase
      .from('chat_conversations')
      .update({ title, updated_at: new Date().toISOString() })
      .eq('id', conversationId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error updating conversation title:', error)
      throw new Error('Failed to update conversation title')
    }
  } catch (error) {
    console.error('updateConversationTitle error:', error)
    throw error
  }
}

// Delete a conversation and all its messages
export async function deleteConversation(
  conversationId: string,
  userId: string
): Promise<void> {
  try {
    const supabase = getSupabaseAdmin()
    
    const { error } = await supabase
      .from('chat_conversations')
      .delete()
      .eq('id', conversationId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting conversation:', error)
      throw new Error('Failed to delete conversation')
    }
  } catch (error) {
    console.error('deleteConversation error:', error)
    throw error
  }
}

// Generate a conversation title from the first user message
export function generateConversationTitle(firstMessage: string): string {
  const maxLength = 50
  const words = firstMessage.trim().split(' ')
  
  // Take first few words that fit within maxLength
  let title = ''
  for (const word of words) {
    if ((title + ' ' + word).length <= maxLength) {
      title += (title ? ' ' : '') + word
    } else {
      break
    }
  }
  
  // Add ellipsis if truncated
  if (title.length < firstMessage.length) {
    title += '...'
  }
  
  return title || 'New Conversation'
}



// Save a complete chat exchange (user message + assistant response)
export async function saveChatExchange(
  conversationId: string,
  userId: string,
  userMessage: string,
  assistantResponse: string,
  tokensUsed: number,
  sourcesCount: number,
  responseMetadata: Record<string, any> = {}
): Promise<void> {
  try {
    // Save user message
    await addMessageToConversation(conversationId, userId, {
      role: 'user',
      content: userMessage,
      tokens_used: 0,
      sources_count: 0
    })

    // Save assistant response
    await addMessageToConversation(conversationId, userId, {
      role: 'assistant',
      content: assistantResponse,
      tokens_used: tokensUsed,
      sources_count: sourcesCount,
      metadata: responseMetadata
    })
  } catch (error) {
    console.error('saveChatExchange error:', error)
    throw error
  }
}