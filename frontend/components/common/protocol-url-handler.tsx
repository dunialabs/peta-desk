'use client'

import { useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'

/**
 * Listen for protocol URL events and forward to the handler page
 */
export function ProtocolUrlHandler() {
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    console.log('[Protocol URL Handler] Component mounted')
    console.log('[Protocol URL Handler] window.electron available:', !!window.electron)
    console.log('[Protocol URL Handler] ipcRenderer available:', !!window.electron?.ipcRenderer)

    if (typeof window === 'undefined' || !window.electron?.ipcRenderer) {
      console.warn('[Protocol URL Handler] window.electron or ipcRenderer not available')
      return
    }

    console.log('[Protocol URL Handler] Registering event listener for custom-url-received')

    const handleCustomUrl = (event: any, data: any) => {
      console.log('[Protocol URL Handler] ==================== RECEIVED CUSTOM URL EVENT ====================')
      console.log('[Protocol URL Handler] Event:', event)
      console.log('[Protocol URL Handler] Data:', data)
      console.log('[Protocol URL Handler] Data structure:', JSON.stringify(data, null, 2))
      console.log('[Protocol URL Handler] Current pathname:', pathname)

      // Validate payload
      if (!data) {
        console.error('[Protocol URL Handler] No data received')
        return
      }

      if (!data.params) {
        console.error('[Protocol URL Handler] Data missing params:', data)
        return
      }

      // Save the current path so we can return after processing
      sessionStorage.setItem('protocol-handler-return-url', pathname)
      console.log('[Protocol URL Handler] Saved return URL to sessionStorage:', pathname)

      // Store protocol data in sessionStorage for protocol-handler
      sessionStorage.setItem('protocol-handler-data', JSON.stringify(data))
      console.log('[Protocol URL Handler] Saved protocol data to sessionStorage')
      console.log('[Protocol URL Handler] Verification - data in sessionStorage:', sessionStorage.getItem('protocol-handler-data'))

      // Navigate to the protocol-handler page
      console.log('[Protocol URL Handler] Navigating to /protocol-handler')
      router.push('/protocol-handler')
    }

    // Listen for custom-url-received events
    window.electron.ipcRenderer.on('custom-url-received', handleCustomUrl)

    return () => {
      // Cleanup listener
      window.electron.ipcRenderer.removeListener('custom-url-received', handleCustomUrl)
    }
  }, [router, pathname])

  return null // UI-less helper component
}
