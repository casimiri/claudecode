'use client'

import { useTheme } from '../../../contexts/ThemeContext'
import ThemeToggle from '../../../components/ThemeToggle'

export default function ThemeTest() {
  const { theme } = useTheme()

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
            Theme Test Page
          </h1>
          
          <div className="mb-6">
            <p className="text-gray-600 dark:text-gray-300 mb-4">
              Current theme: <span className="font-semibold text-blue-600 dark:text-blue-400">{theme}</span>
            </p>
            
            <div className="flex items-center space-x-4">
              <span className="text-gray-700 dark:text-gray-300">Toggle theme:</span>
              <ThemeToggle />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="bg-gray-100 dark:bg-gray-700 p-4 rounded-lg">
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Light Mode Test</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                This card should have a light background in light mode and dark background in dark mode.
              </p>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">Accent Colors</h3>
              <p className="text-blue-700 dark:text-blue-300 text-sm">
                Accent colors should adapt properly to both themes.
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-500 rounded"></div>
              <span className="text-gray-700 dark:text-gray-300">Red</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-500 rounded"></div>
              <span className="text-gray-700 dark:text-gray-300">Green</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span className="text-gray-700 dark:text-gray-300">Blue</span>
            </div>
          </div>

          <div className="mt-6 p-4 border-l-4 border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 dark:border-yellow-600">
            <p className="text-yellow-800 dark:text-yellow-200">
              <strong>Debug Info:</strong> HTML class should show &lsquo;dark&rsquo; or &lsquo;light&rsquo; class on document element when theme changes.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}