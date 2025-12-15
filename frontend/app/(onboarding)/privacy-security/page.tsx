'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { 
  Lock, 
  Shield, 
  Eye, 
  Server,
  ChevronLeft,
  ChevronRight,
  Check
} from 'lucide-react'

export default function PrivacySecurityPage() {
  const router = useRouter()

  const securityPoints = [
    {
      icon: <Lock className="w-8 h-8 text-blue-600 dark:text-blue-400" />,
      title: 'Local Storage',
      description: 'All data is stored on your local device'
    },
    {
      icon: <Shield className="w-8 h-8 text-green-600 dark:text-green-400" />,
      title: 'Encryption Protection',
      description: 'Sensitive information is encrypted with AES-256'
    },
    {
      icon: <Eye className="w-8 h-8 text-purple-600 dark:text-purple-400" />,
      title: 'Privacy First',
      description: 'We do not collect or transmit your personal data'
    },
    {
      icon: <Server className="w-8 h-8 text-orange-600 dark:text-orange-400" />,
      title: 'Secure Connection',
      description: 'All communication with MCP servers is encrypted'
    }
  ]

  const handleNext = () => {
    router.push('/permissions')
  }

  const handleBack = () => {
    router.push('/features')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Privacy & Security
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Your data security is our top priority
          </p>
        </div>

        {/* Security Points */}
        <div className="space-y-4 py-6">
          {securityPoints.map((point, index) => (
            <div 
              key={index}
              className="flex items-start space-x-4 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
            >
              <div className="flex-shrink-0 mt-1">
                {point.icon}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-1">
                  {point.title}
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {point.description}
                </p>
              </div>
              <Check className="w-5 h-5 text-green-500 dark:text-green-400 mt-1" />
            </div>
          ))}
        </div>

        {/* Privacy Notice */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>Privacy Commitment:</strong> PETA runs entirely locally and does not send your data to any server.
            All your configurations, passwords, and connection information are securely stored on your device.
          </p>
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

          <Button
            onClick={handleNext}
            className="flex items-center space-x-2"
          >
            <span>Next</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Progress Dots */}
        <div className="flex justify-center space-x-2 pt-4">
          <div className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
          <div className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
          <div className="w-2 h-2 bg-blue-600 dark:bg-blue-500 rounded-full"></div>
          <div className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
        </div>
      </div>
    </div>
  )
}