'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { 
  Bell, 
  Fingerprint, 
  Globe, 
  FolderOpen,
  ChevronLeft,
  ChevronRight,
  Info
} from 'lucide-react'

export default function PermissionsPage() {
  const router = useRouter()
  const [permissions, setPermissions] = useState({
    notifications: false,
    biometric: false,
    network: false,
    fileAccess: false
  })

  const permissionsList = [
    {
      key: 'notifications',
      icon: <Bell className="w-8 h-8 text-blue-600 dark:text-blue-400" />,
      title: 'Notifications',
      description: 'Receive important alerts and status updates',
      required: false
    },
    {
      key: 'biometric',
      icon: <Fingerprint className="w-8 h-8 text-green-600 dark:text-green-400" />,
      title: 'Biometric Authentication',
      description: 'Use Touch ID or Face ID for quick unlock',
      required: false
    },
    {
      key: 'network',
      icon: <Globe className="w-8 h-8 text-purple-600" />,
      title: 'Network Access',
      description: 'Connect to local MCP server',
      required: true
    },
    {
      key: 'fileAccess',
      icon: <FolderOpen className="w-8 h-8 text-orange-600" />,
      title: 'File Access',
      description: 'Save configuration and log files',
      required: true
    }
  ]

  const handlePermissionToggle = (key: string) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }))
  }

  const handleNext = () => {
    // In production, system permissions should be requested here
    localStorage.setItem('onboardingCompleted', 'true')
    router.push('/master-password')
  }

  const handleBack = () => {
    router.push('/privacy-security')
  }

  const handleSkip = () => {
    localStorage.setItem('onboardingCompleted', 'true')
    router.push('/master-password')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            System Permissions
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            To provide the best experience, we need the following permissions
          </p>
        </div>

        {/* Permissions List */}
        <div className="space-y-4 py-6">
          {permissionsList.map((permission) => (
            <div 
              key={permission.key}
              className="flex items-center justify-between p-4 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 mt-1">
                  {permission.icon}
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                      {permission.title}
                    </h3>
                    {permission.required && (
                      <span className="text-xs bg-red-100 text-red-600 px-2 py-1 rounded">
                        Required
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                    {permission.description}
                  </p>
                </div>
              </div>
              <button
                onClick={() => handlePermissionToggle(permission.key)}
                disabled={permission.required}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  permissions[permission.key as keyof typeof permissions] || permission.required
                    ? 'bg-blue-600' 
                    : 'bg-gray-200'
                } ${permission.required ? 'opacity-75 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    permissions[permission.key as keyof typeof permissions] || permission.required
                      ? 'translate-x-6' 
                      : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          ))}
        </div>

        {/* Info Box */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 flex items-start space-x-3">
          <Info className="w-5 h-5 text-amber-600 mt-0.5" />
          <div>
            <p className="text-sm text-amber-900">
              You can change these permissions in system settings at any time. Required permissions will be automatically enabled to ensure the application runs properly.
            </p>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center pt-8">
          <Button
            variant="outline"
            onClick={handleBack}
            className="flex items-center space-x-2"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Back</span>
          </Button>

          <div className="flex space-x-3">
            <Button
              variant="ghost"
              onClick={handleSkip}
            >
              Skip
            </Button>
            <Button
              onClick={handleNext}
              className="flex items-center space-x-2"
            >
              <span>Complete Setup</span>
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center space-x-2 pt-4">
          <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
          <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
          <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
          <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
        </div>
      </div>
    </div>
  )
}