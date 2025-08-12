'use client'

import { useState, useEffect } from 'react'
import { useTranslations } from 'next-intl'
import { signInWithGoogle, signInWithFacebook } from '../../../../lib/auth'
import { isProviderEnabled } from '../../../../lib/auth-config'
import toast from 'react-hot-toast'
import { Chrome, Facebook, Scale, Loader2, Shield, Sparkles, Users } from 'lucide-react'
import { useParams, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import LanguageSwitcher from '../../../components/LanguageSwitcher'

export default function LoginPage() {
  const params = useParams()
  const searchParams = useSearchParams()
  const locale = params?.locale as string
  const t = useTranslations()
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [facebookLoading, setFacebookLoading] = useState(false)

  // Show error messages from OAuth failures
  useEffect(() => {
    const error = searchParams?.get('error')
    const message = searchParams?.get('message')
    
    if (error === 'oauth_failed' && message) {
      toast.error(`${t('auth.signInFailed')}: ${decodeURIComponent(message)}`)
    }
  }, [searchParams, t])

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      setGoogleLoading(true)
      await signInWithGoogle(locale)
    } catch (error: any) {
      toast.error(error.message || t('auth.failedToSignInWithGoogle'))
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
      console.error('Facebook sign-in error:', error)
      
      // Handle specific Facebook OAuth errors
      if (error.message?.includes('validation_failed')) {
        toast.error('Facebook login is currently unavailable. Please use Google sign-in or contact support.')
      } else {
        toast.error(error.message || t('auth.failedToSignInWithFacebook'))
      }
    } finally {
      setLoading(false)
      setFacebookLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-zinc-900 relative overflow-hidden">
      {/* Enhanced Background Effects */}
      <div className="absolute inset-0">
        {/* Main gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600/20 via-transparent to-purple-600/20"></div>
        
        {/* Animated orbs */}
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-blue-500/30 rounded-full blur-3xl animate-pulse-slow"></div>
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-pulse-slow animation-delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-cyan-500/20 rounded-full blur-2xl animate-float"></div>
        
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-30">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='0.03'%3E%3Ccircle cx='30' cy='30' r='1'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
            backgroundSize: '60px 60px'
          }}></div>
        </div>
      </div>

      {/* Floating Navigation */}
      <nav className="relative z-10 p-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <Link href={`/${locale}`} className="group flex items-center space-x-3 hover:scale-105 transition-all duration-300">
            <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl shadow-lg group-hover:shadow-blue-500/25 transition-shadow duration-300">
              <Scale className="h-6 w-6 text-white" />
            </div>
            <div className="text-white">
              <h1 className="text-xl font-bold">{t('common.appName')}</h1>
              <p className="text-xs text-gray-300">{t('auth.legalAssistantTagline')}</p>
            </div>
          </Link>
          <div className="flex items-center space-x-4">
            <LanguageSwitcher />
            <Link href="#" className="text-sm text-gray-300 hover:text-white transition-colors duration-200 flex items-center space-x-1">
              <span>{t('auth.needHelp')}</span>
            </Link>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <div className="relative z-10 min-h-[calc(100vh-120px)] flex items-center justify-center px-4 sm:px-6 lg:px-8">
        <div className="w-full max-w-lg">
          {/* Welcome Message */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center space-x-2 bg-gradient-to-r from-blue-500/20 to-purple-500/20 backdrop-blur-sm border border-white/10 rounded-full px-6 py-3 mb-8">
              <Sparkles className="h-5 w-5 text-blue-400" />
              <span className="text-sm text-gray-300 font-medium">{t('auth.aiPoweredLegalAssistance')}</span>
            </div>
            <h2 className="text-4xl sm:text-5xl font-bold text-white mb-4">
              {t('auth.loginPageTitle')}
            </h2>
            <p className="text-xl text-gray-300 mb-2">
              {t('auth.loginPageSubtitle')}
            </p>
            <p className="text-sm text-gray-400">
              {t('auth.accessDescription')}
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 sm:p-10 shadow-2xl">
            {/* Social Login Buttons */}
            <div className="space-y-4 mb-8">
              <button
                onClick={handleGoogleSignIn}
                disabled={loading}
                className="group relative w-full flex items-center justify-center py-4 px-6 bg-white hover:bg-gray-50 border border-gray-200 rounded-2xl text-gray-900 font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl hover:scale-[1.02] active:scale-[0.98]"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300"></div>
                {googleLoading ? (
                  <Loader2 className="w-6 h-6 mr-3 animate-spin text-blue-600" />
                ) : (
                  <Chrome className="w-6 h-6 mr-3 text-red-500" />
                )}
                <span className="relative z-10">
                  {googleLoading ? t('auth.signingIn') : t('auth.continueWithGoogle')}
                </span>
              </button>
              
              {/* Facebook OAuth - only show if provider is enabled */}
              {isProviderEnabled('facebook') && (
                <button
                  onClick={handleFacebookSignIn}
                  disabled={loading}
                  className="group relative w-full flex items-center justify-center py-4 px-6 bg-[#1877F2] hover:bg-[#166FE5] border border-[#1877F2] rounded-2xl text-white font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:shadow-xl hover:shadow-blue-500/25 hover:scale-[1.02] active:scale-[0.98]"
                >
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-opacity duration-300"></div>
                  {facebookLoading ? (
                    <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                  ) : (
                    <Facebook className="w-6 h-6 mr-3" />
                  )}
                  <span className="relative z-10">
                    {facebookLoading ? t('auth.signingIn') : t('auth.continueWithFacebook')}
                  </span>
                </button>
              )}
            </div>

            {/* Security & Trust Indicators */}
            <div className="space-y-4 mb-8">
              <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-2xl p-4">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    <Shield className="h-6 w-6 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-green-300">{t('auth.secureLogin')}</p>
                    <p className="text-xs text-green-200/80">{t('auth.secureLoginDescription')}</p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors duration-200">
                  <Users className="h-8 w-8 text-blue-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-300 font-medium">{t('auth.tenKPlusUsers')}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors duration-200">
                  <Shield className="h-8 w-8 text-green-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-300 font-medium">{t('auth.secure')}</p>
                </div>
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 hover:bg-white/10 transition-colors duration-200">
                  <Sparkles className="h-8 w-8 text-purple-400 mx-auto mb-2" />
                  <p className="text-xs text-gray-300 font-medium">{t('auth.aiPowered')}</p>
                </div>
              </div>
            </div>

            {/* Legal Text */}
            <div className="text-center pt-4 border-t border-white/10">
              <p className="text-xs text-gray-400 leading-relaxed">
                {t('auth.bySigningIn')}{' '}
                <Link href="#" className="text-blue-400 hover:text-blue-300 font-medium underline underline-offset-2">
                  {t('auth.termsOfService')}
                </Link>{' '}
                {t('auth.and')}{' '}
                <Link href="#" className="text-blue-400 hover:text-blue-300 font-medium underline underline-offset-2">
                  {t('auth.privacyPolicy')}
                </Link>
              </p>
            </div>
          </div>

          {/* Bottom Stats */}
          <div className="mt-12 text-center">
            <div className="inline-flex items-center space-x-8 text-sm text-gray-400">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span>{t('auth.uptimeStats')}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse animation-delay-500"></div>
                <span>{t('auth.isoCertified')}</span>
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse animation-delay-1000"></div>
                <span>{t('auth.gdprCompliant')}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes pulse-slow {
          0%, 100% {
            opacity: 0.3;
          }
          50% {
            opacity: 0.6;
          }
        }
        
        @keyframes float {
          0%, 100% {
            transform: translate(-50%, -50%) translateY(0px);
          }
          50% {
            transform: translate(-50%, -50%) translateY(-20px);
          }
        }
        
        .animate-pulse-slow {
          animation: pulse-slow 4s ease-in-out infinite;
        }
        
        .animate-float {
          animation: float 6s ease-in-out infinite;
        }
        
        .animation-delay-500 {
          animation-delay: 0.5s;
        }
        
        .animation-delay-1000 {
          animation-delay: 1s;
        }
        
        .animation-delay-1500 {
          animation-delay: 1.5s;
        }
      `}</style>
    </div>
  )
}