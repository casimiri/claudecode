'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getCurrentUser, getSession } from '../../../../lib/auth'
import { supabase } from '../../../../lib/supabase'

export default function SubscriptionDebug() {
  const params = useParams()
  const router = useRouter()
  const locale = params.locale as string
  
  const [authState, setAuthState] = useState<any>({
    loading: true,
    user: null,
    session: null,
    error: null
  })

  useEffect(() => {
    const testAuth = async () => {
      try {
        console.log('Testing auth...')
        
        // Test 1: Get current user
        const user = await getCurrentUser()
        console.log('getCurrentUser result:', user)
        
        // Test 2: Get session
        const session = await getSession()
        console.log('getSession result:', session)
        
        // Test 3: Direct Supabase call
        const { data: directUser, error: directError } = await supabase.auth.getUser()
        console.log('Direct supabase.auth.getUser:', { directUser, directError })
        
        // Test 4: Try to query users table if we have a user
        if (user) {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', user.id)
            .single()
          console.log('Users table query:', { userData, userError })
        }
        
        setAuthState({
          loading: false,
          user,
          session,
          directUser: directUser.user,
          directError,
          error: null
        })
        
      } catch (error) {
        console.error('Auth test error:', error)
        setAuthState({
          loading: false,
          user: null,
          session: null,
          error: error
        })
      }
    }

    testAuth()
  }, [])

  if (authState.loading) {
    return <div className="p-8">Loading auth test...</div>
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">Subscription Page Debug</h1>
      
      <div className="space-y-6">
        <div className="bg-white p-4 border rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Auth State</h2>
          <pre className="text-sm bg-gray-100 p-2 rounded overflow-auto">
            {JSON.stringify(authState, null, 2)}
          </pre>
        </div>
        
        <div className="bg-white p-4 border rounded-lg">
          <h2 className="text-lg font-semibold mb-2">URL Info</h2>
          <p>Locale: {locale}</p>
          <p>Full pathname: {window.location.pathname}</p>
        </div>
        
        <div className="space-x-4">
          <button 
            onClick={() => router.push(`/${locale}/login`)}
            className="px-4 py-2 bg-blue-600 text-white rounded"
          >
            Go to Login
          </button>
          <button 
            onClick={() => router.push(`/${locale}/dashboard`)}
            className="px-4 py-2 bg-green-600 text-white rounded"
          >
            Go to Dashboard
          </button>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-gray-600 text-white rounded"
          >
            Reload Page
          </button>
        </div>
      </div>
    </div>
  )
}