import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'

export async function POST() {
  try {
    console.log('Test auth endpoint called')
    
    const cookieStore = await cookies()
    const allCookies = cookieStore.getAll()
    console.log('Available cookies:', allCookies.map(c => ({ name: c.name, value: c.value.substring(0, 50) + '...' })))
    
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
    
    console.log('Auth result:', { user: user?.id, error: authError?.message })
    
    if (authError || !user) {
      return NextResponse.json(
        { 
          error: 'Unauthorized', 
          details: authError?.message || 'Auth session missing!',
          cookieCount: allCookies.length,
          hasSbCookies: allCookies.some(c => c.name.includes('sb-'))
        },
        { status: 401 }
      )
    }

    // Get user profile to check subscription
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('subscription_status, subscription_plan')
      .eq('id', user.id)
      .single()

    console.log('User data result:', { userData, userError })

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email
      },
      profile: userData,
      message: 'Authentication test successful'
    })

  } catch (error: any) {
    console.error('Test auth API error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}