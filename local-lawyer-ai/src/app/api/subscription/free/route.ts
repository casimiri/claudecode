import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
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
    
    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    // Check if user already exists in our users table
    const { data: existingUser, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (userError && userError.code !== 'PGRST116') { // PGRST116 = row not found
      console.error('Error checking existing user:', userError)
      return NextResponse.json(
        { error: 'Database error' },
        { status: 500 }
      )
    }

    // If user doesn't exist, create them with free plan
    if (!existingUser) {
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert([
          {
            id: user.id,
            email: user.email!,
            full_name: user.user_metadata?.full_name || user.user_metadata?.name || null,
            avatar_url: user.user_metadata?.avatar_url || user.user_metadata?.picture || null,
            provider: user.app_metadata?.provider || 'email',
            provider_id: user.user_metadata?.provider_id || user.id,
            subscription_status: 'active',
            subscription_plan: 'free',
            tokens_used_this_period: 0,
            tokens_limit: 10000, // 10k tokens for free plan
            period_start_date: new Date().toISOString(),
            period_end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
          }
        ])
        .select()
        .single()

      if (createError) {
        console.error('Error creating user:', createError)
        return NextResponse.json(
          { error: 'Failed to create user profile' },
          { status: 500 }
        )
      }

      return NextResponse.json({ 
        success: true, 
        message: 'Free subscription activated successfully!',
        user: newUser
      })
    }

    // If user exists but doesn't have free plan, update them to free
    if (existingUser.subscription_plan !== 'free' || existingUser.subscription_status !== 'active') {
      // When switching to free plan, only reset tokens if coming from a paid plan
      // and preserve current usage if already on free plan
      const shouldResetTokens = existingUser.subscription_plan !== 'free'
      
      const updateData: any = {
        subscription_status: 'active',
        subscription_plan: 'free',
        tokens_limit: 10000,
        subscription_start_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }

      // Only reset tokens and period if switching from a paid plan
      if (shouldResetTokens) {
        updateData.tokens_used_this_period = 0
        updateData.period_start_date = new Date().toISOString()
        updateData.period_end_date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        updateData.current_period_start = new Date().toISOString()
        updateData.current_period_end = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
        updateData.last_token_reset_date = new Date().toISOString()
      }

      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update(updateData)
        .eq('id', user.id)
        .select()
        .single()

      if (updateError) {
        console.error('Error updating user:', updateError)
        return NextResponse.json(
          { error: 'Failed to activate free subscription' },
          { status: 500 }
        )
      }

      return NextResponse.json({ 
        success: true, 
        message: shouldResetTokens 
          ? 'Free subscription activated with fresh token allocation!' 
          : 'Free subscription reactivated successfully!',
        user: updatedUser
      })
    }

    // User already has free plan
    return NextResponse.json({ 
      success: true, 
      message: 'You already have an active free subscription!',
      user: existingUser
    })

  } catch (error) {
    console.error('Free subscription error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}