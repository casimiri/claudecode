'use client'

import { useState, useRef } from 'react'
import { Upload, Link as LinkIcon, ArrowLeft, AlertCircle, CheckCircle, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function AdminUploadPage() {
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [validatingUrl, setValidatingUrl] = useState(false)
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string } | null>(null)
  const [urlPreview, setUrlPreview] = useState<{ title: string; description: string; contentType?: string } | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const handleUrlValidation = async (url: string) => {
    if (!url.trim()) {
      setUrlPreview(null)
      return
    }

    setValidatingUrl(true)
    try {
      const response = await fetch('/api/admin/validate-url', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: url.trim() }),
      })

      const data = await response.json()

      if (response.ok && data.valid) {
        setUrlPreview({
          title: data.preview?.title || 'URL Content',
          description: data.preview?.description || 'Content available for processing',
          contentType: data.contentType
        })
      } else {
        setUrlPreview(null)
        if (data.error) {
          toast.error(data.error)
        }
      }
    } catch (error) {
      console.error('URL validation error:', error)
      setUrlPreview(null)
    } finally {
      setValidatingUrl(false)
    }
  }

  const handleUrlSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const url = formData.get('url') as string

    if (!url?.trim()) {
      toast.error('Please enter a URL')
      return
    }

    setUploading(true)
    setUploadResult(null)

    try {
      // Add URL document
      const uploadResponse = await fetch('/api/admin/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          url: url.trim(),
          title: urlPreview?.title || '',
          description: urlPreview?.description || '',
          contentType: urlPreview?.contentType
        }),
      })

      const uploadData = await uploadResponse.json()

      if (!uploadResponse.ok) {
        console.error('Upload failed:', uploadResponse.status, uploadData)
        throw new Error(uploadData.error || `Upload failed (${uploadResponse.status})`)
      }

      setUploadResult({ success: true, message: 'URL added successfully!' })
      setProcessing(true)

      // Process the document
      const processResponse = await fetch('/api/admin/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentId: uploadData.documentId }),
      })

      let processData = null
      let responseText = ''
      try {
        responseText = await processResponse.text()
        console.log('Process response status:', processResponse.status)
        console.log('Process response text:', responseText)
        if (responseText.trim()) {
          processData = JSON.parse(responseText)
        }
      } catch (jsonError) {
        console.error('Failed to parse process response:', jsonError)
        console.error('Raw response text:', responseText)
        processData = { error: 'Invalid response from processing endpoint' }
      }

      if (!processResponse.ok) {
        console.error('Processing failed:', {
          status: processResponse.status,
          statusText: processResponse.statusText,
          processData,
          responseText
        })
        setUploadResult({ 
          success: true, 
          message: 'URL added but processing failed. Please try again later.' 
        })
      } else {
        setUploadResult({ 
          success: true, 
          message: `URL processed successfully! Created ${processData?.chunksCreated || 'unknown'} text chunks.` 
        })
      }

      // Reset form
      if (formRef.current) {
        formRef.current.reset()
      }
      setUrlPreview(null)
    } catch (error: any) {
      console.error('Upload error:', error)
      setUploadResult({ success: false, message: error.message || 'URL processing failed' })
    } finally {
      setUploading(false)
      setProcessing(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center py-6">
            <Link
              href="/admin/dashboard"
              className="flex items-center text-gray-600 hover:text-gray-900 mr-4"
            >
              <ArrowLeft className="w-5 h-5 mr-1" />
              Back to Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Add Legal Document from URL</h1>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-8">
          <div className="text-center mb-8">
            <LinkIcon className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900">Add Document from URL</h2>
            <p className="text-gray-600 mt-2">
              Enter a URL containing legal content (HTML pages, plain text documents, or PDF files)
            </p>
          </div>

          <form ref={formRef} onSubmit={handleUrlSubmit} className="space-y-6">
            <div>
              <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
                Document URL
              </label>
              <div className="relative">
                <input
                  type="url"
                  id="url"
                  name="url"
                  placeholder="https://example.com/legal-document"
                  className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                  disabled={uploading || processing}
                  onChange={(e) => {
                    const url = e.target.value
                    // Debounce URL validation
                    setTimeout(() => {
                      if (e.target.value === url) {
                        handleUrlValidation(url)
                      }
                    }, 1000)
                  }}
                />
                {validatingUrl && (
                  <div className="absolute right-3 top-2">
                    <div className="animate-spin h-5 w-5 border-2 border-blue-600 border-t-transparent rounded-full"></div>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Supported: HTML pages, plain text documents, and PDF files over HTTP/HTTPS
              </p>
            </div>

            {urlPreview && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <ExternalLink className="w-5 h-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-medium text-gray-900 truncate">
                      {urlPreview.title}
                    </h3>
                    <p className="text-xs text-gray-500 mt-1">
                      {urlPreview.description}
                    </p>
                  </div>
                  <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={uploading || processing || validatingUrl || !urlPreview}
              className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <Upload className="w-4 h-4 mr-2 animate-pulse" />
                  Adding URL...
                </>
              ) : processing ? (
                <>
                  <Upload className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <LinkIcon className="w-4 h-4 mr-2" />
                  Add Document from URL
                </>
              )}
            </button>
          </form>

          {uploadResult && (
            <div className={`mt-6 p-4 rounded-md ${
              uploadResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
            }`}>
              <div className="flex items-center">
                {uploadResult.success ? (
                  <CheckCircle className="h-5 w-5 text-green-600 mr-2" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 mr-2" />
                )}
                <p className={`text-sm ${
                  uploadResult.success ? 'text-green-800' : 'text-red-800'
                }`}>
                  {uploadResult.message}
                </p>
              </div>
            </div>
          )}

          <div className="mt-8 bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-medium text-gray-900 mb-2">URL Guidelines</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Ensure the URL contains current and accurate legal information</li>
              <li>• The system will automatically fetch, process and index the content for AI queries</li>
              <li>• Supported formats: HTML pages, plain text documents, and PDF files</li>
              <li>• URLs must be accessible over HTTP/HTTPS without authentication</li>
              <li>• Processing may take a few minutes for large documents or web pages</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}