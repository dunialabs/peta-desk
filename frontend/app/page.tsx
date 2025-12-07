/*
 * @Author: xudada 1820064201@qq.com
 * @Date: 2025-08-14 15:59:28
 * @LastEditors: xudada 1820064201@qq.com
 * @LastEditTime: 2025-08-18 16:15:59
 * @FilePath: /peta-desk/frontend/app/page.tsx
 * Landing page entry
 */
/*
 * @Author: xudada 1820064201@qq.com
 * @Date: 2025-08-12 18:37:33
 * @LastEditors: xudada 1820064201@qq.com
 * @LastEditTime: 2025-08-13 14:17:29
 * @FilePath: /peta-desk/frontend/app/page.tsx
 * Peta Desk landing page
 */
'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useTheme } from '@/contexts/theme-context'
export default function Home() {
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()
  const { actualTheme } = useTheme()
  useEffect(() => {
    // Check if user has completed onboarding
    const checkOnboardingStatus = () => {
      const onboardingCompleted = localStorage.getItem('onboardingCompleted')
      const masterPasswordSet = localStorage.getItem('masterPasswordSet')
      const autoLockTimer = localStorage.getItem('autoLockTimer')
      const mcpServerConnected = localStorage.getItem('mcpServerConnected')

      // Check if there's a pending reconnect that will handle navigation
      const hasPendingReconnect = localStorage.getItem('pending-reconnect-callback') === 'true'

      // Set loading to false before navigation
      setIsLoading(false)

      // If there's a pending reconnect, don't navigate - let the reconnect flow handle it
      if (hasPendingReconnect) {
        console.log('⏸️ Pending reconnect detected, skipping onboarding navigation')
        return
      }

      // Check if this is a brand new user
      if (!onboardingCompleted && !masterPasswordSet) {
        // First time user - start with welcome page
        router.push('/welcome')
      } else if (!masterPasswordSet) {
        // User has seen onboarding but hasn't set password
        router.push('/master-password')
      } else if (!autoLockTimer) {
        router.push('/auto-lock-timer')
      } else if (!mcpServerConnected) {
        router.push('/mcp-setup')
      } else {
        // User has completed onboarding - go to dashboard
        router.push('/dashboard')

        // After a short delay, minimize to tray (optional)
        setTimeout(() => {
          if (
            (window as any).electron &&
            (window as any).electron.minimizeToTray
          ) {
            ;(window as any).electron.minimizeToTray()
          }
        }, 3000) // 3 seconds delay to show dashboard first
      }
    }

    // Small delay to avoid flash
    const timer = setTimeout(checkOnboardingStatus, 100)
    return () => clearTimeout(timer)
  }, [])

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white dark:bg-gray-950">
        <div className="text-center">
          <div className="mx-auto mb-4">
            <img
              src={actualTheme === 'dark' ? '/images/darkLogo.svg' : '/images/lightLogo.svg'}
              alt="Peta Desk"
              className="h-16 mx-auto"
            />
          </div>
          <div className="text-slate-700 dark:text-gray-300 font-medium">Loading...</div>
        </div>
      </div>
    )
  }

  return null
}
