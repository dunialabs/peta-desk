'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import Header from '@/components/common/header'

interface BiometricSetting {
  id: string
  title: string
  description: string
  enabled: boolean
  available: boolean
  type: 'switch'
}

interface BiometricAvailability {
  available: boolean
  platform: string
  touchID: boolean
  faceID: boolean
  windowsHello: boolean
  error: string | null
}

export default function BiometricSetupPage() {
  const router = useRouter()
  const [biometricSettings, setBiometricSettings] = useState<BiometricSetting[]>([])
  const [biometricAvailable, setBiometricAvailable] = useState<BiometricAvailability | null>(null)
  const [isCheckingBiometric, setIsCheckingBiometric] = useState(true)
  const [showResetDialog, setShowResetDialog] = useState(false)

  // Check biometric availability
  useEffect(() => {
    const checkBiometricAvailability = async () => {
      try {
        if (typeof window !== 'undefined' && window.electron?.biometric) {
          const result = await window.electron.biometric.isAvailable()
          setBiometricAvailable(result)

          // Set biometric options based on platform and availability
          const settings: BiometricSetting[] = []

          if (result.platform === 'darwin' && result.touchID) {
            settings.push({
              id: 'touchid',
              title: 'Touch ID',
              description: 'Use Touch ID to unlock instead of typing master password',
              enabled: false,
              available: true,
              type: 'switch'
            })
          }

          if (result.platform === 'win32' && result.windowsHello) {
            settings.push({
              id: 'windowshello',
              title: 'Windows Hello',
              description: 'Use Windows Hello to unlock instead of typing master password',
              enabled: false,
              available: true,
              type: 'switch'
            })
          }

          setBiometricSettings(settings)
        }
      } catch (error) {
        console.error('Failed to check biometric availability:', error)
        toast.error('Failed to check biometric availability')
      } finally {
        setIsCheckingBiometric(false)
      }
    }

    checkBiometricAvailability()
  }, [])

  // Toggle biometric setting
  const toggleBiometricSetting = async (settingId: string) => {
    const setting = biometricSettings.find((s) => s.id === settingId)
    if (!setting) return

    try {
      if (!setting.enabled) {
        // Enable biometric - request permission first
        try {
          // Request biometric permission
          const authResult = await window.electron.biometric.authenticate(
            'Enable biometric authentication'
          )

          if (!authResult.success) {
            toast.error(`Permission denied: ${authResult.error}`)
            return
          }

          console.info('Biometric permission granted')

          // Update state
          const updatedSettings = biometricSettings.map((s) =>
            s.id === settingId ? { ...s, enabled: true } : s
          )
          setBiometricSettings(updatedSettings)

          // Save to localStorage
          const settingsToSave = updatedSettings.reduce((acc, s) => {
            acc[s.id] = s.enabled
            return acc
          }, {} as Record<string, boolean>)
          localStorage.setItem('biometric-settings', JSON.stringify(settingsToSave))

          // toast.success('Biometric authentication enabled')
        } catch (error) {
          console.error('Failed to request biometric permission:', error)
          toast.error('Failed to request biometric permission')
        }
      } else {
        // Disable biometric - just update state
        console.info('Biometric authentication disabled')

        // Update state
        const updatedSettings = biometricSettings.map((s) =>
          s.id === settingId ? { ...s, enabled: false } : s
        )
        setBiometricSettings(updatedSettings)

        // Save to localStorage
        const settingsToSave = updatedSettings.reduce((acc, s) => {
          acc[s.id] = s.enabled
          return acc
        }, {} as Record<string, boolean>)
        localStorage.setItem('biometric-settings', JSON.stringify(settingsToSave))
      }
    } catch (error) {
      console.error('Failed to toggle biometric setting:', error)
      toast.error('Failed to update biometric setting')
    }
  }

  const handleNext = () => {
    // Navigate to auto-lock-timer
    router.push('/auto-lock-timer')
  }

  const handleResetClick = () => {
    setShowResetDialog(true)
  }

  const handleResetConfirm = () => {
    setShowResetDialog(false)
    // Clear all onboarding data
    localStorage.removeItem('masterPasswordSet')
    localStorage.removeItem('autoLockTimer')
    localStorage.removeItem('biometric-settings')
    // Navigate back to master password page
    router.push('/master-password')
  }

  const handleResetCancel = () => {
    setShowResetDialog(false)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header
        showBackButton={true}
        onBack={handleResetClick}
        showLockButton={false}
      />
      <div className="max-w-md mt-[100px] w-full flex-1 flex flex-col h-full justify-between">
        {/* Content */}
        <div className="flex-1 flex flex-col">
          <div className="p-[16px]">
            {/* Progress Indicator */}
            <div className="flex items-center gap-2 mb-[4px]">
              <span className="text-[#F56711] text-[12px] font-medium tracking-wider">
                INITIALIZATION
              </span>
              <div className="flex gap-1 flex-1">
                <div className="h-[2px] w-[10px] bg-[#D9D9D9] rounded-full"></div>
                <div className="h-[2px] w-[20px] bg-[#F56711] rounded-full"></div>
                <div className="h-[2px] w-[10px] bg-[#D9D9D9] rounded-full"></div>
              </div>
            </div>

            {/* Title */}
            <h1 className="text-[30px] leading-[38px] mb-[8px] font-bold text-black dark:text-white">
              Set Up Biometric Authentication
            </h1>

            {/* Description */}
            <p className="text-[#7C8C94] text-[14px] leading-[22px]">
              Use biometric authentication to unlock the app instead of typing your master password every time.
            </p>
          </div>

          {/* Biometric Options */}
          <div className="px-[16px] mt-6">
            <div className="bg-white dark:bg-gray-900 rounded-[8px] border border-gray-200 dark:border-gray-700 px-[16px]">
              {/* If checking biometric availability, show loading state */}
              {isCheckingBiometric ? (
                <div className="py-[10px] text-sm text-gray-600 dark:text-gray-300">
                  Checking biometric availability...
                </div>
              ) : (
                <>
                  {/* If Touch ID detected, show Touch ID option */}
                  {biometricAvailable?.touchID && (
                    <div
                      className={`flex items-center justify-between py-[12px] ${
                        biometricAvailable?.faceID || biometricAvailable?.windowsHello
                          ? 'border-b border-gray-200 dark:border-gray-700'
                          : ''
                      }`}
                    >
                      <div className="flex-1 mr-4 min-w-0">
                        <div className="text-[14px] font-[400] leading-[22px] text-[#2A373D] mb-[2px]">
                          {biometricSettings.find((s) => s.id === 'touchid')?.title || 'Touch ID'}
                        </div>
                        <div className="text-[12px] text-[#7C8C94] leading-[20px] truncate">
                          {biometricSettings.find((s) => s.id === 'touchid')?.description || 'Use Touch ID to unlock instead of typing master password'}
                        </div>
                      </div>
                      <Switch
                        checked={biometricSettings.find((s) => s.id === 'touchid')?.enabled || false}
                        onCheckedChange={() => toggleBiometricSetting('touchid')}
                      />
                    </div>
                  )}

                  {/* If Face ID detected, show Face ID option */}
                  {biometricAvailable?.faceID && (
                    <div
                      className={`flex items-center justify-between py-[12px] ${
                        biometricAvailable?.windowsHello
                          ? 'border-b border-gray-200 dark:border-gray-700'
                          : ''
                      }`}
                    >
                      <div className="flex-1 mr-4 min-w-0">
                        <div className="text-[14px] font-[400] leading-[22px] text-[#2A373D] mb-[2px]">
                          FaceID
                        </div>
                        <div className="text-[12px] text-[#7C8C94] leading-[20px] truncate">
                          Use Face ID to unlock instead of typing master passwo...
                        </div>
                      </div>
                      <Switch
                        checked={biometricSettings.find((s) => s.id === 'faceid')?.enabled || false}
                        onCheckedChange={() => toggleBiometricSetting('faceid')}
                      />
                    </div>
                  )}

                  {/* If Windows Hello detected, show Windows Hello option */}
                  {biometricAvailable?.windowsHello && (
                    <div className="flex items-center justify-between py-[12px]">
                      <div className="flex-1 mr-4 min-w-0">
                        <div className="text-[14px] font-[400] leading-[22px] text-[#2A373D] mb-[2px]">
                          Windows Hello
                        </div>
                        <div className="text-[12px] text-[#7C8C94] leading-[20px] truncate">
                          Use Windows Hello to unlock instead of typing master password
                        </div>
                      </div>
                      <Switch
                        checked={biometricSettings.find((s) => s.id === 'windowshello')?.enabled || false}
                        onCheckedChange={() => toggleBiometricSetting('windowshello')}
                      />
                    </div>
                  )}

                  {/* If no biometric options detected */}
                  {!biometricAvailable?.touchID &&
                    !biometricAvailable?.faceID &&
                    !biometricAvailable?.windowsHello && (
                      <div className="py-[10px] text-sm text-gray-500 dark:text-gray-400">
                        No biometric authentication options available on this device.
                      </div>
                    )}

                  {/* Show error message */}
                  {biometricAvailable?.error && (
                    <div className="py-[10px] text-xs text-red-500 dark:text-red-400">
                      {biometricAvailable.error}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Buttons */}
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
