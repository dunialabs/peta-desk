'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Header from '@/components/common/header'
import { ChevronDown, RotateCcw } from 'lucide-react'

const timeOptions = [
  { label: '5 min', value: 5 },
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '1 hour', value: 60 },
  { label: 'Never', value: -1 }
]

export default function AutoLockTimerPage() {
  const [selectedTime, setSelectedTime] = useState(15)
  const [showResetDialog, setShowResetDialog] = useState(false)
  const [hasBiometricStep, setHasBiometricStep] = useState(false)
  const router = useRouter()

  // Check if biometric setup step was included
  useEffect(() => {
    const checkBiometricStep = async () => {
      if (typeof window !== 'undefined' && window.electron?.biometric) {
        try {
          const biometricResult = await window.electron.biometric.isAvailable()
          const hasBiometric = biometricResult.touchID || biometricResult.faceID || biometricResult.windowsHello
          setHasBiometricStep(hasBiometric)
        } catch (error) {
          console.error('Failed to check biometric availability:', error)
          setHasBiometricStep(false)
        }
      }
    }

    checkBiometricStep()
  }, [])

  const handleRefreshClick = () => {
    setShowResetDialog(true)
  }

  const handleResetCancel = () => {
    setShowResetDialog(false)
  }

  const handleResetConfirm = () => {
    setShowResetDialog(false)
    // Clear all onboarding data
    localStorage.removeItem('masterPasswordSet')
    localStorage.removeItem('autoLockTimer')
    localStorage.removeItem('biometric-settings')
    // Always navigate back to master password page
    router.push('/master-password')
  }

  const handleNext = async () => {
    // Save auto-lock timer setting
    localStorage.setItem('autoLockTimer', selectedTime.toString())

    // Check for installed apps
    if (window.electron && window.electron.checkInstalledApps) {
      try {
        const installedApps = await window.electron.checkInstalledApps()

        // Save detected apps and navigate to MCP setup
        localStorage.setItem('detectedApps', JSON.stringify(installedApps))
        router.push('/mcp-setup')
      } catch (error) {
        console.error('Error checking installed apps:', error)
        // Fallback to MCP setup on error
        router.push('/mcp-setup')
      }
    } else {
      // If running in browser without Electron, go to MCP setup
      router.push('/mcp-setup')
    }
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        showBackButton={true}
        onBack={() => setShowResetDialog(true)}
        showLockButton={false}
      />
      <div className="max-w-md mt-[100px] w-full flex-1 flex flex-col h-full justify-between">
        {/* Content area */}
        <div className="flex flex-col p-[16px]">
          {/* Progress indicator */}
          <div className="flex items-center gap-2 mb-[4px]">
            <span className="text-[#F56711] text-[12px] font-medium tracking-wider">
              INITIALIZATION
            </span>
            <div className="flex gap-1 flex-1">
              <div className="h-[2px] w-[10px] bg-[#D9D9D9] rounded-full"></div>
              {hasBiometricStep && (
                <div className="h-[2px] w-[10px] bg-[#D9D9D9] rounded-full"></div>
              )}
              <div className="h-[2px] w-[20px] bg-[#F56711] rounded-full"></div>
            </div>
          </div>

          {/* Title */}
            <h1 className="text-[30px] leading-[38px] mb-[8px] font-bold text-black dark:text-white">
            Set Auto-Lock Timer
          </h1>

          {/* Description */}
          <p className="text-[#7C8C94] text-[14px] leading-[22px]">
            Set how long your password stays active
            <br />
            After this time,your data automatically locks for security
          </p>
        </div>
        {/* Dropdown selector */}
        <div className="relative p-[16px]">
          <select
            value={selectedTime}
            onChange={(e) => setSelectedTime(parseInt(e.target.value))}
            className="w-full h-[48px] px-4 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg appearance-none bg-white dark:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-black focus:border-transparent text-[14px]"
          >
            {timeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown
            className="absolute right-[32px] top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none"
            size={20}
          />
        </div>

        {/* Next button - footer */}
        <div className="mt-auto p-[16px]">
          <button
            onClick={handleNext}
            className="w-full h-[40px] bg-[#26251e] hover:bg-gray-800 text-white text-[14px] font-[500] rounded-[8px] transition-colors"
          >
            Next
          </button>
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      {showResetDialog && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-[10px] p-[16px] max-w-[260px] w-full shadow-xl">
            <h2 className="text-[13px] font-bold text-center text-[#26251e] mb-[10px]">
              Start Configuration Over?
            </h2>
            <p className="text-[11px] text-center text-gray-900 dark:text-gray-100 leading-[14px] mb-[16px]">
              This will clear all current configuration
            </p>
            <div className="flex gap-[8px]">
              <button
                onClick={handleResetCancel}
                className="flex-1 h-[28px] rounded-[5px] bg-gray-100 dark:bg-gray-800 text-[#26251e] text-[13px] font-[400] transition-colors hover:bg-[rgba(0,0,0,0.15)] shadow-[inset_0_0.5px_0.5px_rgba(255,255,255,0.25)]"
              >
                Cancel
              </button>
              <button
                onClick={handleResetConfirm}
                className="flex-1 h-[28px] rounded-[5px] bg-[#26251E] hover:bg-[#3A3933] text-white text-[13px] font-medium transition-colors shadow-[inset_0_0.5px_0_rgba(255,255,255,0.35)]"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
