"use client"

import { useState, useRef, useEffect } from "react"
import { InputWithClear } from "@/components/ui/input-with-clear"

interface PasswordDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  onConfirm: (password: string, setError: (error: string) => void) => Promise<boolean> | boolean
  onCancel: () => void
}

export function PasswordDialog({
  open,
  onOpenChange,
  title,
  description,
  onConfirm,
  onCancel
}: PasswordDialogProps) {
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleConfirm = async () => {
    if (!password.trim()) {
      setError("Password is required")
      return
    }
    
    setIsLoading(true)
    setError("")
    
    try {
      const success = await onConfirm(password, setError)
      if (success) {
        // Clear password/error only on success
        setPassword("")
        setError("")
      } else {
        // On failure, select password text for quick re-entry
        setTimeout(() => {
          if (inputRef.current) {
            inputRef.current.select()
          }
        }, 100)
      }
    } catch (error) {
      // Show a generic error message on unexpected failures
      setError('An unexpected error occurred')
      console.error('Password confirmation failed:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setPassword("")
    setError("")
    onCancel()
  }

  const handleClose = (open: boolean) => {
    if (!open) {
      handleCancel()
    }
    onOpenChange(open)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleConfirm()
    } else if (e.key === 'Escape') {
      handleCancel()
    }
  }

  return (
    <div className={`fixed inset-0 z-50 ${open ? 'block' : 'hidden'}`}>
      {/* macOS-style backdrop */}
      <div className="fixed inset-0 bg-black/20 backdrop-blur-md" onClick={handleClose} />
      
      {/* Dialog container */}
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <div className="relative bg-white dark:bg-gray-900/90 backdrop-blur-xl rounded-[12px] shadow-2xl w-full max-w-md mx-auto">
          {/* Title and description */}
          <div className="px-6 pt-8 pb-4 text-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">{title}</h2>
            <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">{description}</p>
          </div>

          {/* Password input */}
          <div className="px-6 pb-6">
            <InputWithClear
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (error) setError("")
              }}
              onClear={() => {
                setPassword("")
                if (error) setError("")
              }}
              onKeyDown={handleKeyDown}
              placeholder="Enter your master password..."
              className={`${error ? "border-red-300 focus:border-red-500" : ""}`}
              autoFocus
            />
            {error && (
              <div className="mt-2">
                <p className="text-xs text-red-600 font-medium">{error}</p>
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="space-y-3 px-6 pb-6">
            <button 
              onClick={handleConfirm} 
              disabled={!password.trim() || isLoading}
              className="w-full h-[22px] text-[13px] bg-blue-500 hover:bg-blue-600 text-white rounded-[5px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? "Verifying..." : "OK"}
            </button>
            <button 
              onClick={handleCancel} 
              disabled={isLoading}
              className="w-full h-[22px] text-[13px] border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-[5px] font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
