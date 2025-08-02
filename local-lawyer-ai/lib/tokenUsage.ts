import { supabase } from './supabase'

export interface TokenUsageStats {
  tokensUsed: number
  tokensLimit: number
  tokensRemaining: number
  periodStart: string
  periodEnd: string
  planType: string
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
 * Get user's current token usage statistics
 */
export async function getUserTokenStats(userId: string): Promise<TokenUsageStats | null> {
  try {
    const { data, error } = await supabase
      .rpc('get_user_token_stats', { user_uuid: userId })

    if (error) {
      console.error('Error getting user token stats:', error)
      return null
    }

    if (!data || data.length === 0) {
      return null
    }

    const stats = data[0]
    return {
      tokensUsed: stats.tokens_used || 0,
      tokensLimit: stats.tokens_limit || 0,
      tokensRemaining: stats.tokens_remaining || 0,
      periodStart: stats.period_start,
      periodEnd: stats.period_end,
      planType: stats.plan_type || 'free',
      usagePercentage: stats.usage_percentage || 0,
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
    const { data, error } = await supabase
      .rpc('can_user_consume_tokens', { 
        user_uuid: userId, 
        tokens_needed: tokensNeeded 
      })

    if (error) {
      console.error('Error checking token consumption:', error)
      return false
    }

    return data === true
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
    const { data, error } = await supabase
      .rpc('consume_user_tokens', {
        user_uuid: userId,
        tokens_to_consume: tokensToConsume,
        action_type: actionType,
        request_details: requestDetails
      })

    if (error) {
      console.error('Error consuming tokens:', error)
      return {
        success: false,
        error: 'Failed to consume tokens',
      }
    }

    if (data === false) {
      // User doesn't have enough tokens
      const stats = await getUserTokenStats(userId)
      return {
        success: false,
        error: 'Insufficient tokens',
        needsUpgrade: true,
        tokensRemaining: stats?.tokensRemaining || 0,
      }
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
export async function resetUserTokenPeriod(userId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .rpc('reset_user_token_period', { user_uuid: userId })

    if (error) {
      console.error('Error resetting token period:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('Error in resetUserTokenPeriod:', error)
    return false
  }
}

/**
 * Get user's token usage history
 */
export async function getUserTokenHistory(
  userId: string, 
  limit: number = 50
): Promise<any[] | null> {
  try {
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
  
  const remaining = tokensLimit - tokensUsed
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

/**
 * Calculate days remaining in current period
 */
export function getDaysRemainingInPeriod(periodEnd: string): number {
  const endDate = new Date(periodEnd)
  const now = new Date()
  const diffTime = endDate.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
  return Math.max(0, diffDays)
}