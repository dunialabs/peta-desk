'use client'

import { useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'

interface PasswordDialogProps {
  isOpen: boolean
  onClose: () => void
  onSubmit: (password: string) => void | Promise<void>
  title?: string
  description?: string
  buttonText?: string
  showCancel?: boolean // Whether to show cancel button
  verifyPassword?: boolean // Whether to verify password with electron API
}

export function PasswordDialog({
  isOpen,
  onClose,
  onSubmit,
  title = 'Enter Master Password',
  description = 'Enter your master password to decrypt the server token',
  buttonText = 'Confirm',
  showCancel = true,
  verifyPassword = false
}: PasswordDialogProps) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!password) return

    setError('')
    setIsSubmitting(true)

    try {
      // Verify password with electron API if requested
      if (verifyPassword) {
        if (window.electron?.password) {
          const result = await window.electron.password.verify(password)
          if (!result.success) {
            setError('Incorrect master password. Please try again.')
            setIsSubmitting(false)
            return
          }
        } else {
          setError('Password manager not available.')
          setIsSubmitting(false)
          return
        }
      }

      // Call onSubmit callback
      await onSubmit(password)

      // Clear state on success
      setPassword('')
      setShowPassword(false)
      setError('')
    } catch (err) {
      console.error('Password verification failed:', err)
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    setPassword('')
    setShowPassword(false)
    setError('')
    setIsSubmitting(false)
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-900 rounded-[10px] p-[16px] max-w-[280px] w-full shadow-xl">
        <h2 className="text-[13px] font-bold text-center text-[#26251e] dark:text-gray-100 mb-[10px]">
          {title}
        </h2>
        <p className="text-[11px] text-center text-gray-900 dark:text-gray-100 leading-[14px] mb-[12px]">
          {description}
        </p>

        {/* Password Input */}
        <div className="mb-[16px]">
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError('') // Clear error when user types
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && password && !isSubmitting) {
                  handleSubmit()
                }
              }}
              placeholder="Master Password"
              autoFocus
              disabled={isSubmitting}
              className="w-full h-[28px] px-[8px] pr-[32px] text-[13px] border border-gray-300 dark:border-gray-600 rounded-[5px] bg-white dark:bg-gray-800 focus:outline-none focus:ring-1 focus:ring-[#26251E] dark:focus:ring-white focus:border-[#26251E] dark:focus:border-gray-500 disabled:opacity-50 disabled:cursor-not-allowed text-gray-900 dark:text-gray-100"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isSubmitting}
              className="absolute right-[8px] top-1/2 -translate-y-1/2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:text-gray-200 disabled:opacity-50"
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          </div>
          {error && (
            <p className="text-[11px] text-red-500 dark:text-red-400 mt-1">{error}</p>
          )}
        </div>

        <div className="flex gap-[8px]">
          {showCancel && (
            <button
              onClick={handleClose}
              disabled={isSubmitting}
              className="flex-1 h-[28px] rounded-[5px] bg-gray-100 dark:bg-gray-800 text-[#26251e] dark:text-gray-100 text-[13px] font-[400] transition-colors hover:bg-[rgba(0,0,0,0.15)] dark:hover:bg-gray-700 shadow-[inset_0_0.5px_0.5px_rgba(255,255,255,0.25)] disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={!password || isSubmitting}
            className={`${showCancel ? 'flex-1' : 'w-full'} h-[28px] rounded-[5px] bg-[#26251E] dark:bg-gray-700 hover:bg-[#3A3933] dark:hover:bg-gray-600 text-white text-[13px] font-medium transition-colors shadow-[inset_0_0.5px_0_rgba(255,255,255,0.35)] disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSubmitting ? 'Verifying...' : buttonText}
          </button>
        </div>
      </div>
    </div>
  )
}