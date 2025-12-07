'use client'

import { useState, useEffect } from 'react'

export function usePassword() {
  const [hasPassword, setHasPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    checkHasPassword()
  }, [])

  const checkHasPassword = async () => {
    try {
      if (window.electron?.password) {
        const result = await window.electron.password.has()
        setHasPassword(result.hasPassword)
      } else {
        // Fallback to localStorage for backward compatibility
        const masterPasswordSet = localStorage.getItem('masterPasswordSet') === 'true'
        setHasPassword(masterPasswordSet)
      }
    } catch (error) {
      console.error('Failed to check password status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const verifyPassword = async (password: string): Promise<boolean> => {
    try {
      if (window.electron?.password) {
        const result = await window.electron.password.verify(password)
        return result.success
      }
      return false
    } catch (error) {
      console.error('Failed to verify password:', error)
      return false
    }
  }

  const setPassword = async (password: string): Promise<boolean> => {
    try {
      if (window.electron?.password) {
        const result = await window.electron.password.store(password)
        if (result.success) {
          setHasPassword(true)
          // Only update localStorage flag for onboarding flow
          localStorage.setItem('masterPasswordSet', 'true')
        }
        return result.success
      }
      return false
    } catch (error) {
      console.error('Failed to set password:', error)
      return false
    }
  }

  const updatePassword = async (oldPassword: string, newPassword: string): Promise<{ success: boolean; error?: string }> => {
    try {
      if (window.electron?.password) {
        const result = await window.electron.password.update(oldPassword, newPassword)
        return result
      }
      return { success: false, error: 'Password manager not available' }
    } catch (error) {
      console.error('Failed to update password:', error)
      return { success: false, error: 'Failed to update password' }
    }
  }

  return {
    hasPassword,
    isLoading,
    verifyPassword,
    setPassword,
    updatePassword,
    checkHasPassword
  }
}