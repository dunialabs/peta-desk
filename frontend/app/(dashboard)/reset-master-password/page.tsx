'use client'

import { useState } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'

export default function ResetMasterPasswordPage() {
  const [confirmText, setConfirmText] = useState('')
  const router = useRouter()

  const expectedText = 'Reset Peta Desk'
  const isValid = confirmText === expectedText

  const handleReset = async () => {
    if (!isValid) return

    try {
      // Clear all stored data including master password
      if (window.electron?.password) {
        await window.electron.password.remove()
      }

      // Clear all localStorage data
      localStorage.clear()

      // Clear all sessionStorage data
      sessionStorage.clear()

      // Redirect to initial setup or login page
      router.push('/master-password')
    } catch (error) {
      console.error('Failed to reset data:', error)
      alert('Failed to reset data. Please try again.')
    }
  }

  const handleCancel = () => {
    // Return to security settings page
    router.push('/security-settings')
  }

  return (
    <div className="h-screen flex justify-center">
      <div className="w-full max-w-md mx-auto px-4 h-full flex flex-col justify-between py-4">
        {/* Top Content */}
        <div className="flex flex-col gap-[24px]">
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
                  This action will permanently delete all local data, including server connection information, settings, and configurations. This operation cannot be undone. Please make sure you have backed up any important data before proceeding.
                </p>
              </div>
            </div>
          </div>

          {/* Confirmation Input */}
          <div>
            <div className="text-[14px] font-[700] text-[#040B0F] dark:text-gray-100 mb-[4px]">
              Type &quot;{expectedText}&quot; to confirm:
            </div>
            <div className="relative">
              {/* Persistent hint background layer */}
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
        </div>

        {/* Bottom Buttons */}
        <div className="flex gap-[16px]">
          <Button
            onClick={handleCancel}
            variant="outline"
            className="flex-1 h-[40px] text-[14px] border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800 text-[#26251e] dark:text-gray-100 rounded-[8px] font-[500] transition-colors"
          >
            Cancel
          </Button>

          <Button
            onClick={handleReset}
            disabled={!isValid}
            className="flex-1 h-[40px] text-[14px] bg-[#26251e] dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 text-white rounded-[8px] font-[500] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Reset and Clear All Data
          </Button>
        </div>
      </div>
    </div>
  )
}
