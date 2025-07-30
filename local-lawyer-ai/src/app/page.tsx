import Link from 'next/link'
import { Scale, Shield, Zap, Users } from 'lucide-react'

export default function HomePage() {
  return (
    <div className="bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div className="flex items-center">
              <Scale className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">Local Lawyer AI</span>
            </div>
            <div className="flex items-center space-x-4">
              <Link href="/login" className="text-gray-500 hover:text-gray-900">
                Sign In
              </Link>
              <Link 
                href="/login" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
              >
                Get Started
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-20">
          <div className="text-center">
            <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl sm:tracking-tight lg:text-6xl">
              AI-Powered Legal Assistant
            </h1>
            <p className="max-w-xl mt-5 mx-auto text-xl text-gray-500">
              Get instant answers to legal questions based on the most up-to-date local law documents
            </p>
            <div className="mt-8">
              <Link 
                href="/login"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-md text-lg font-medium"
              >
                Start Your Legal Journey
              </Link>
            </div>
          </div>
        </div>

        {/* Features */}
        <div className="py-16">
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
            <div className="text-center">
              <div className="flex justify-center">
                <Zap className="h-12 w-12 text-blue-600" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Instant Answers</h3>
              <p className="mt-2 text-gray-500">
                Get immediate responses to your legal questions powered by advanced AI
              </p>
            </div>
            
            <div className="text-center">
              <div className="flex justify-center">
                <Shield className="h-12 w-12 text-blue-600" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Up-to-Date Laws</h3>
              <p className="mt-2 text-gray-500">
                Access the latest local law documents and regulations
              </p>
            </div>
            
            <div className="text-center">
              <div className="flex justify-center">
                <Users className="h-12 w-12 text-blue-600" />
              </div>
              <h3 className="mt-4 text-lg font-medium text-gray-900">Secure & Private</h3>
              <p className="mt-2 text-gray-500">
                Your questions and data are handled with the highest security standards
              </p>
            </div>
          </div>
        </div>

        {/* Pricing Preview */}
        <div className="py-16">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">
              Flexible Pricing Plans
            </h2>
            <p className="mt-4 text-lg text-gray-500">
              Choose the plan that works best for your legal needs
            </p>
            <div className="mt-8 flex justify-center space-x-4">
              <div className="bg-gray-50 rounded-lg p-4">
                <span className="text-sm text-gray-500">Weekly</span>
                <div className="text-2xl font-bold text-gray-900">$9.99</div>
              </div>
              <div className="bg-blue-50 rounded-lg p-4 border-2 border-blue-200">
                <span className="text-sm text-blue-600">Monthly (Popular)</span>
                <div className="text-2xl font-bold text-gray-900">$29.99</div>
              </div>
              <div className="bg-gray-50 rounded-lg p-4">
                <span className="text-sm text-gray-500">Yearly</span>
                <div className="text-2xl font-bold text-gray-900">$299.99</div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-gray-50">
        <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 lg:px-8">
          <div className="text-center text-gray-500">
            <p>&copy; 2024 Local Lawyer AI. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
