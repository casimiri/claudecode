import { NextRequest, NextResponse } from 'next/server'
import { getSupabaseAdmin } from '../../../../../lib/supabase'

export async function POST(request: NextRequest) {
  try {
    // This endpoint can be called by cron jobs or admin processes
    // For security, we could add an API key check here
    const authHeader = request.headers.get('authorization')
    const expectedToken = process.env.CRON_SECRET_TOKEN
    
    if (expectedToken && authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = getSupabaseAdmin()
    
    // Get all active users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, subscription_plan')
      .eq('subscription_status', 'active')
    
    if (usersError) {
      console.error('Error fetching users:', usersError)
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      )
    }
    
    const resetResults = []
    let successfulResets = 0
    
    // Process each user individually
    for (const user of users || []) {
      try {
        const { data: resetData, error: resetError } = await supabase
          .rpc('reset_user_tokens_if_needed', { user_uuid: user.id })
        
        const wasReset = !resetError && resetData === true
        if (wasReset) {
          successfulResets++
        }
        
        resetResults.push({
          user_id: user.id,
          email: user.email,
          plan_type: user.subscription_plan,
          was_reset: wasReset,
          error: resetError?.message
        })
      } catch (err: any) {
        resetResults.push({
          user_id: user.id,
          email: user.email,
          plan_type: user.subscription_plan,
          was_reset: false,
          error: err.message
        })
      }
    }
    
    return NextResponse.json({ 
      success: true,
      message: `Reset token periods for ${successfulResets} users out of ${users?.length || 0}`,
      resetCount: successfulResets,
      totalUsers: users?.length || 0,
      resetUsers: resetResults.filter(r => r.was_reset)
    })
  } catch (error: any) {
    console.error('Reset periods error:', error)
    return NextResponse.json(
      { error: 'Failed to reset token periods' },
      { status: 500 }
    )
  }
}

// Also allow manual trigger for testing (remove in production)
export async function GET(request: NextRequest) {
  try {
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json({ error: 'Not available in production' }, { status: 403 })
    }

    // Use the same logic as POST but without auth check
    const supabase = getSupabaseAdmin()
    
    // Get all active users
    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, email, subscription_plan')
      .eq('subscription_status', 'active')
    
    if (usersError) {
      console.error('Error fetching users:', usersError)
      return NextResponse.json(
        { error: 'Failed to fetch users' },
        { status: 500 }
      )
    }
    
    const resetResults = []
    let successfulResets = 0
    
    // Process each user individually
    for (const user of users || []) {
      try {
        const { data: resetData, error: resetError } = await supabase
          .rpc('reset_user_tokens_if_needed', { user_uuid: user.id })
        
        const wasReset = !resetError && resetData === true
        if (wasReset) {
          successfulResets++
        }
        
        resetResults.push({
          user_id: user.id,
          email: user.email,
          plan_type: user.subscription_plan,
          was_reset: wasReset,
          error: resetError?.message
        })
      } catch (err: any) {
        resetResults.push({
          user_id: user.id,
          email: user.email,
          plan_type: user.subscription_plan,
          was_reset: false,
          error: err.message
        })
      }
    }
    
    return NextResponse.json({ 
      success: true,
      message: `Reset token periods for ${successfulResets} users out of ${users?.length || 0}`,
      resetCount: successfulResets,
      totalUsers: users?.length || 0,
      resetUsers: resetResults.filter(r => r.was_reset),
      allResults: resetResults
    })
  } catch (error: any) {
    console.error('Reset periods error:', error)
    return NextResponse.json(
      { error: 'Failed to reset token periods' },
      { status: 500 }
    )
  }
}