import { NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../../../lib/supabase'

export async function GET() {
  try {
    const supabase = getSupabaseAdmin()
    
    // Query users table to show token information
    const { data: users, error } = await supabase
      .from('users')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching users:', error)
      return NextResponse.json(
        { error: 'Failed to fetch users', details: error },
        { status: 500 }
      )
    }

    // Calculate available tokens for each user
    const usersWithTokens = users?.map(user => ({
      ...user,
      tokens_available: Math.max(0, (user.total_tokens_purchased || 0) - (user.tokens_used_this_period || 0))
    })) || []

    return NextResponse.json({
      success: true,
      users: usersWithTokens,
      totalUsers: usersWithTokens.length,
      summary: {
        totalTokensAllocated: usersWithTokens.reduce((sum, user) => sum + (user.total_tokens_purchased || 0), 0),
        totalTokensUsed: usersWithTokens.reduce((sum, user) => sum + (user.tokens_used_this_period || 0), 0),
        totalTokensAvailable: usersWithTokens.reduce((sum, user) => sum + user.tokens_available, 0)
      }
    })

  } catch (error) {
    console.error('Users API error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}