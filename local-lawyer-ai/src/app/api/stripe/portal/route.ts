import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { createPortalSession } from '../../../../../lib/stripe'

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
    
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user record
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('stripe_customer_id, customer_id')
      .eq('id', user.id)
      .single()

    if (userError) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const customerId = userData?.stripe_customer_id || userData?.customer_id
    if (!customerId) {
      return NextResponse.json({ error: 'No customer found' }, { status: 404 })
    }

    // Extract locale from URL for proper redirect
    const urlParts = request.nextUrl.pathname.split('/')
    const locale = urlParts[1] || 'en'

    const portalSession = await createPortalSession({
      customerId: customerId,
      returnUrl: `${request.nextUrl.origin}/${locale}/subscription`,
    })

    return NextResponse.json({ url: portalSession.url })
  } catch (error: any) {
    console.error('Stripe portal error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}