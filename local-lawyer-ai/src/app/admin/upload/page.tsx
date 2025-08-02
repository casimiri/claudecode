'use client'

import { useState, useRef } from 'react'
import { Upload, FileText, ArrowLeft, AlertCircle, CheckCircle } from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

export default function AdminUploadPage() {
  const [uploading, setUploading] = useState(false)
  const [processing, setProcessing] = useState(false)
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string } | null>(null)
  const formRef = useRef<HTMLFormElement>(null)

  const handleFileUpload = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const file = formData.get('file') as File

    if (!file) {
      toast.error('Please select a file')
      return
    }

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ]

    if (!allowedTypes.includes(file.type)) {
      toast.error('Please upload a PDF, DOCX, or TXT file')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB')
      return
    }

    setUploading(true)
    setUploadResult(null)

    try {
      // Upload file
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)

      const uploadResponse = await fetch('/api/admin/upload', {
        method: 'POST',
        body: uploadFormData,
      })

      const uploadData = await uploadResponse.json()

      if (!uploadResponse.ok) {
        console.error('Upload failed:', uploadResponse.status, uploadData)
        throw new Error(uploadData.error || `Upload failed (${uploadResponse.status})`)
      }

      setUploadResult({ success: true, message: 'File uploaded successfully!' })
      setProcessing(true)

      // Process the document
      const processResponse = await fetch('/api/admin/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ documentId: uploadData.documentId }),
      })

      const processData = await processResponse.json()

      if (!processResponse.ok) {
        console.error('Processing failed:', processData.error)
        setUploadResult({ 
          success: true, 
          message: 'File uploaded but processing failed. Please try again later.' 
        })
      } else {
        setUploadResult({ 
          success: true, 
          message: 'File uploaded and processed successfully!' 
        })
      }

      // Reset form
      if (formRef.current) {
        formRef.current.reset()
      }
    } catch (error: any) {
      console.error('Upload error:', error)
      setUploadResult({ success: false, message: error.message || 'Upload failed' })
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
            <h1 className="text-2xl font-bold text-gray-900">Upload Legal Document</h1>
          </div>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-lg shadow p-8">
          <div className="text-center mb-8">
            <FileText className="h-12 w-12 text-blue-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900">Upload New Document</h2>
            <p className="text-gray-600 mt-2">
              Upload a PDF, DOCX, or TXT file containing local law information
            </p>
          </div>

          <form ref={formRef} onSubmit={handleFileUpload} className="space-y-6">
            <div>
              <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-2">
                Select File
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
                <input
                  type="file"
                  id="file"
                  name="file"
                  accept=".pdf,.docx,.txt"
                  className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  disabled={uploading || processing}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                Supported formats: PDF, DOCX, TXT (Max size: 10MB)
              </p>
            </div>

            <button
              type="submit"
              disabled={uploading || processing}
              className="w-full flex items-center justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {uploading ? (
                <>
                  <Upload className="w-4 h-4 mr-2 animate-pulse" />
                  Uploading...
                </>
              ) : processing ? (
                <>
                  <Upload className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload Document
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
            <h3 className="text-sm font-medium text-gray-900 mb-2">Upload Guidelines</h3>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Ensure the document contains current and accurate legal information</li>
              <li>• The system will automatically process and index the document for AI queries</li>
              <li>• Previous versions will be archived when uploading updated documents</li>
              <li>• Processing may take a few minutes for large documents</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}