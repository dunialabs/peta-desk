'use client'

import { useEffect } from 'react'
import { useLock } from '@/contexts/lock-context'
import UnlockScreen from './unlock-screen'

interface LockWrapperProps {
  children: React.ReactNode
}

export default function LockWrapper({ children }: LockWrapperProps) {
  const { isLocked } = useLock()

  // Note: get-server-config event is now handled by ServerConfigProvider
  // ServerConfigProvider considers lock screen state and includes permission information
  // Removed duplicate listener here to avoid conflicts with ServerConfigProvider

  if (isLocked) {
    return <UnlockScreen />
  }

  return <>{children}</>
}