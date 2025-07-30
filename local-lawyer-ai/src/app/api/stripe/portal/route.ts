import { NextRequest, NextResponse } from 'next/server'
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { cookies } from 'next/headers'
import { createPortalSession } from '../../../../../lib/stripe'

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies()
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore })
    
    const { data: { session }, error: sessionError } = await supabase.auth.getSession()
    
    if (sessionError || !session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user record
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('customer_id')
      .eq('id', session.user.id)
      .single()

    if (userError || !user?.customer_id) {
      return NextResponse.json({ error: 'No customer found' }, { status: 404 })
    }

    const portalSession = await createPortalSession({
      customerId: user.customer_id,
      returnUrl: `${request.nextUrl.origin}/dashboard`,
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