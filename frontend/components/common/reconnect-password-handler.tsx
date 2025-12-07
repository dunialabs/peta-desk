'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ServerConfig } from '@/contexts/socket-context'
import { useLock } from '@/contexts/lock-context'

// MCP server format read from localStorage
interface StoredMCPServer {
  id: string
  serverName: string
  serverUrl: string
  token: string  // Encrypted token
}

/**
 * Reconnect password handler
 * Listens for password request events during Socket reconnection, prompts user to enter master password to decrypt tokens
 */
export function ReconnectPasswordHandler() {
  const router = useRouter()
  const { unlockApp } = useLock()

  useEffect(() => {
    const handlePasswordRequest = async (event: CustomEvent) => {
      console.log('🔐 Received password request for reconnect')
      const { servers, onDecrypted, onCancel } = event.detail

      // Store reconnect data in localStorage
      localStorage.setItem('pending-reconnect-servers', JSON.stringify(servers))
      localStorage.setItem('pending-reconnect-callback', 'true')

      // Store callbacks in a global variable since they can't be serialized
      ;(window as any).__reconnectCallbacks = { onDecrypted, onCancel }

      // After reconnect, always go to dashboard
      const returnUrl = '/dashboard'
      const unlockUrl = `/unlock-password?returnUrl=${encodeURIComponent(returnUrl)}&purpose=reconnect`

      console.log('🔀 Redirecting to unlock-password page:', unlockUrl)

      // Redirect to unlock-password page
      router.push(unlockUrl)

      console.log('✅ Navigation triggered')
    }

    window.addEventListener('request-master-password-for-reconnect', handlePasswordRequest as any)

    return () => {
      window.removeEventListener('request-master-password-for-reconnect', handlePasswordRequest as any)
    }
  }, [router])

  // Check if returning from unlock-password page with reconnect purpose
  useEffect(() => {
    // Add a small delay to ensure all state is updated after navigation
    const checkTimer = setTimeout(async () => {
      const unlockSuccess = sessionStorage.getItem('unlock-success')
      const unlockedPassword = sessionStorage.getItem('unlocked-password')
      const hasPendingReconnect = localStorage.getItem('pending-reconnect-callback') === 'true'

      console.log('🔍 Checking reconnect state:', { unlockSuccess, hasPassword: !!unlockedPassword, hasPendingReconnect })

      if (unlockSuccess === 'true' && unlockedPassword && hasPendingReconnect) {
        console.log('🔓 Processing reconnection with decrypted password...')

        // Clear flags first
        sessionStorage.removeItem('unlock-success')
        localStorage.removeItem('pending-reconnect-callback')

        // Also unlock the app if it was locked
        const wasLockedBeforeRestart = localStorage.getItem('app-locked-state') === 'true'
        const requirePasswordOnStartup = localStorage.getItem('require-password-on-startup') === 'true'
        if (wasLockedBeforeRestart || requirePasswordOnStartup) {
          console.log('🔓 Also unlocking the application...')
          await unlockApp(unlockedPassword)
        }

        // Get stored servers
        const serversStr = localStorage.getItem('pending-reconnect-servers')
        if (serversStr) {
          const servers = JSON.parse(serversStr) as StoredMCPServer[]
          localStorage.removeItem('pending-reconnect-servers')

          console.log('📋 Found servers to reconnect:', servers)

          // Get callbacks
          const callbacks = (window as any).__reconnectCallbacks
          if (callbacks?.onDecrypted) {
            console.log('✅ Found onDecrypted callback, starting decryption...')
            // Decrypt tokens and wait for connection to complete
            await decryptAndReconnect(servers, unlockedPassword, callbacks.onDecrypted)
            delete (window as any).__reconnectCallbacks

            // After connection is complete, navigate to dashboard
            console.log('🔀 All connections complete, navigating to dashboard...')
            router.push('/dashboard')
          } else {
            console.error('❌ No onDecrypted callback found!')
          }
        } else {
          console.error('❌ No pending reconnect servers found!')
        }

        // Clear password
        sessionStorage.removeItem('unlocked-password')
      } else if (unlockSuccess === 'false' && hasPendingReconnect) {
        // User cancelled
        console.log('ℹ️ User cancelled reconnect password prompt')
        sessionStorage.removeItem('unlock-success')
        localStorage.removeItem('pending-reconnect-callback')
        localStorage.removeItem('pending-reconnect-servers')

        const callbacks = (window as any).__reconnectCallbacks
        if (callbacks?.onCancel) {
          callbacks.onCancel()
          delete (window as any).__reconnectCallbacks
        }
      }
    }, 100)

    return () => clearTimeout(checkTimer)
  }, [router])  // Add router to dependencies to trigger on navigation

  const decryptAndReconnect = async (
    servers: StoredMCPServer[],
    password: string,
    onDecrypted: (servers: ServerConfig[]) => Promise<void>
  ) => {
    console.log('🔐 Starting decryptAndReconnect with', servers.length, 'servers')

    if (!window.electron?.crypto) {
      console.error('❌ Crypto API not available')
      return
    }

    try {
      const decryptedServers: ServerConfig[] = []

      for (const server of servers) {
        console.log(`🔓 Decrypting token for server: ${server.serverName}`)
        if (server.token) {
          const decryptResult = await window.electron.crypto.decryptToken(
            server.token,
            password
          )

          if (decryptResult.success) {
            const serverConfig = {
              id: server.id,
              name: server.serverName,
              url: server.serverUrl,
              token: decryptResult.token
            }
            decryptedServers.push(serverConfig)
            console.log(`✅ Token decrypted for server: ${server.serverName}`, serverConfig)
          } else {
            console.error(`❌ Failed to decrypt token for ${server.serverName}:`, decryptResult.error)
          }
        } else {
          console.warn(`⚠️ Server ${server.serverName} has no token`)
        }
      }

      if (decryptedServers.length > 0) {
        console.log(`✅ Successfully decrypted ${decryptedServers.length} token(s), calling onDecrypted callback...`)
        console.log('Decrypted servers:', decryptedServers)
        await onDecrypted(decryptedServers)
        console.log('✅ onDecrypted callback completed, servers connected')
      } else {
        console.error('❌ No tokens were successfully decrypted')
      }
    } catch (error) {
      console.error('❌ Error during token decryption:', error)
    }
  }

  return null // This component now only handles redirects and callbacks
}
