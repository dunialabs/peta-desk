'use client'

import { createContext, useContext, useState, ReactNode } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import Header from '@/components/common/header'

type UnlockPurpose = 'unlock' | 'reconnect' | 'single-reconnect' | 'add-server' | 'delete-server'

interface UnlockContextType {
  showUnlock: (purpose: UnlockPurpose, onSuccess: (password: string) => void | Promise<void>) => void
  hideUnlock: () => void
}

const UnlockContext = createContext<UnlockContextType | undefined>(undefined)

export function UnlockProvider({ children }: { children: ReactNode }) {
  const [isVisible, setIsVisible] = useState(false)
  const [purpose, setPurpose] = useState<UnlockPurpose>('unlock')
  const [onSuccessCallback, setOnSuccessCallback] = useState<((password: string) => void | Promise<void>) | null>(null)

  const showUnlock = (unlockPurpose: UnlockPurpose, onSuccess: (password: string) => void | Promise<void>) => {
    setPurpose(unlockPurpose)
    setOnSuccessCallback(() => onSuccess)
    setIsVisible(true)
  }

  const hideUnlock = () => {
    setIsVisible(false)
    setPurpose('unlock')
    setOnSuccessCallback(null)
  }

  const handlePasswordSubmit = async (password: string) => {
    if (onSuccessCallback) {
      await onSuccessCallback(password)
    }
    hideUnlock()
  }

  const handleClose = () => {
    hideUnlock()
  }

  return (
    <UnlockContext.Provider value={{ showUnlock, hideUnlock }}>
      {children}
      {isVisible && (
        <UnlockOverlay
          purpose={purpose}
          onSubmit={handlePasswordSubmit}
          onClose={handleClose}
        />
      )}
    </UnlockContext.Provider>
  )
}

export function useUnlock() {
  const context = useContext(UnlockContext)
  if (!context) {
    throw new Error('useUnlock must be used within UnlockProvider')
  }
  return context
}

// Unlock Overlay Component - matching unlock-password page style
interface UnlockOverlayProps {
  purpose: UnlockPurpose
  onSubmit: (password: string) => void | Promise<void>
  onClose: () => void
}

function UnlockOverlay({ purpose, onSubmit, onClose }: UnlockOverlayProps) {
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isUnlocking, setIsUnlocking] = useState(false)

  // Determine if close button should be shown (only hide for reconnect scenarios)
  const showCloseButton = purpose !== 'reconnect' && purpose !== 'single-reconnect'

  // Get title, description and button text based on purpose
  const getContent = () => {
    switch (purpose) {
      case 'add-server':
        return {
          title: 'Enter Master Password',
          description: 'Enter your master password to encrypt the server token for secure storage.',
          buttonText: 'Confirm'
        }
      case 'delete-server':
        return {
          title: 'Confirm Deletion',
          description: 'Enter your master password to confirm server deletion.',
          buttonText: 'Delete'
        }
      case 'reconnect':
      case 'single-reconnect':
        return {
          title: 'Master Password Required',
          description: 'Enter your master password to reconnect to your servers.',
          buttonText: 'Unlock'
        }
      default:
        return {
          title: 'Master Password Required',
          description: 'Enter your master password to unlock your encrypted data',
          buttonText: 'Unlock'
        }
    }
  }

  const { title, description, buttonText } = getContent()

  const handleUnlock = async () => {
    if (!password) {
      setError('Please enter your master password')
      return
    }

    setIsUnlocking(true)
    setError('')

    try {
      // Verify password
      if (window.electron?.password) {
        const result = await window.electron.password.verify(password)
        if (!result.success) {
          setError('Incorrect master password. Please try again.')
          setIsUnlocking(false)
          return
        }
      } else {
        setError('Password manager not available.')
        setIsUnlocking(false)
        return
      }

      // Call the success callback
      await onSubmit(password)

      // Reset state
      setPassword('')
      setShowPassword(false)
      setError('')
    } catch (error) {
      console.error('Failed to unlock:', error)
      setError('An unexpected error occurred')
    } finally {
      setIsUnlocking(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isUnlocking && password) {
      handleUnlock()
    }
  }

  return (
    <div className="fixed inset-0 bg-white z-50 min-h-screen flex flex-col">
      <Header showSettingsButton={true} />

      <div className="max-w-md mx-auto mt-[100px] w-full flex-1 flex flex-col px-4">
        <div className="w-full flex-1">
          {/* Title */}
          <div className="mb-6">
            <h1 className="text-[30px] font-bold text-[#0A0A0A] mb-[4px]">
              {title}
            </h1>
            <p className="text-[14px] text-[#8E8E93] leading-[20px]">
              {description}
            </p>
          </div>

          {/* Password Input */}
          <div className="mb-6">
            <label className="block text-[16px] font-semibold text-[#0A0A0A] mb-[8px]">
              Master Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value)
                  setError('')
                }}
                onKeyDown={handleKeyDown}
                placeholder="Enter master password"
                autoFocus
                disabled={isUnlocking}
                className="w-full h-[48px] px-[16px] pr-[48px] text-[16px] border border-[#D1D1D6] rounded-[12px] focus:outline-none focus:ring-2 focus:ring-[#26251E] focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-[16px] top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
                disabled={isUnlocking}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>
            {error && <p className="text-[14px] text-red-500 mt-2">{error}</p>}
          </div>
        </div>

        {/* Bottom Buttons */}
        <div className="flex gap-4 pb-6 sticky bottom-0 pt-4">
          {showCloseButton && (
            <button
              onClick={onClose}
              disabled={isUnlocking}
              className="flex-1 h-[48px] border border-[#D1D1D6] rounded-[12px] bg-white hover:bg-gray-50 text-[#0A0A0A] text-[14px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleUnlock}
            disabled={isUnlocking || !password}
            className={`${showCloseButton ? 'flex-1' : 'w-full'} h-[48px] rounded-[12px] bg-[#26251E] hover:bg-[#3A3933] text-white text-[14px] font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isUnlocking ? 'Verifying...' : buttonText}
          </button>
        </div>
      </div>
    </div>
  )
}
