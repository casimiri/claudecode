import { getSupabaseAdmin } from './supabase'

export interface TokenUsageStats {
  tokensUsed: number
  tokensLimit: number
  tokensRemaining: number
  usagePercentage: number
}

export interface TokenConsumptionResult {
  success: boolean
  tokensConsumed?: number
  tokensRemaining?: number
  error?: string
  needsUpgrade?: boolean
}

// Estimate tokens for different types of requests
export const estimateTokens = {
  shortQuestion: 500,    // Simple questions
  mediumQuestion: 1500,  // Complex questions
  longQuestion: 3000,    // Very detailed questions
  documentSearch: 2000,  // Document search queries
  chatMessage: (text: string) => Math.max(100, Math.ceil(text.length / 3)), // Rough estimation
}

/**
 * Get user's current token usage statistics with automatic period reset
 */
export async function getUserTokenStats(userId: string): Promise<TokenUsageStats | null> {
  try {
    const supabase = getSupabaseAdmin()
    
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('tokens_used_this_period, total_tokens_purchased, tokens_limit')
      .eq('id', userId)
      .single()

    if (userError || !userData) {
      console.error('❌ Error getting user data:', userError)
      return null
    }

    console.log(`📊 USER TOKEN DATA: User ${userId} - Used: ${userData.tokens_used_this_period || 0}, Total Purchased: ${userData.total_tokens_purchased || 0}, Tokens Limit: ${userData.tokens_limit || 0}`)

    const tokensUsed = userData.tokens_used_this_period || 0
    // Use total_tokens_purchased if available, otherwise fall back to tokens_limit
    const tokensLimit = userData.total_tokens_purchased || userData.tokens_limit || 0
    const tokensRemaining = Math.max(0, tokensLimit - tokensUsed)
    const usagePercentage = tokensLimit > 0 ? (tokensUsed / tokensLimit) * 100 : 0

    return {
      tokensUsed,
      tokensLimit,
      tokensRemaining,
      usagePercentage,
    }
  } catch (error) {
    console.error('Error in getUserTokenStats:', error)
    return null
  }
}

/**
 * Check if user can consume a certain number of tokens
 */
export async function canUserConsumeTokens(userId: string, tokensNeeded: number): Promise<boolean> {
  try {
    // First get current stats (which will auto-reset if needed)
    const stats = await getUserTokenStats(userId)
    if (!stats) {
      return false
    }

    // Check if user has enough tokens remaining
    return stats.tokensRemaining >= tokensNeeded
  } catch (error) {
    console.error('Error in canUserConsumeTokens:', error)
    return false
  }
}

/**
 * Consume tokens for a user action
 */
export async function consumeUserTokens(
  userId: string, 
  tokensToConsume: number, 
  actionType: string = 'chat',
  requestDetails: any = {}
): Promise<TokenConsumptionResult> {
  try {
    const supabase = getSupabaseAdmin()
    
    // First check if user can consume tokens (this will auto-reset if needed)
    const canConsume = await canUserConsumeTokens(userId, tokensToConsume)
    if (!canConsume) {
      const stats = await getUserTokenStats(userId)
      return {
        success: false,
        error: 'Insufficient tokens',
        needsUpgrade: true,
        tokensRemaining: stats?.tokensRemaining || 0,
      }
    }
    
    // Get current tokens used to calculate new value
    const { data: userData, error: fetchError } = await supabase
      .from('users')
      .select('tokens_used_this_period')
      .eq('id', userId)
      .single()

    if (fetchError) {
      console.error('Error fetching current token usage:', fetchError)
      return {
        success: false,
        error: 'Failed to fetch current usage',
      }
    }

    // Update the user's token usage
    const newTokensUsed = (userData.tokens_used_this_period || 0) + tokensToConsume
    console.log(`💰 TOKEN CONSUMPTION: User ${userId} - Current: ${userData.tokens_used_this_period || 0}, Consuming: ${tokensToConsume}, New Total: ${newTokensUsed}`)
    
    const { error: updateError } = await supabase
      .from('users')
      .update({
        tokens_used_this_period: newTokensUsed
      })
      .eq('id', userId)

    if (updateError) {
      console.error('❌ TOKEN UPDATE ERROR:', updateError)
    } else {
      console.log(`✅ TOKEN UPDATE SUCCESS: User ${userId} now has ${newTokensUsed} tokens used`)
    }

    if (updateError) {
      console.error('Error updating token usage:', updateError)
      return {
        success: false,
        error: 'Failed to update token usage',
      }
    }

    // Log the token usage
    const { error: logError } = await supabase
      .from('token_usage_logs')
      .insert({
        user_id: userId,
        tokens_used: tokensToConsume,
        action_type: actionType,
        request_details: requestDetails
      })

    if (logError) {
      console.error('Error logging token usage:', logError)
      // Continue even if logging fails
    }

    // Get updated stats after consumption
    const updatedStats = await getUserTokenStats(userId)
    
    return {
      success: true,
      tokensConsumed: tokensToConsume,
      tokensRemaining: updatedStats?.tokensRemaining || 0,
    }
  } catch (error) {
    console.error('Error in consumeUserTokens:', error)
    return {
      success: false,
      error: 'Internal error',
    }
  }
}

/**
 * Reset user's token period (admin function)
 */


/**
 * Get user's token usage history
 */
export async function getUserTokenHistory(
  userId: string, 
  limit: number = 50
): Promise<any[] | null> {
  try {
    const supabase = getSupabaseAdmin()
    const { data, error } = await supabase
      .from('token_usage_logs')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) {
      console.error('Error getting token history:', error)
      return null
    }

    return data || []
  } catch (error) {
    console.error('Error in getUserTokenHistory:', error)
    return null
  }
}

/**
 * Utility to format token usage for display
 */
export function formatTokenUsage(tokensUsed: number, tokensLimit: number): string {
  if (tokensLimit === 0) return '0 tokens'
  
  const percentage = Math.round((tokensUsed / tokensLimit) * 100)
  
  return `${tokensUsed.toLocaleString()} / ${tokensLimit.toLocaleString()} tokens used (${percentage}%)`
}

/**
 * Get the color for token usage display based on percentage
 */
export function getTokenUsageColor(percentage: number): string {
  if (percentage >= 90) return 'text-red-600'
  if (percentage >= 75) return 'text-orange-600'
  if (percentage >= 50) return 'text-yellow-600'
  return 'text-green-600'
}

