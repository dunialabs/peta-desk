'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Eye, EyeOff } from 'lucide-react'
import Header from '@/components/common/header'
export default function MasterPasswordPage() {
  const [masterPassword, setMasterPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isValid, setIsValid] = useState(false)
  const [showConfirmDialog, setShowConfirmDialog] = useState(false)
  const [hasBiometricSupport, setHasBiometricSupport] = useState(false)
  const router = useRouter()

  // Check if biometric is supported
  useEffect(() => {
    const checkBiometric = async () => {
      if (typeof window !== 'undefined' && window.electron?.biometric) {
        try {
          const biometricResult = await window.electron.biometric.isAvailable()
          const hasBiometric = biometricResult.touchID || biometricResult.faceID || biometricResult.windowsHello
          setHasBiometricSupport(hasBiometric)
        } catch (error) {
          console.error('Failed to check biometric availability:', error)
          setHasBiometricSupport(false)
        }
      }
    }

    checkBiometric()
  }, [])

  const handlePasswordChange = (value: string) => {
    setMasterPassword(value)
    setIsValid(value.length > 0 && value === confirmPassword)
  }

  const handleConfirmPasswordChange = (value: string) => {
    setConfirmPassword(value)
    setIsValid(masterPassword.length > 0 && masterPassword === value)
  }

  const handleCreatePasswordClick = () => {
    if (isValid) {
      setShowConfirmDialog(true)
    }
  }

  const handleConfirmReset = () => {
    setMasterPassword('')
    setConfirmPassword('')
    setIsValid(false)
    setShowConfirmDialog(false)
  }

  const handleConfirmContinue = async () => {
    setShowConfirmDialog(false)
    try {
      // Save master password using secure storage
      if (window.electron?.password) {
        const result = await window.electron.password.store(masterPassword)
        if (result.success) {
          // Only set localStorage flag for onboarding flow
          localStorage.setItem('masterPasswordSet', 'true')

          // Check if biometric authentication is available
          if (window.electron?.biometric) {
            try {
              const biometricResult = await window.electron.biometric.isAvailable()

              // If biometric is available (TouchID, FaceID, or Windows Hello), go to biometric setup
              if (biometricResult.touchID || biometricResult.faceID || biometricResult.windowsHello) {
                router.push('/biometric-setup')
              } else {
                // No biometric available, go directly to auto-lock-timer
                router.push('/auto-lock-timer')
              }
            } catch (error) {
              console.error('Failed to check biometric availability:', error)
              // On error, go directly to auto-lock-timer
              router.push('/auto-lock-timer')
            }
          } else {
            // No biometric API available, go directly to auto-lock-timer
            router.push('/auto-lock-timer')
          }
        } else {
          alert('Failed to save password: ' + (result.error || 'Unknown error'))
        }
      } else {
        alert('Password manager not available. Please restart the application.')
      }
    } catch (error) {
      console.error('Failed to save password:', error)
      alert('Failed to save password. Please try again.')
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header showLockButton={false} />
      <div className="max-w-md mt-[100px] w-full flex-1 flex flex-col h-full justify-between">
        {/* Content area */}
        <div className="flex-1 flex flex-col justify-center">
          <div className="p-[16px]">
            {/* Progress indicator */}
            <div className="flex items-center gap-2 mb-[4px]">
              <span className="text-[#F56711] text-[12px] font-medium tracking-wider">
                INITIALIZATION
              </span>
              <div className="flex gap-1 flex-1">
                <div className="h-[2px] w-[20px] bg-[#F56711] rounded-full"></div>
                {hasBiometricSupport && (
                  <div className="h-[2px] w-[10px] bg-[#D9D9D9] dark:bg-gray-600 rounded-full"></div>
                )}
                <div className="h-[2px] w-[10px] bg-[#D9D9D9] dark:bg-gray-600 rounded-full"></div>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-[30px] leading-[38px] mb-[8px] font-bold text-black dark:text-white">
              Set Your Master Password
            </h1>

            {/* Warning message */}
            <div className="space-y-[8px]">
              <div className="bg-[#EFF6FF] dark:bg-blue-900/20 border border-[#BFDBFE] dark:border-blue-800 rounded-[12px] p-[12px]">
                <p className="text-[#1D40AF] dark:text-blue-300 text-[14px] leading-[22px]">
                  This password cannot be recovered. Make sure to remember it or
                  store it in a secure location.
                </p>
              </div>
              <div className="bg-[#EFF6FF] dark:bg-blue-900/20 border border-[#BFDBFE] dark:border-blue-800 rounded-lg p-4">
                <p className="text-[#1E40AF] dark:text-blue-300 text-[14px]">
                  You will need to enter it when launching the app and
                  performing sensitive operations.
                </p>
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="space-y-[24px] p-[16px]">
            {/* Master Password */}
            <div>
              <label className="text-[14px] font-[700] text-[#040B0F] dark:text-gray-100 mb-[4px] block">
                Master Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={masterPassword}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  placeholder="Enter master password"
                  className="w-full h-[48px] px-4 pr-12 border border-[rgba(4, 11, 15, 0.10)] dark:border-gray-700 rounded-[8px] focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-200"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>

            {/* Repeated Master Password */}
            <div>
              <label className="text-[14px] font-[700] text-[#040B0F] dark:text-gray-100 mb-[4px] block">
                Repeated Master Password
              </label>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                  placeholder="Repeated master password"
                  className="w-full h-[48px] px-4 pr-12 border border-[rgba(4, 11, 15, 0.10)] dark:border-gray-700 rounded-[8px] focus:outline-none focus:ring-2 focus:ring-black dark:focus:ring-white focus:border-transparent bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-200"
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} />
                  ) : (
                    <Eye size={20} />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Create Password button - footer */}
        <div className="mt-auto p-[16px]">
          <button
            onClick={handleCreatePasswordClick}
            disabled={!isValid}
            className="w-full h-[40px] bg-[#26251e] dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 text-white text-[14px] font-[500] rounded-[8px] disabled:opacity-30 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 20 20"
              fill="none"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M14 7V5C14 2.79086 12.2091 1 10 1C7.79086 1 6 2.79086 6 5V7M10 12V14M5 19H15C16.1046 19 17 18.1046 17 17V9C17 7.89543 16.1046 7 15 7H5C3.89543 7 3 7.89543 3 9V17C3 18.1046 3.89543 19 5 19Z"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
            Create Password
          </button>
        </div>
      </div>

      {/* Confirmation Dialog */}
      {showConfirmDialog && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-[10px] p-[16px] max-w-[260px] w-full shadow-xl">
            <h2 className="text-[13px] font-bold text-center text-[#26251e] dark:text-gray-100 mb-[10px]">
              Important
            </h2>
            <p className="text-[11px] text-center text-gray-900 dark:text-gray-100 leading-[14px] mb-[16px]">
              This password cannot be recovered. Make sure to remember it or
              store it in a secure location.
            </p>
            <div className="flex gap-[8px]">
              <button
                onClick={handleConfirmReset}
                className="flex-1 h-[28px] rounded-[5px] bg-gray-100 dark:bg-gray-800 text-[#26251e] dark:text-gray-100 text-[13px] font-[400] transition-colors hover:bg-[rgba(0,0,0,0.15)] dark:hover:bg-gray-700 shadow-[inset_0_0.5px_0.5px_rgba(255,255,255,0.25)]"
              >
                Reset
              </button>
              <button
                onClick={handleConfirmContinue}
                className="flex-1 h-[28px] rounded-[5px] bg-[#26251E] dark:bg-gray-700 hover:bg-[#3A3933] dark:hover:bg-gray-600 text-white text-[13px] font-medium transition-colors shadow-[inset_0_0.5px_0_rgba(255,255,255,0.35)]"
              >
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
