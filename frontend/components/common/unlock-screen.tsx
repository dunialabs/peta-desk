'use client'

import { useState, useEffect, useRef } from 'react'
import { useLock } from '@/contexts/lock-context'
import { useTheme } from '@/contexts/theme-context'
import { InputWithClear } from '@/components/ui/input-with-clear'
import { Fingerprint } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'

export default function UnlockScreen() {
  const { unlockApp, isUserInitiatedLock } = useLock()
  const { actualTheme } = useTheme()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [biometricAvailable, setBiometricAvailable] = useState(false)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const isAuthenticatingRef = useRef(false)
  const [showWarningModal, setShowWarningModal] = useState(false)
  const [showResetModal, setShowResetModal] = useState(false)
  const [confirmText, setConfirmText] = useState('')

  const expectedText = 'I want to reset all data'
  const isResetValid = confirmText === expectedText
  const handleUnlock = async () => {
    if (!password.trim()) {
      setError('Please enter your master password')
      return
    }

    const success = await unlockApp(password)
    if (success) {
      setError('')
      setPassword('')
      // No navigation needed - lock screen is just an overlay
      // When isLocked becomes false, the overlay will be removed automatically
    } else {
      setError('Incorrect password. Please try again.')
      setPassword('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleUnlock()
    }
  }

  const handleForgotPassword = () => {
    setShowWarningModal(true)
  }

  const handleWarningConfirm = () => {
    setShowWarningModal(false)
    setShowResetModal(true)
  }

  const handleWarningCancel = () => {
    setShowWarningModal(false)
  }

  const handleResetConfirm = async () => {
    if (!isResetValid) return

    try {
      // Clear all stored data including master password
      if (window.electron?.password) {
        await window.electron.password.remove()
      }

      // Clear all localStorage data
      localStorage.clear()

      // Clear all sessionStorage data
      sessionStorage.clear()

      // Since data is cleared, the app will be unable to verify lock status, redirect directly
      window.location.href = '/master-password'
    } catch (error) {
      console.error('Failed to reset data:', error)
      alert('Failed to reset data. Please try again.')
    }
  }

  const handleResetCancel = () => {
    setShowResetModal(false)
    setConfirmText('')
  }

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

              // If biometric is enabled and not user-initiated lock, try automatic authentication
              if (isEnabled && !isUserInitiatedLock) {
                // Check if window is visible
                if (document.visibilityState === 'visible') {
                  setTimeout(() => {
                    tryBiometricUnlock()
                  }, 300)
                }
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

    checkBiometricAvailability()
  }, [])

  // Listen for window visibility changes, automatically trigger biometric authentication when window becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        document.visibilityState === 'visible' &&
        biometricAvailable &&
        !isUserInitiatedLock &&
        !isAuthenticatingRef.current
      ) {
        // Delay slightly to ensure UI is fully displayed
        setTimeout(() => {
          tryBiometricUnlock()
        }, 300)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [biometricAvailable, isUserInitiatedLock])

  // Attempt biometric unlock
  const tryBiometricUnlock = async () => {
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
        'Unlock Peta Desk'
      )
      if (authResult.success) {
        // Get stored password
        const passwordResult = await window.electron.biometric.getPassword()
        if (passwordResult.success && passwordResult.password) {
          // Use retrieved password to unlock the app
          const success = await unlockApp(passwordResult.password)
          if (success) {
            console.info('Unlocked with biometric authentication')
            // No navigation needed - lock screen is just an overlay
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

      // After biometric authentication ends, if unlock was not successful, refocus password input field
      setTimeout(() => {
        const passwordInput = document.querySelector('input[type="password"]')
        if (passwordInput) {
          passwordInput.focus()
        }
      }, 100)
    }
  }

  // Manually trigger biometric authentication
  const handleBiometricUnlock = () => {
    tryBiometricUnlock()
  }

  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-900/95 backdrop-blur-md flex items-center justify-center z-50">
      {/* Biometric authentication overlay */}
      {isAuthenticating && (
        <div className="absolute inset-0 bg-black/20 z-30" />
      )}

      {/* Warning Modal - Forgot Password */}
      {showWarningModal && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-[100]">
          <div className="bg-white dark:bg-gray-900 rounded-[10px] p-[16px] max-w-[320px] w-full mx-8 shadow-xl">
            <h2 className="text-[13px] font-bold text-center text-[#26251e] dark:text-gray-100 mb-[10px]">
              Forgot Master Password?
            </h2>
            <p className="text-[11px] text-center text-gray-900 dark:text-gray-100 leading-[14px] mb-[16px]">
              Without your master password, there is no way to recover your encrypted data. The only option is to reset the application, which will permanently delete all stored data.
            </p>
            <div className="flex gap-[8px]">
              <button
                onClick={handleWarningCancel}
                className="flex-1 h-[28px] rounded-[5px] bg-gray-100 dark:bg-gray-800 text-[#26251e] dark:text-gray-100 text-[13px] font-[400] transition-colors hover:bg-[rgba(0,0,0,0.15)] dark:hover:bg-gray-700 shadow-[inset_0_0.5px_0.5px_rgba(255,255,255,0.25)]"
              >
                Cancel
              </button>
              <button
                onClick={handleWarningConfirm}
                className="flex-1 h-[28px] rounded-[5px] bg-[#26251E] dark:bg-gray-700 hover:bg-[#3A3933] dark:hover:bg-gray-600 text-white text-[13px] font-medium transition-colors shadow-[inset_0_0.5px_0_rgba(255,255,255,0.35)]"
              >
                Reset Peta Desk
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-md flex items-center justify-center z-[100]">
          <div
            className="bg-white dark:bg-gray-900 rounded-[12px] shadow-xl w-full max-w-md mx-8 p-8"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Title */}
            <div className="text-center mb-6">
              <h1 className="text-2xl font-bold text-black dark:text-white">
                Reset Peta Desk
              </h1>
            </div>

            {/* Warning Alert */}
            <div
              className="border border-[#FF9500] rounded-[12px] p-[16px] mb-4 bg-orange-100 dark:bg-orange-900/20"
            >
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 mt-0.5">
                  <div className="w-7 h-7 bg-[#FF9500] rounded-full flex items-center justify-center">
                    <span className="text-white text-base font-bold">!</span>
                  </div>
                </div>
                <div className="flex-1">
                  <p className="text-sm text-[#FF9500] dark:text-orange-400 leading-relaxed">
                    <span className="font-bold">Warning: </span>
                    This will permanently delete all your data. This action cannot be undone.
                  </p>
                </div>
              </div>
            </div>

            {/* Confirmation Input */}
            <div className="mb-8">
              <div className="text-[14px] font-[700] text-[#040B0F] dark:text-gray-100 mb-[4px]">
                Type &quot;{expectedText}&quot; to confirm:
              </div>
              <div className="relative">
                {/* Always visible placeholder text background layer */}
                <div className="absolute inset-0 flex items-center px-4 pointer-events-none">
                  <span
                    className={`text-[14px] text-[#94A3B8] dark:text-gray-400 ${
                      confirmText ? 'opacity-40' : 'opacity-100'
                    }`}
                  >
                    Type "{expectedText}" to confirm
                  </span>
                </div>
                {/* Actual input field */}
                <input
                  type="text"
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  className="w-full h-[48px] text-[14px] px-4 bg-white dark:bg-gray-900 border border-[rgba(4, 11, 15, 0.10)] dark:border-gray-700 rounded-[8px] focus:border-transparent focus:ring-2 focus:ring-black dark:focus:ring-white focus:outline-none relative z-10 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-[16px]">
              <Button
                onClick={handleResetConfirm}
                disabled={!isResetValid}
                className="w-full h-[40px] text-[14px] bg-[#26251e] dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 text-white rounded-[8px] font-[500] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Reset and Clear All Data
              </Button>

              <Button
                onClick={handleResetCancel}
                variant="outline"
                className="w-full h-[40px] text-[14px] border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800 text-[#26251e] dark:text-gray-100 rounded-[8px] font-[500] transition-colors"
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Unlock Screen */}
      <div className="w-full max-w-md mx-auto px-8">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-6">
            <img
              src={actualTheme === 'dark' ? '/images/darkLogo.svg' : '/images/lightLogo.svg'}
              alt="Peta Desk"
              className="h-12 mx-auto"
            />
          </div>

          <p className="text-[#7C8C94] dark:text-gray-400 text-[14px] leading-relaxed mt-4">
            Please enter your master password to unlock your encrypted data
          </p>
        </div>

        {/* Password Input */}
        <div className="mb-[10px]">
          <label className="text-[14px] font-[700] text-[#040B0F] dark:text-gray-100 mb-[4px] block">
            Master Password
          </label>
          <InputWithClear
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value)
              if (error) setError('')
            }}
            onClear={() => setPassword('')}
            onKeyDown={handleKeyDown}
            placeholder="Enter your master password..."
            className={`${error ? 'border-red-500 focus:ring-red-500' : ''}`}
            autoFocus={!biometricAvailable && !isAuthenticating}
          />

          {error && <p className="text-red-500 dark:text-red-400 text-[12px] mt-2">{error}</p>}

          {/* Forgot Password Link */}
          <div className="mt-[2px]">
            <button
              onClick={handleForgotPassword}
              className="text-[13px] text-[#64748B] dark:text-gray-400 hover:underline text-left"
            >
              Forgot Master Password?
            </button>
          </div>
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
              onClick={handleBiometricUnlock}
              disabled={isAuthenticating}
              className="w-full h-[40px] bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-[8px] text-[14px] font-[500] text-[#26251e] dark:text-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
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

        {/* Unlock Button */}
        <button
          onClick={handleUnlock}
          disabled={!password.trim()}
          className="w-full h-[40px] text-[14px] bg-[#26251e] dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 text-white rounded-[8px] font-[500] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Unlock
        </button>

        {/* Additional Info */}
        <div className="text-center mt-8">
          <p className="text-[#94A3B8] dark:text-gray-400 text-[12px]">
            Your data is encrypted and secure
          </p>
        </div>
      </div>
    </div>
  )
}
