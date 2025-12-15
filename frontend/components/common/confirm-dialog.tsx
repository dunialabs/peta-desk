'use client'

import { useState, useEffect, useRef } from 'react'
import { useConfirmDialogStore } from '@/store/confirm-dialog-store'
import { useLock } from '@/contexts/lock-context'
import Header from '@/components/common/header'
import { AlertTriangle, Info, ShieldAlert, Eye, EyeOff, Fingerprint } from 'lucide-react'
import { toast } from 'sonner'

/**
 * Global confirmation dialog component
 * Used for Socket ask_user_confirm requests
 */
export function ConfirmDialog() {
  const { isOpen, request, confirm, cancel } = useConfirmDialogStore()
  const { isLocked } = useLock()

  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isAuthorizing, setIsAuthorizing] = useState(false)
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const isAuthenticatingRef = useRef(false)

  // Check if biometric authentication is available
  useEffect(() => {
    const checkBiometricAvailability = async () => {
      try {
        if (typeof window !== 'undefined' && window.electron?.biometric) {
          const result = await window.electron.biometric.isAvailable()

          // Check if biometric authentication is enabled
          const savedSettings = localStorage.getItem('biometric-settings')
          if (savedSettings && result.available) {
            try {
              const parsed = JSON.parse(savedSettings)
              const isEnabled = Object.values(parsed).some(
                (enabled) => enabled === true
              )
              setBiometricAvailable(isEnabled)

              // Auto-trigger biometric authentication when dialog opens
              if (isEnabled && isOpen) {
                setTimeout(() => {
                  tryBiometricAuth()
                }, 300)
              }
            } catch (error) {
              console.error('Failed to parse biometric settings:', error)
              setBiometricAvailable(false)
            }
          } else {
            setBiometricAvailable(false)
          }
        }
      } catch (error) {
        console.error('Failed to check biometric availability:', error)
      }
    }

    if (isOpen) {
      checkBiometricAvailability()
    }
  }, [isOpen])

  // Attempt biometric authentication
  const tryBiometricAuth = async () => {
    if (isAuthenticatingRef.current) return

    isAuthenticatingRef.current = true
    setIsAuthenticating(true)

    // Remove focus from all input fields to ensure system dialog can receive focus correctly
    if (
      document.activeElement &&
      document.activeElement instanceof HTMLInputElement
    ) {
      document.activeElement.blur()
    }

    try {
      // Execute biometric authentication
      const authResult = await window.electron.biometric.authenticate(
        'Authorize Action'
      )
      if (authResult.success) {
        // Get stored password
        const passwordResult = await window.electron.biometric.getPassword()
        if (passwordResult.success && passwordResult.password) {
          // Verify password
          const verifyResult = await window.electron.password.verify(
            passwordResult.password
          )
          if (verifyResult.success) {
            console.info('Authorized with biometric authentication')
            // Auto-authorize
            confirm()
            return
          } else {
            toast.error('Stored password is invalid')
          }
        } else {
          toast.error('Failed to retrieve stored password')
        }
      }
    } catch (error) {
      console.error('Biometric authentication failed:', error)
    } finally {
      isAuthenticatingRef.current = false
      setIsAuthenticating(false)

      // After biometric authentication ends, if authorization was not successful, refocus password input field
      setTimeout(() => {
        const passwordInput = document.querySelector('input[type="password"]')
        if (passwordInput instanceof HTMLInputElement) {
          passwordInput.focus()
        }
      }, 100)
    }
  }

  // Manually trigger biometric authentication
  const handleBiometricAuth = () => {
    tryBiometricAuth()
  }

  // If the app is locked, don't show the dialog
  if (isLocked || !request || !isOpen) {
    return null
  }

  // Parse tool parameters (if it's a JSON string)
  let parsedParams: any = null
  try {
    if (request.toolParams && request.toolParams.trim()) {
      parsedParams = JSON.parse(request.toolParams)
    }
  } catch (error) {
    // If parsing fails, keep the original value
    parsedParams = request.toolParams
  }

  const handleAuthorize = async () => {
    if (!password) {
      setError('Please enter your master password')
      return
    }

    setIsAuthorizing(true)
    setError('')

    try {
      // Validate password
      if (window.electron?.password) {
        const result = await window.electron.password.verify(password)
        if (!result.success) {
          setError('Incorrect master password. Please try again.')
          setIsAuthorizing(false)
          return
        }
      } else {
        setError('Password manager not available.')
        setIsAuthorizing(false)
        return
      }

      // Password verified; perform the action
      confirm()
      // Reset state
      setPassword('')
      setError('')
      setIsAuthorizing(false)
    } catch (error) {
      console.error('Failed to authorize:', error)
      setError('An unexpected error occurred')
      setIsAuthorizing(false)
    }
  }

  const handleCancel = () => {
    setPassword('')
    setError('')
    setIsAuthorizing(false)
    cancel()
  }

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isAuthorizing) {
      handleAuthorize()
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-white dark:bg-gray-900 overflow-y-auto">
      {/* Biometric authentication overlay */}
      {isAuthenticating && (
        <div className="absolute inset-0 bg-black/20 z-30" />
      )}

      <div className="min-h-screen flex flex-col">
        <Header showSettingsButton={true} />

        <div className="max-w-md mx-auto mt-[60px] w-full flex flex-col px-4 pb-6">
          <div className="w-full">
            {/* Title */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 rounded-full bg-yellow-100">
                  <ShieldAlert className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                </div>
                <h1 className="text-[30px] font-bold text-[#0A0A0A] dark:text-gray-100">
                  Authorization Required
                </h1>
              </div>
              <p className="text-[14px] text-[#8E8E93] dark:text-gray-400 leading-[20px]">
                Enter your master password to authorize this action
              </p>
            </div>

            {/* Authorization Details */}
            <div className="mb-6 space-y-4">
              {/* Server and Source Information */}
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500 dark:text-gray-400">Server:</span>
                  <span className="font-medium text-gray-900 dark:text-gray-100">
                    {request.serverName}
                  </span>
                </div>
                {request.userAgent && request.userAgent !== 'Unknown' && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500 dark:text-gray-400">Source:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {request.userAgent}
                    </span>
                  </div>
                )}
                {request.ip && request.ip !== 'Unknown' && (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-gray-500 dark:text-gray-400">IP Address:</span>
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {request.ip}
                    </span>
                  </div>
                )}
              </div>

              {/* Tool Information */}
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 space-y-2">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                  <div className="flex-1">
                    <div className="font-medium text-blue-900 dark:text-blue-100 mb-1">
                      {request.toolName}
                    </div>
                    {request.toolDescription && (
                      <div className="text-sm text-blue-700 dark:text-blue-300">
                        {request.toolDescription}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tool Parameters - only show if params exist */}
              {parsedParams && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="font-medium text-yellow-900 dark:text-yellow-100 mb-1">Parameters</div>
                      <div className="text-sm text-yellow-800 font-mono">
                        {typeof parsedParams === 'object' ? (
                          <pre className="whitespace-pre-wrap break-words">
                            {JSON.stringify(parsedParams, null, 2)}
                          </pre>
                        ) : (
                          parsedParams
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Password Input */}
            <div className="mb-6">
              <label className="block text-[16px] font-semibold text-[#0A0A0A] dark:text-gray-100 mb-[8px]">
                Master Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    setError('')
                  }}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter master password"
                  autoFocus={!biometricAvailable && !isAuthenticating}
                  disabled={isAuthorizing || isAuthenticating}
                  className="w-full h-[48px] px-[16px] pr-[48px] text-[16px] border border-[#D1D1D6] dark:border-gray-700 rounded-[12px] bg-white dark:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-[#26251E] dark:focus:ring-white focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-gray-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-[16px] top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-200"
                  disabled={isAuthorizing || isAuthenticating}
                >
                  {showPassword ? (
                    <EyeOff className="w-5 h-5" />
                  ) : (
                    <Eye className="w-5 h-5" />
                  )}
                </button>
              </div>
              {error && <p className="text-[14px] text-red-500 dark:text-red-400 mt-2">{error}</p>}
            </div>

            {/* Biometric Authentication Button */}
            {biometricAvailable && (
              <div className="mb-6">
                <div className="flex items-center mb-4">
                  <div className="flex-1 h-px bg-gray-300"></div>
                  <span className="px-3 text-[13px] text-[#64748B] dark:text-gray-400">or</span>
                  <div className="flex-1 h-px bg-gray-300"></div>
                </div>

                <button
                  onClick={handleBiometricAuth}
                  disabled={isAuthenticating || isAuthorizing}
                  className="w-full py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 rounded-[12px] text-[15px] font-medium text-gray-700 dark:text-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  <Fingerprint className="w-5 h-5" />
                  <span>
                    {isAuthenticating
                      ? 'Authenticating...'
                      : 'Use Biometric Authentication'}
                  </span>
                </button>
              </div>
            )}
          </div>

          {/* Bottom Buttons */}
          <div className="flex gap-4 mt-6">
            <button
              onClick={handleCancel}
              disabled={isAuthorizing || isAuthenticating}
              className="flex-1 h-[48px] border border-[#D1D1D6] dark:border-gray-700 rounded-[12px] bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 text-[#0A0A0A] dark:text-gray-100 text-[14px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={handleAuthorize}
              disabled={isAuthorizing || isAuthenticating || !password}
              className="flex-1 h-[48px] rounded-[12px] bg-[#26251E] dark:bg-gray-700 hover:bg-[#3A3933] dark:hover:bg-gray-600 text-white text-[14px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isAuthorizing ? 'Authorizing...' : 'Authorize'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
