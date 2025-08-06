import { useState, useEffect } from 'react'
import { useUser, useSupabaseClient } from '@supabase/auth-helpers-react'
import { useRouter } from 'next/router'
import { toast, ToastContainer } from 'react-toastify'
import 'react-toastify/dist/ReactToastify.css'
import { Chrome, Facebook, Loader2 } from 'lucide-react'

export default function LoginPage() {
  const user = useUser()
  const supabase = useSupabaseClient()
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [provider, setProvider] = useState(null)

  useEffect(() => {
    // Redirect if already logged in
    if (user) {
      router.push('/subscription-supabase')
    }
  }, [user, router])

  const handleSocialLogin = async (providerName) => {
    try {
      setLoading(true)
      setProvider(providerName)

      const { error } = await supabase.auth.signInWithOAuth({
        provider: providerName,
        options: {
          redirectTo: `${window.location.origin}/subscription-supabase`
        }
      })

      if (error) {
        console.error('Login error:', error)
        toast.error(error.message || `Failed to login with ${providerName}`)
      }
      // If successful, user will be redirected by OAuth flow
    } catch (error) {
      console.error('Login error:', error)
      toast.error('An unexpected error occurred')
    } finally {
      setLoading(false)
      setProvider(null)
    }
  }

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut()
      if (error) {
        toast.error('Error signing out')
      } else {
        toast.success('Signed out successfully')
      }
    } catch (error) {
      console.error('Sign out error:', error)
      toast.error('Error signing out')
    }
  }

  if (user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Welcome back!</h2>
            <p className="text-gray-600 mb-6">
              You&apos;re logged in as: <br />
              <strong>{user.email}</strong>
            </p>
            <div className="space-y-4">
              <button
                onClick={() => router.push('/subscription-supabase')}
                className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
              >
                Go to Subscription
              </button>
              <button
                onClick={handleSignOut}
                className="w-full bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 transition-colors"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            Sign in to your account
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Choose your preferred login method
          </p>
        </div>
        
        <div className="bg-white py-8 px-6 shadow rounded-lg">
          <div className="space-y-4">
            {/* Google Login Button */}
            <button
              onClick={() => handleSocialLogin('google')}
              disabled={loading}
              className="w-full flex justify-center items-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading && provider === 'google' ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <Chrome className="w-5 h-5 mr-2 text-red-500" />
              )}
              Continue with Google
            </button>

            {/* Facebook Login Button */}
            <button
              onClick={() => handleSocialLogin('facebook')}
              disabled={loading}
              className="w-full flex justify-center items-center px-4 py-3 border border-gray-300 rounded-md shadow-sm bg-white text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading && provider === 'facebook' ? (
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
              ) : (
                <Facebook className="w-5 h-5 mr-2 text-blue-600" />
              )}
              Continue with Facebook
            </button>
          </div>

          <div className="mt-6">
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-2 bg-white text-gray-500">
                  Secure authentication powered by Supabase
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="text-center">
          <p className="text-xs text-gray-500">
            By signing in, you agree to our Terms of Service and Privacy Policy
          </p>
        </div>
      </div>

      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </div>
  )
}