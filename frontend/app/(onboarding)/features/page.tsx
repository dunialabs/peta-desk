'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { 
  Shield, 
  Zap, 
  Cloud, 
  Lock,
  ChevronLeft,
  ChevronRight 
} from 'lucide-react'

export default function FeaturesPage() {
  const router = useRouter()

  const features = [
    {
      icon: <Shield className="w-12 h-12 text-blue-600 dark:text-blue-400" />,
      title: 'Secure & Reliable',
      description: 'End-to-end encryption to protect your data'
    },
    {
      icon: <Zap className="w-12 h-12 text-purple-600 dark:text-purple-400" />,
      title: 'Fast Response',
      description: 'Optimized performance for smooth user experience'
    },
    {
      icon: <Cloud className="w-12 h-12 text-green-600 dark:text-green-400" />,
      title: 'Multi-Client Support',
      description: 'Supports Cursor, Claude, VSCode and more'
    },
    {
      icon: <Lock className="w-12 h-12 text-orange-600 dark:text-orange-400" />,
      title: 'Master Password Protection',
      description: 'Double protection with master password and biometric authentication'
    }
  ]

  const handleNext = () => {
    router.push('/privacy-security')
  }

  const handleBack = () => {
    router.push('/welcome')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl w-full space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
            Core Features
          </h1>
          <p className="text-lg text-gray-600 dark:text-gray-300">
            Discover what PETA can do for you
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-2 gap-6 py-8">
          {features.map((feature, index) => (
            <div 
              key={index}
              className="bg-white dark:bg-gray-900 p-6 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md transition-shadow"
            >
              <div className="flex flex-col items-center text-center space-y-3">
                {feature.icon}
                <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                  {feature.title}
                </h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
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
          <div className="w-2 h-2 bg-blue-600 dark:bg-blue-500 rounded-full"></div>
          <div className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
          <div className="w-2 h-2 bg-gray-300 dark:bg-gray-600 rounded-full"></div>
        </div>
      </div>
    </div>
  )
}