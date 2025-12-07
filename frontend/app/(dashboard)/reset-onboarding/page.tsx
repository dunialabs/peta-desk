'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { RotateCcw, AlertTriangle } from 'lucide-react'

export default function ResetOnboardingPage() {
  const router = useRouter()

  const handleResetOnboarding = () => {
    // Clear all onboarding related localStorage items
    localStorage.removeItem('onboardingCompleted')
    localStorage.removeItem('masterPasswordSet')
    localStorage.removeItem('autoLockTimer')
    localStorage.removeItem('mcpServerConnected')
    
    // Redirect to home page which will redirect to welcome
    router.push('/')
  }

  const handleCancel = () => {
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-orange-600" />
            </div>
          </div>
          
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
            Reset Onboarding Process
          </h1>

          <p className="text-gray-600 dark:text-gray-300">
            This action will clear all onboarding settings and allow you to experience the complete onboarding process again.
          </p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <p className="text-sm text-amber-900">
            <strong>Note:</strong> This will clear your master password, auto-lock settings, and MCP connection configurations.
            You will need to reconfigure these settings.
          </p>
        </div>

        <div className="flex space-x-4">
          <Button
            variant="outline"
            onClick={handleCancel}
            className="flex-1"
          >
            Cancel
          </Button>
          <Button
            onClick={handleResetOnboarding}
            className="flex-1 flex items-center justify-center space-x-2"
            variant="destructive"
          >
            <RotateCcw className="w-4 h-4" />
            <span>Reset Onboarding</span>
          </Button>
        </div>
      </div>
    </div>
  )
}