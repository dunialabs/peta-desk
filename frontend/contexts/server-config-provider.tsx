'use client'

import { ReactNode } from 'react'

interface ServerConfigProviderProps {
  children: ReactNode
}

/**
 * ServerConfigProvider - Simplified for integrated architecture
 * Note: proxy-manager has been removed. Server config handling is no longer needed.
 * This provider is kept as a placeholder for future use.
 */
export function ServerConfigProvider({ children }: ServerConfigProviderProps) {
  return <>{children}</>
}