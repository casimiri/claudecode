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
  } catch {
    throw new Error('Invalid token')
  }
}

export async function GET(request: NextRequest) {
  try {
    verifyAdminToken(request)

    const [
      { count: totalUsers },
      { count: totalDocuments },
      { count: processedDocuments }
    ] = await Promise.all([
      supabaseAdmin.from('users').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('legal_documents').select('*', { count: 'exact', head: true }),
      supabaseAdmin.from('legal_documents').select('*', { count: 'exact', head: true }).eq('processed', true)
    ])

    // Get token usage stats
    const { data: tokenStats } = await supabaseAdmin
      .from('users')
      .select('total_tokens_purchased, tokens_used_this_period, tokens_limit')

    const totalTokensSold = tokenStats?.reduce((sum: number, user: any) => sum + ((user.total_tokens_purchased || user.tokens_limit) || 0), 0) || 0
    const totalTokensUsed = tokenStats?.reduce((sum: number, user: any) => sum + (user.tokens_used_this_period || 0), 0) || 0
    const usersWithTokens = tokenStats?.filter((user: any) => ((user.total_tokens_purchased || user.tokens_limit) || 0) > 0).length || 0

    const stats = {
      totalUsers: totalUsers || 0,
      usersWithTokens: usersWithTokens,
      totalTokensSold: totalTokensSold,
      totalTokensUsed: totalTokensUsed,
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