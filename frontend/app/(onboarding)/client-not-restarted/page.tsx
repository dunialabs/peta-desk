/*
 * @Author: xudada 1820064201@qq.com
 * @Date: 2025-08-15 11:38:39
 * @LastEditors: xudada 1820064201@qq.com
 * @LastEditTime: 2025-08-18 15:01:00
 * @FilePath: /peta-desk/frontend/app/(onboarding)/client-not-restarted/page.tsx
 * @Description: Default settings, please set `customMade`, open koroFileHeader to view configuration: https://github.com/OBKoro1/koro1FileHeader/wiki/%E9%85%8D%E7%BD%AE
 */
'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import Header from '@/components/common/header'
import { useRouter } from 'next/navigation'
export default function ClientNotRestartedPage() {
  const [isChecking, setIsChecking] = useState(false)
  const router = useRouter()

  const handleCheckAgain = async () => {
    setIsChecking(true)

    // Simulate checking for client restart
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Randomly determine if client was restarted this time
    const clientRestarted = Math.random() > 0.2

    setIsChecking(false)

    if (clientRestarted) {
      // Navigate to main dashboard
      router.push('/dashboard')
    }
    // If still not restarted, stay on this page
  }

  return (
    <div className="min-h-screen  flex flex-col  p-4">
      <Header showLockButton={false} />
      <div className="w-full flex-1 flex flex-col items-center justify-center">
        <div className="w-[388px]">
          {/* Client Icons with success indicators */}
          <div className="flex justify-center space-x-4 mb-[8px]">
            <div className="relative">
              <div className="w-16 h-16 bg-orange-500 rounded-2xl flex items-center justify-center">
                <div className="text-white text-2xl">✱</div>
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <div className="text-white text-sm">✓</div>
              </div>
            </div>
            <div className="relative">
              <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center">
                <div className="text-white text-2xl">⇅</div>
              </div>
              <div className="absolute -top-1 -right-1 w-6 h-6 bg-green-500 rounded-full flex items-center justify-center">
                <div className="text-white text-sm">✓</div>
              </div>
            </div>
          </div>

          <div className="text-center mb-[24px]">
            <h2 className="text-[30px] text-[#0A2E6D] dark:text-gray-100 font-bold">
              Client Not Restarted
            </h2>
            <div className="text-[#0F172A] dark:text-gray-300 text-[14px] leading-relaxed">
              <p>We found MCP clients but no servers are configured.</p>
              <p>
                Please completely close your MCP client and restart it to apply
                the new server configuration.
              </p>
            </div>
          </div>

          {/* Check Again Button */}
          <Button
            onClick={handleCheckAgain}
            disabled={isChecking}
            className="w-full h-[22px] bg-blue-500 dark:bg-blue-600 hover:bg-blue-600 dark:hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-800 text-white rounded-[5px] font-medium transition-colors"
          >
            {isChecking ? 'Checking...' : 'Check Again'}
          </Button>
        </div>
      </div>
    </div>
  )
}
