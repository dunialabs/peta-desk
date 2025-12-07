'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Switch } from '@/components/ui/switch'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import Header from '@/components/common/header'

interface SecuritySetting {
  id: string
  title: string
  description: string
  enabled: boolean
  type: 'switch' | 'button'
}

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

export default function SecuritySettingsPage() {
  const router = useRouter()
  const [settings, setSettings] = useState({
    requirePasswordOnStartup: true, // Enabled by default; cannot be disabled
    requirePasswordForSensitive: true, // Enabled by default; cannot be disabled
    fingerprint: true,
    faceId: false
  })

  const [biometricSettings, setBiometricSettings] = useState<
    BiometricSetting[]
  >([])
  const [biometricAvailable, setBiometricAvailable] =
    useState<BiometricAvailability | null>(null)
  const [isCheckingBiometric, setIsCheckingBiometric] = useState(true)
  const [showResetDialog, setShowResetDialog] = useState(false)

  const toggleSetting = (key: keyof typeof settings) => {
    // Do not allow these security settings to be disabled
    if (
      (key === 'requirePasswordOnStartup' ||
        key === 'requirePasswordForSensitive') &&
      settings[key] === true
    ) {
      // Return early if a disable attempt occurs
      return
    }

    const newValue = !settings[key]
    setSettings((prev) => ({
      ...prev,
      [key]: newValue
    }))

    // Store settings under a dedicated key
    if (key === 'requirePasswordOnStartup') {
      localStorage.setItem('require-password-on-startup', newValue.toString())
    } else if (key === 'requirePasswordForSensitive') {
      localStorage.setItem(
        'require-password-for-sensitive',
        newValue.toString()
      )
    }

    // Show success message
    const settingName =
      key === 'requirePasswordOnStartup'
        ? 'Password on startup'
        : key === 'requirePasswordForSensitive'
        ? 'Password for sensitive operations'
        : key
    console.info(`${settingName} ${newValue ? 'enabled' : 'disabled'}`)
  }

  const handleBack = () => {
    router.push('/dashboard')
  }

  // Load security settings
  useEffect(() => {
    const loadSecuritySettings = () => {
      try {
        // Force both settings to true when missing or false in localStorage
        const requirePasswordOnStartupStorage = localStorage.getItem(
          'require-password-on-startup'
        )
        const requirePasswordForSensitiveStorage = localStorage.getItem(
          'require-password-for-sensitive'
        )

        const requirePasswordOnStartup =
          requirePasswordOnStartupStorage === null
            ? true // Default on
            : requirePasswordOnStartupStorage === 'true'

        const requirePasswordForSensitive =
          requirePasswordForSensitiveStorage === null
            ? true // Default on
            : requirePasswordForSensitiveStorage === 'true'

        // Ensure both settings remain true
        setSettings((prev) => ({
          ...prev,
          requirePasswordOnStartup: true, // Force on
          requirePasswordForSensitive: true // Force on
        }))

        // Sync to localStorage to ensure correct values
        localStorage.setItem('require-password-on-startup', 'true')
        localStorage.setItem('require-password-for-sensitive', 'true')
      } catch (error) {
        console.error('Failed to load security settings:', error)
      }
    }

    loadSecuritySettings()
  }, [])

  // Check if returning from unlock-password; handle after biometricSettings loads
  useEffect(() => {
    // Process only after biometricSettings is available
    if (biometricSettings.length === 0) return

    const unlockSuccess = sessionStorage.getItem('unlock-success')
    const pendingSettingId = localStorage.getItem('pending-biometric-setting')

    if (unlockSuccess === 'true' && pendingSettingId) {
      // Clear the flag
      sessionStorage.removeItem('unlock-success')
      sessionStorage.removeItem('unlocked-password')
      localStorage.removeItem('pending-biometric-setting')

      // Enable biometric setting
      const updatedSettings = biometricSettings.map((s) =>
        s.id === pendingSettingId ? { ...s, enabled: true } : s
      )
      setBiometricSettings(updatedSettings)

      // Save to localStorage
      const settingsToSave = updatedSettings.reduce((acc, s) => {
        acc[s.id] = s.enabled
        return acc
      }, {} as Record<string, boolean>)
      localStorage.setItem('biometric-settings', JSON.stringify(settingsToSave))

      // toast.success('Biometric authentication enabled')
    } else if (unlockSuccess === 'false' && pendingSettingId) {
      // User canceled
      sessionStorage.removeItem('unlock-success')
      localStorage.removeItem('pending-biometric-setting')
    }
  }, [biometricSettings])

  useEffect(() => {
    const checkBiometricAvailability = async () => {
      try {
        if (typeof window !== 'undefined' && window.electron?.biometric) {
          const result = await window.electron.biometric.isAvailable()
          setBiometricAvailable(result)

          // Set biometric options based on platform/availability
          const settings: BiometricSetting[] = []

          if (result.platform === 'darwin' && result.touchID) {
            settings.push({
              id: 'touchid',
              title: 'Touch ID',
              description:
                'Use Touch ID to unlock instead of typing master password',
              enabled: false,
              available: true,
              type: 'switch'
            })
          }

          if (result.platform === 'win32' && result.windowsHello) {
            settings.push({
              id: 'windowshello',
              title: 'Windows Hello',
              description:
                'Use Windows Hello to unlock instead of typing master password',
              enabled: false,
              available: true,
              type: 'switch'
            })
          }

          // Load saved settings
          const savedSettings = localStorage.getItem('biometric-settings')
          if (savedSettings) {
            try {
              const parsed = JSON.parse(savedSettings)
              settings.forEach((setting) => {
                if (parsed[setting.id]) {
                  setting.enabled = parsed[setting.id]
                }
              })
            } catch (error) {
              console.error('Failed to parse saved biometric settings:', error)
            }
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
        // Enable biometrics - verify permissions first
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

          // After permission succeeds, go to unlock-password to verify master password
          // Save settingId to localStorage to continue after returning
          localStorage.setItem('pending-biometric-setting', settingId)
          router.push(
            `/unlock-password?returnUrl=${encodeURIComponent(
              '/security-settings'
            )}&purpose=enable-biometric`
          )
        } catch (error) {
          console.error('Failed to request biometric permission:', error)
          toast.error('Failed to request biometric permission')
        }
      } else {
        // Disable biometrics - just update state

        console.info('Biometric authentication disabled successfully')

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
        localStorage.setItem(
          'biometric-settings',
          JSON.stringify(settingsToSave)
        )
      }
    } catch (error) {
      console.error('Failed to toggle biometric setting:', error)
      toast.error('Failed to update biometric setting')
    }
  }

  // Handle Reset button click
  const handleResetClick = () => {
    setShowResetDialog(true)
  }

  // Confirm reset
  const handleConfirmReset = () => {
    setShowResetDialog(false)
    router.push('/reset-master-password')
  }

  // Cancel reset
  const handleCancelReset = () => {
    setShowResetDialog(false)
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header showSettingsButton={true} />

      <div className="max-w-md mx-auto mt-[14px] w-full flex-1 flex flex-col h-full justify-between">
        {/* Title */}
        <h1 className="text-[20px] leading-tight font-bold text-[#26251e] p-[16px]">
          Security Settings
        </h1>

        <div className="px-[16px] flex-1">
          {/* Basic Section */}
          <div className="mb-6">
            <h2 className="text-[14px] font-bold text-[#26251e] mb-[4px] leading-[22px]">
              Basic
            </h2>

            <div className="bg-white dark:bg-gray-900 rounded-[8px] border border-gray-200 dark:border-gray-700 px-[16px] py-[10px]">
              <div className="flex items-center justify-between py-[12px] border-b border-gray-200 dark:border-gray-700">
                <div className="flex-1 mr-4 min-w-0">
                  <div className="text-[14px] font-[400] leading-[22px] text-[#2A373D] mb-[2px]">
                    Require password on startup
                  </div>
                  <div className="text-[12px] text-[#7C8C94] leading-[20px] truncate">
                    Require master password every time the application st...
                  </div>
                </div>
                <Switch
                  checked={settings.requirePasswordOnStartup}
                  onCheckedChange={() =>
                    toggleSetting('requirePasswordOnStartup')
                  }
                  disabled={true}
                />
              </div>

              <div className="flex items-center justify-between py-[12px]">
                <div className="flex-1 mr-4 min-w-0">
                  <div className="text-[14px] font-[400] leading-[22px] text-[#2A373D] mb-[2px]">
                    Require password for sensitive operations
                  </div>
                  <div className="text-[12px] text-[#7C8C94] leading-[20px] truncate">
                    Require master password for security settings and sen...
                  </div>
                </div>
                <Switch
                  checked={settings.requirePasswordForSensitive}
                  onCheckedChange={() =>
                    toggleSetting('requirePasswordForSensitive')
                  }
                  disabled={true}
                />
              </div>
            </div>
          </div>

          {/* Biometric Authentication Section */}
          <div className="mb-6">
            <h2 className="text-[14px] font-bold text-[#26251e] mb-[4px] leading-[22px]">
              Biometric Authentication
            </h2>

            <div className="bg-white dark:bg-gray-900 rounded-[8px] border border-gray-200 dark:border-gray-700 px-[16px]">
              {/* Show loading state while checking biometric availability */}
              {isCheckingBiometric ? (
                <div className="py-[10px] text-sm text-gray-600 dark:text-gray-300">
                  Checking biometric availability...
                </div>
              ) : (
                <>
                  {/* Show Touch ID option when available */}
                  {biometricAvailable?.touchID && (
                    <div
                      className={`flex items-center justify-between py-[12px] ${
                        biometricAvailable?.faceID ||
                        biometricAvailable?.windowsHello
                          ? 'border-b border-gray-200 dark:border-gray-700'
                          : ''
                      }`}
                    >
                      <div className="flex-1 mr-4 min-w-0">
                        <div className="text-[14px] font-[400] leading-[22px] text-[#2A373D] mb-[2px]">
                          {biometricSettings.find((s) => s.id === 'touchid')
                            ?.title || 'Touch ID'}
                        </div>
                        <div className="text-[12px] text-[#7C8C94] leading-[20px] truncate">
                          {biometricSettings.find((s) => s.id === 'touchid')
                            ?.description ||
                            'Use Touch ID to unlock instead of typing master password'}
                        </div>
                      </div>
                      <Switch
                        checked={
                          biometricSettings.find((s) => s.id === 'touchid')
                            ?.enabled || false
                        }
                        onCheckedChange={() =>
                          toggleBiometricSetting('touchid')
                        }
                      />
                    </div>
                  )}

                  {/* Show Face ID option when available */}
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
                          Use Face ID to unlock instead of typing master
                          passwo...
                        </div>
                      </div>
                      <Switch
                        checked={
                          biometricSettings.find((s) => s.id === 'faceid')
                            ?.enabled || false
                        }
                        onCheckedChange={() => toggleBiometricSetting('faceid')}
                      />
                    </div>
                  )}

                  {/* Show Windows Hello option when available */}
                  {biometricAvailable?.windowsHello && (
                    <div className="flex items-center justify-between py-[12px]">
                      <div className="flex-1 mr-4 min-w-0">
                        <div className="text-[14px] font-[400] leading-[22px] text-[#2A373D] mb-[2px]">
                          {biometricSettings.find(
                            (s) => s.id === 'windowshello'
                          )?.title || 'Windows Hello'}
                        </div>
                        <div className="text-[12px] text-[#7C8C94] leading-[20px] truncate">
                          {biometricSettings.find(
                            (s) => s.id === 'windowshello'
                          )?.description ||
                            'Use Windows Hello to unlock instead of typing master password'}
                        </div>
                      </div>
                      <Switch
                        checked={
                          biometricSettings.find((s) => s.id === 'windowshello')
                            ?.enabled || false
                        }
                        onCheckedChange={() =>
                          toggleBiometricSetting('windowshello')
                        }
                      />
                    </div>
                  )}

                  {/* Show fallback when no biometric options are detected */}
                  {!biometricAvailable?.touchID &&
                    !biometricAvailable?.faceID &&
                    !biometricAvailable?.windowsHello && (
                      <div className="py-[10px] text-sm text-gray-500 dark:text-gray-400">
                        No biometric authentication options available on this
                        device.
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

          {/* Danger Zone Section */}
          <div>
            <h2 className="text-[14px] font-bold text-[#26251e] mb-[4px] leading-[22px]">
              Danger Zone
            </h2>

            <div className="bg-white dark:bg-gray-900 rounded-[8px] border border-gray-200 dark:border-gray-700 px-[16px]">
              <div className="flex items-center justify-between py-[12px]">
                <div className="flex-1 mr-4 min-w-0">
                  <div className="text-[14px] font-[400] leading-[22px] text-[#2A373D] mb-[2px]">
                    Reset Master Password
                  </div>
                  <div className="text-[12px] text-[#7C8C94] leading-[20px] truncate">
                    This will delete all data including server connections and
                    settings.This action cannot be undone.
                  </div>
                </div>
                <button
                  onClick={handleResetClick}
                  className="px-[12px] py-[4px] text-[14px] font-[500] text-[#0A0A0A] bg-white dark:bg-gray-900 border border-[#D1D1D6] rounded-[8px] hover:bg-[#FFF2F2] hover:text-[#9B2322] hover:border-[#FDCFCF] transition-colors"
                >
                  Reset
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Close Button */}
        <div className="mt-auto flex flex-row p-[16px] gap-[12px]">
          <button
            onClick={() => router.push('/dashboard')}
            className="w-full h-[40px] bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800 text-[#26251e] text-[14px] font-[500] rounded-[8px] transition-colors"
          >
            Close
          </button>
        </div>

        {/* Reset Confirmation Dialog */}
        {showResetDialog && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-900 rounded-[10px] p-[16px] max-w-[260px] w-full shadow-xl">
              <h2 className="text-[13px] font-bold text-center text-[#26251e] mb-[10px]">
                Reset Master Password?
              </h2>
              <p className="text-[11px] text-center text-gray-900 dark:text-gray-100 leading-[14px] mb-[16px]">
                This will delete all data including server connections and
                settings.This action cannot be undone.
              </p>
              <div className="flex gap-[8px]">
                <button
                  onClick={handleCancelReset}
                  className="flex-1 h-[28px] rounded-[5px] bg-gray-100 dark:bg-gray-800 text-[#26251e] text-[13px] font-[400] transition-colors hover:bg-[rgba(0,0,0,0.15)] shadow-[inset_0_0.5px_0.5px_rgba(255,255,255,0.25)]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReset}
                  className="flex-1 h-[28px] rounded-[5px] bg-[#26251E] hover:bg-[#3A3933] text-white text-[13px] font-medium transition-colors shadow-[inset_0_0.5px_0_rgba(255,255,255,0.35)]"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
