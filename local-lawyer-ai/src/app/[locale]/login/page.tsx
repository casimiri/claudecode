'use client'

import { useState, useEffect } from 'react'
import { signInWithGoogle, signInWithFacebook } from '../../../../lib/auth'
import toast from 'react-hot-toast'
import { Chrome, Facebook, Scale, ArrowLeft, Loader2 } from 'lucide-react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'

export default function LoginPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const locale = params?.locale as string
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [facebookLoading, setFacebookLoading] = useState(false)

  // Show error messages from OAuth failures
  useEffect(() => {
    const error = searchParams?.get('error')
    const message = searchParams?.get('message')
    
    if (error === 'oauth_failed' && message) {
      toast.error(`Sign in failed: ${decodeURIComponent(message)}`)
    }
  }, [searchParams])

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      setGoogleLoading(true)
      await signInWithGoogle(locale)
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in with Google')
    } finally {
      setLoading(false)
      setGoogleLoading(false)
    }
  }

  const handleFacebookSignIn = async () => {
    try {
      setLoading(true)
      setFacebookLoading(true)
      await signInWithFacebook(locale)
    } catch (error: any) {
      toast.error(error.message || 'Failed to sign in with Facebook')
    } finally {
      setLoading(false)
      setFacebookLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 relative">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-2000"></div>
        <div className="absolute top-40 left-40 w-80 h-80 bg-pink-400 rounded-full mix-blend-multiply filter blur-xl opacity-20 animate-blob animation-delay-4000"></div>
      </div>

      {/* Header */}
      <header className="relative z-10 bg-white/80 backdrop-blur-sm border-b border-white/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <Link href={`/${locale}`} className="flex items-center group">
              <ArrowLeft className="h-5 w-5 text-gray-500 mr-2 group-hover:text-blue-600 transition-colors" />
              <Scale className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">Local Lawyer AI</span>
            </Link>
            <div className="text-sm text-gray-600">
              Need help?{' '}
              <Link href="#" className="text-blue-600 hover:text-blue-500 font-medium">
                Contact Support
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          {/* Card */}
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-8 sm:p-10">
            {/* Header */}
            <div className="text-center">
              <div className="mx-auto h-16 w-16 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-6">
                <Scale className="h-8 w-8 text-white" />
              </div>
              <h2 className="text-3xl font-bold text-gray-900 mb-3">
                Welcome Back
              </h2>
              <p className="text-gray-600 mb-8">
                Sign in to access your AI-powered legal assistant
              </p>
            </div>
            
            {/* Social Sign-in Buttons */}
            <div className="space-y-4">
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="group relative w-full flex justify-center items-center py-4 px-6 border border-gray-200 text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-md"
              >
                {googleLoading ? (
                  <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                ) : (
                  <Chrome className="w-5 h-5 mr-3 text-red-500" />
                )}
                <span className="flex-1 text-center">
                  {googleLoading ? 'Signing in...' : 'Continue with Google'}
                </span>
              </button>
              
              <button
                onClick={handleFacebookSignIn}
                disabled={loading}
                className="group relative w-full flex justify-center items-center py-4 px-6 border border-gray-200 text-sm font-medium rounded-xl text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-md"
              >
                {facebookLoading ? (
                  <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                ) : (
                  <Facebook className="w-5 h-5 mr-3 text-blue-600" />
                )}
                <span className="flex-1 text-center">
                  {facebookLoading ? 'Signing in...' : 'Continue with Facebook'}
                </span>
              </button>
            </div>

            {/* Security Badge */}
            <div className="mt-8 bg-gradient-to-r from-green-50 to-blue-50 rounded-2xl p-4 border border-green-100">
              <div className="flex items-center justify-center">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                </div>
                <p className="ml-2 text-sm font-medium text-gray-700">
                  Secure login with industry-standard encryption
                </p>
              </div>
            </div>
            
            {/* Legal Text */}
            <div className="mt-8 text-center">
              <p className="text-xs text-gray-500 leading-relaxed">
                By signing in, you agree to our{' '}
                <Link href="#" className="text-blue-600 hover:text-blue-500 font-medium">
                  Terms of Service
                </Link>{' '}
                and{' '}
                <Link href="#" className="text-blue-600 hover:text-blue-500 font-medium">
                  Privacy Policy
                </Link>
              </p>
            </div>
          </div>

          {/* Additional Features */}
          <div className="text-center">
            <div className="grid grid-cols-3 gap-6 max-w-xs mx-auto">
              <div className="text-center">
                <div className="h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <p className="text-xs text-gray-600 font-medium">Fast Access</p>
              </div>
              <div className="text-center">
                <div className="h-12 w-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg className="h-6 w-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-xs text-gray-600 font-medium">Secure</p>
              </div>
              <div className="text-center">
                <div className="h-12 w-12 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-2">
                  <svg className="h-6 w-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                  </svg>
                </div>
                <p className="text-xs text-gray-600 font-medium">Trusted</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes blob {
          0% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
          100% {
            transform: translate(0px, 0px) scale(1);
          }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  )
}