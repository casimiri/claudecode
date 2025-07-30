import { NextRequest, NextResponse } from 'next/server'
import { supabaseAdmin } from '../../../../../lib/supabase'
import jwt from 'jsonwebtoken'

function verifyAdminToken(request: NextRequest) {
  const token = request.cookies.get('admin-token')?.value

  if (!token) {
    throw new Error('No admin token')
  }

  try {
    const decoded = jwt.verify(token, process.env.NEXTAUTH_SECRET!) as any
    if (decoded.role !== 'admin') {
      throw new Error('Invalid role')
    }
    return decoded
  } catch (error) {
    throw new Error('Invalid token')
  }
}

export async function GET(request: NextRequest) {
  try {
    const admin = verifyAdminToken(request)

    const [
      { count: totalUsers },
      { count: activeSubscriptions },
      { count: totalDocuments },
      { count: processedDocuments }
    ] = await Promise.all([
      supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('users').select('*', { count: 'exact', head: true }).eq('subscription_status', 'active'),
      supabaseAdmin.from('legal_documents').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('legal_documents').select('*', { count: 'exact', head: true }).eq('processed', true)
    ])

    const stats = {
      totalUsers: totalUsers || 0,
      activeSubscriptions: activeSubscriptions || 0,
      totalDocuments: totalDocuments || 0,
      processedDocuments: processedDocuments || 0,
    }

    return NextResponse.json({ stats })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Unauthorized' },
      { status: 401 }
    )
  }
}