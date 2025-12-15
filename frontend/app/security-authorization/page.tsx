'use client'

/**
 * Security Authorization Component
 *
 * Note: This component is currently using IPC communication (window.electronAPI)
 * TODO: Migrate to Socket communication for better scalability and real-time updates
 * The component will be displayed via Socket events instead of IPC in the future
 */

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useTheme } from '@/contexts/theme-context'

interface SecurityAuthorizationProps {
  clientName?: string
  toolName?: string
  functionName?: string
}

function SecurityAuthorizationContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { actualTheme } = useTheme()
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  // Get parameters from URL
  const clientName = searchParams.get('clientName') || '[Client Name]'
  const toolName = searchParams.get('toolName') || '[ToolName]'
  const functionName = searchParams.get('functionName') || '[Function Name]'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!password.trim()) {
      setError('Master password is required')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // Send authorization result via IPC
      const result = await window.electronAPI?.authorizeDangerousOperation({
        password,
        clientName,
        toolName,
        functionName,
        approved: true
      })

      if (result?.success) {
        // Close the authorization window
        window.close()
      } else {
        setError(result?.error || 'Invalid master password')
      }
    } catch (error) {
      console.error('Authorization failed:', error)
      setError('Authorization failed. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = async () => {
    try {
      // Send cancellation via IPC
      await window.electronAPI?.authorizeDangerousOperation({
        password: '',
        clientName,
        toolName,
        functionName,
        approved: false
      })
    } catch (error) {
      console.error('Cancel authorization failed:', error)
    }

    // Close the authorization window
    window.close()
  }

  const handleForgotPassword = () => {
    router.push('/reset-master-password')
  }

  useEffect(() => {
    // Auto-focus the password input when component mounts
    const passwordInput = document.getElementById('password')
    if (passwordInput) {
      passwordInput.focus()
    }
  }, [])

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-gray-900 dark:to-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          {/* Logo */}
          <div className="mx-auto mb-6">
            <img
              src={actualTheme === 'dark' ? '/images/darkLogo.svg' : '/images/lightLogo.svg'}
              alt="Peta Desk"
              className="h-12 mx-auto"
            />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-slate-900 dark:text-gray-100 mb-3">
            Security Authorization
            <br />
            Required
          </h1>

          {/* Description */}
          <div className="text-slate-600 dark:text-gray-400 space-y-2 mb-4">
            <p className="text-sm">
              <span className="font-medium">{clientName}</span> is attempting to
              execute a high-risk operation:
            </p>
            <p className="text-sm font-mono bg-slate-100 dark:bg-gray-800 px-3 py-1 rounded text-gray-900 dark:text-gray-100">
              {toolName} → {functionName}
            </p>
            <p className="text-sm text-blue-600 dark:text-blue-400">
              This action may have significant system impact. Please verify your
              identity to proceed
            </p>
          </div>
        </div>

        {/* Password Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700 dark:text-gray-300"
            >
              Master Password
            </label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  if (error) setError('')
                }}
                placeholder="Enter your master password"
                className={`pr-10 ${
                  error ? 'border-red-300 focus:border-red-500' : ''
                }`}
                disabled={isLoading}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-500 hover:text-slate-600 dark:hover:text-gray-400"
                disabled={isLoading}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>

            {error && <p className="text-xs text-red-600 dark:text-red-400 mt-1">{error}</p>}
          </div>

          <div className="text-center">
            <button
              type="button"
              onClick={handleForgotPassword}
              className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline"
              disabled={isLoading}
            >
              Forgot Master Password?
            </button>
          </div>

          {/* Action Buttons */}
          <div className="space-y-3 pt-2">
            <Button
              type="submit"
              className="w-full bg-blue-500 hover:bg-blue-600 text-white font-medium"
              disabled={!password.trim() || isLoading}
            >
              {isLoading ? 'Authorizing...' : 'Authorize'}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              className="w-full"
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default function SecurityAuthorizationPage() {
  return (
    <Suspense fallback={<div>Loading authorization...</div>}>
      <SecurityAuthorizationContent />
    </Suspense>
  )
}
