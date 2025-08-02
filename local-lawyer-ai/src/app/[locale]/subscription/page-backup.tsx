'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Check, Loader2, CreditCard, Calendar, Zap, AlertCircle, TrendingUp } from 'lucide-react'
import toast from 'react-hot-toast'
import { getCurrentUser } from '../../../../lib/auth'
import { supabase } from '../../../../lib/supabase'
import SubscriptionDebug from './debug'

interface TokenStats {
  tokens_used: number
  tokens_limit: number
  tokens_remaining: number
  period_start: string
  period_end: string
  plan_type: string
  usage_percentage: number
}

interface SubscriptionData {
  subscription_plan: string
  subscription_status: string
  tokens_used_this_period: number
  tokens_limit: number
  period_start_date: string
  period_end_date: string
}

export default function SubscriptionPage() {
  const params = useParams()
  const debugMode = params.debug === 'true' || new URLSearchParams(window.location.search).get('debug') === 'true'
  
  if (debugMode) {
    return <SubscriptionDebug />
  }

  // Original component code continues here but simplified for now
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-2xl font-bold mb-4">Subscription Management</h1>
        <p className="mb-4">This page is temporarily in debug mode.</p>
        <a 
          href="?debug=true" 
          className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Enable Debug Mode
        </a>
      </div>
    </div>
  )
}