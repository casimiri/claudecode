'use client'

import { useEffect, useState } from 'react'
import { getOAuthDebugInfo, generateConfigValues } from '../../../../lib/auth-debug'

export default function DebugOAuthPage() {
  const [debugInfo, setDebugInfo] = useState<any>(null)
  const [configValues, setConfigValues] = useState<any>(null)

  useEffect(() => {
    setDebugInfo(getOAuthDebugInfo())
    setConfigValues(generateConfigValues())
  }, [])

  if (!debugInfo) {
    return <div className="p-8">Loading debug information...</div>
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Copied to clipboard!')
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">OAuth Debug Information</h1>
        
        {/* Current Configuration */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-semibold mb-4">Current Configuration</h2>
          <div className="space-y-2 font-mono text-sm">
            <div><strong>Current Origin:</strong> {debugInfo.currentOrigin}</div>
            <div><strong>Supabase URL:</strong> {debugInfo.supabaseUrl}</div>
            <div><strong>Expected Facebook Redirect:</strong> {debugInfo.expectedCallbackUrl}</div>
            <div><strong>Expected Return URL:</strong> {debugInfo.expectedReturnUrl}</div>
          </div>
        </div>

        {/* Configuration Checks */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-semibold mb-4">Configuration Checks</h2>
          <div className="space-y-2">
            {Object.entries(debugInfo.checks).map(([key, value]) => (
              <div key={key} className="flex items-center">
                <span className={`mr-2 ${value ? 'text-green-600' : 'text-red-600'}`}>
                  {value ? '✅' : '❌'}
                </span>
                <span>{key}: {String(value)}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Potential Issues */}
        {debugInfo.potentialIssues.length > 0 && (
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-6 mb-8">
            <h2 className="text-xl font-semibold mb-4 text-yellow-800">⚠️ Potential Issues</h2>
            <ul className="list-disc list-inside space-y-1 text-yellow-700">
              {debugInfo.potentialIssues.map((issue: string, index: number) => (
                <li key={index}>{issue}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Facebook App Configuration */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-semibold mb-4">Facebook App Configuration</h2>
          <p className="text-gray-600 mb-4">Copy these values to your Facebook App settings:</p>
          
          <div className="space-y-4">
            <div>
              <label className="block font-semibold mb-1">Site URL (Basic Settings):</label>
              <div className="flex items-center">
                <code className="bg-gray-100 p-2 rounded flex-1">{configValues.facebook.siteUrl}</code>
                <button 
                  onClick={() => copyToClipboard(configValues.facebook.siteUrl)}
                  className="ml-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Copy
                </button>
              </div>
            </div>
            
            <div>
              <label className="block font-semibold mb-1">Valid OAuth Redirect URIs (Facebook Login Settings):</label>
              <div className="flex items-center">
                <code className="bg-gray-100 p-2 rounded flex-1">{configValues.facebook.validOAuthRedirectURIs}</code>
                <button 
                  onClick={() => copyToClipboard(configValues.facebook.validOAuthRedirectURIs)}
                  className="ml-2 px-3 py-1 bg-blue-500 text-white rounded hover:bg-blue-600"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Supabase Configuration */}
        <div className="bg-white p-6 rounded-lg shadow-md mb-8">
          <h2 className="text-xl font-semibold mb-4">Supabase Configuration</h2>
          <p className="text-gray-600 mb-4">Update these values in your Supabase project:</p>
          
          <div className="space-y-4">
            <div>
              <label className="block font-semibold mb-1">Site URL (Settings → API):</label>
              <div className="flex items-center">
                <code className="bg-gray-100 p-2 rounded flex-1">{configValues.supabase.siteUrl}</code>
                <button 
                  onClick={() => copyToClipboard(configValues.supabase.siteUrl)}
                  className="ml-2 px-3 py-1 bg-green-500 text-white rounded hover:bg-green-600"
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Links */}
        <div className="bg-blue-50 p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Quick Links</h2>
          <div className="space-y-2">
            <a 
              href="https://developers.facebook.com/apps" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block text-blue-600 hover:text-blue-800"
            >
              📱 Facebook Developer Console
            </a>
            <a 
              href="https://app.supabase.com" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block text-blue-600 hover:text-blue-800"
            >
              🗄️ Supabase Dashboard
            </a>
            <a 
              href={`${debugInfo.supabaseUrl}/auth/v1/callback`}
              target="_blank" 
              rel="noopener noreferrer"
              className="block text-blue-600 hover:text-blue-800"
            >
              🔄 Test Supabase Callback URL
            </a>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 text-sm text-gray-600">
          <h3 className="font-semibold mb-2">Next Steps:</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li>Copy the Facebook configuration values above</li>
            <li>Update your Facebook App settings with these values</li>
            <li>Copy the Supabase Site URL and update it in your Supabase dashboard</li>
            <li>Wait 2-3 minutes for changes to propagate</li>
            <li>Test Facebook OAuth again</li>
          </ol>
        </div>
      </div>
    </div>
  )
}