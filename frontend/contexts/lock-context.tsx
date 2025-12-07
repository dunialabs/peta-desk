/*
 * @Author: xudada 1820064201@qq.com
 * @Date: 2025-08-13 13:06:29
 * @LastEditors: xudada 1820064201@qq.com
 * @LastEditTime: 2025-08-13 13:12:18
 * @FilePath: /peta-desk/frontend/contexts/lock-context.tsx
 * @Description: Lock context for managing application lock state
 */
'use client'

import React, { createContext, useContext, useState, useEffect } from 'react'
interface LockContextType {
  isLocked: boolean
  lockApp: (userInitiated?: boolean) => void
  unlockApp: (password: string) => Promise<boolean>
  previousPath: string | null
  updateAutoLockTimer: (minutes: number) => void
  autoLockTimer: number
  isUserInitiatedLock: boolean
}

const LockContext = createContext<LockContextType | undefined>(undefined)

export function LockProvider({ children }: { children: React.ReactNode }) {
  const [isLocked, setIsLocked] = useState(false)
  const [previousPath, setPreviousPath] = useState<string | null>(null)
  const [isUserInitiatedLock, setIsUserInitiatedLock] = useState(false)
  const [autoLockTimer, setAutoLockTimer] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('autoLockTimer')
      return saved ? parseInt(saved) : -1 // Default -1 means not configured, no auto-lock
    }
    return -1
  })

  // Common function: update enable status of all proxies
  const updateAllProxiesStatus = async (enabled: boolean, reason: string) => {
    if (typeof window === 'undefined' || !window.electron?.proxy?.updateEnableStatus) {
      return
    }

    // Cache electron API reference to avoid repeated access
    const { proxy } = window.electron

    try {
      // Get cached dashboard data from localStorage
      const cachedData = localStorage.getItem('dashboardData')
      const current = cachedData ? JSON.parse(cachedData) : {}

      if (current.proxyStates && typeof current.proxyStates === 'object') {
        // Iterate through all proxy states, using each proxy's configId
        Object.values(current.proxyStates).forEach((proxyState: any) => {
          try {
            if (proxyState.configId) {
              proxy.updateEnableStatus(proxyState.configId, enabled, reason)
              console.log(`Updated proxy status for ${proxyState.configId}:`, enabled, reason)
            }
          } catch (proxyError) {
            console.error(`Failed to update proxy status for ${proxyState.configId}:`, proxyError)
          }
        })
      } else {
        console.warn('No proxy states found in dashboard cache')
      }
    } catch (error) {
      console.error(`Failed to ${enabled ? 'enable' : 'disable'} proxies:`, error)
    }
  }

  const lockApp = async (userInitiated = false) => {
    // Check if master password is set before allowing lock
    if (typeof window !== 'undefined') {
      const masterPasswordSet = localStorage.getItem('masterPasswordSet')
      if (!masterPasswordSet) {
        console.log('Cannot lock app: Master password not set')
        return
      }

      // If there's an open authorization confirmation dialog, notify SocketProvider to save the request
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('app-locking', {
          detail: { userInitiated }
        }))
      }

      // Save current path before locking
      setPreviousPath(window.location.pathname)

      // Record if lock was user-initiated (only for current session)
      setIsUserInitiatedLock(userInitiated)

      // Persist lock state to survive app restart
      localStorage.setItem('app-locked-state', 'true')

      // Sync lock status to main process
      if (window.electron?.setLockStatus) {
        try {
          await window.electron.setLockStatus({
            isLocked: true,
            lockedAt: new Date().toISOString()
          })
        } catch (error) {
          console.error('Failed to sync lock status to main process:', error)
        }
      }
    }

    // Notify all proxies to disable when app locks
    await updateAllProxiesStatus(false, 'Application locked by auto-lock timer')

    setIsLocked(true)
  }

  const unlockApp = async (password: string) => {
    try {
      // Use secure password verification
      if (typeof window !== 'undefined' && window.electron?.password) {
        const result = await window.electron.password.verify(password)
        if (result.success) {
          setIsLocked(false)
          setIsUserInitiatedLock(false)
          // Clear persisted lock state after successful unlock
          localStorage.removeItem('app-locked-state')

          // Sync unlock status to main process
          if (window.electron?.setLockStatus) {
            try {
              await window.electron.setLockStatus({
                isLocked: false,
                lockedAt: null
              })
            } catch (error) {
              console.error('Failed to sync unlock status to main process:', error)
            }
          }

          // Notify all proxies to enable after successful unlock
          await updateAllProxiesStatus(true, 'Application unlocked successfully')

          return true
        }
      }
    } catch (error) {
      console.error('Failed to verify password:', error)
    }
    return false
  }

  const updateAutoLockTimer = (minutes: number) => {
    setAutoLockTimer(minutes)
    if (typeof window !== 'undefined') {
      localStorage.setItem('autoLockTimer', minutes.toString())
    }
  }

  // Check startup lock requirement only once on app start
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Use a session flag to ensure this only runs once per app session
      const hasCheckedStartup = sessionStorage.getItem('has-checked-startup-lock')
      if (!hasCheckedStartup) {
        // Check if app was locked before restart
        const wasLockedBeforeRestart = localStorage.getItem('app-locked-state') === 'true'
        const requirePasswordOnStartup = localStorage.getItem('require-password-on-startup') === 'true'

        const needsLock = wasLockedBeforeRestart || requirePasswordOnStartup

        if (needsLock) {
          // Check if there are servers that need reconnection (encrypted tokens)
          const mcpServers = localStorage.getItem('mcpServers')
          const hasPendingReconnect = mcpServers && JSON.parse(mcpServers).length > 0

          if (hasPendingReconnect) {
            // If there are servers pending reconnect, skip app lock screen
            // The socket reconnect flow will handle password input via unlock-password page
            console.log('🔄 Skipping app lock screen, socket reconnect will handle password')
          } else {
            // No servers to reconnect, show app lock screen
            setIsLocked(true)
            setIsUserInitiatedLock(false)
          }
        }
        sessionStorage.setItem('has-checked-startup-lock', 'true')
      }
    }
  }, [])

  // Auto-lock timer functionality
  useEffect(() => {
    if (autoLockTimer === -1) return // Never lock or not configured

    // Don't start auto-lock timer if master password is not set
    if (typeof window !== 'undefined') {
      const masterPasswordSet = localStorage.getItem('masterPasswordSet')
      if (!masterPasswordSet) {
        console.log('Auto-lock disabled: Master password not set')
        return
      }

      // Check if auto-lock timer is already configured
      const autoLockConfigured = localStorage.getItem('autoLockTimer')
      if (!autoLockConfigured) {
        console.log('Auto-lock disabled: Auto-lock timer not configured')
        return
      }
    }

    const timeoutMs = autoLockTimer * 60 * 1000

    let timeout: NodeJS.Timeout

    const resetTimeout = () => {
      if (timeout) clearTimeout(timeout)
      if (!isLocked) {
        timeout = setTimeout(() => {
          lockApp()
        }, timeoutMs)
      }
    }

    const handleActivity = () => {
      resetTimeout()
    }

    // Listen for user activity (only in browser)
    if (typeof window !== 'undefined') {
      window.addEventListener('mousedown', handleActivity)
      window.addEventListener('keydown', handleActivity)
      window.addEventListener('scroll', handleActivity)

      // Start initial timeout
      resetTimeout()

      return () => {
        if (timeout) clearTimeout(timeout)
        window.removeEventListener('mousedown', handleActivity)
        window.removeEventListener('keydown', handleActivity)
        window.removeEventListener('scroll', handleActivity)
      }
    }
  }, [isLocked, autoLockTimer])

  return (
    <LockContext.Provider
      value={{
        isLocked,
        lockApp,
        unlockApp,
        previousPath,
        updateAutoLockTimer,
        autoLockTimer,
        isUserInitiatedLock
      }}
    >
      {children}
    </LockContext.Provider>
  )
}

export function useLock() {
  const context = useContext(LockContext)
  if (context === undefined) {
    throw new Error('useLock must be used within a LockProvider')
  }
  return context
}
