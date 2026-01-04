'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Header from '@/components/common/header'

export default function WelcomePage() {
  const router = useRouter()

  const handleStartNow = () => {
    router.push('/master-password')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header showLockButton={false} />
      <div className="max-w-md mt-[100px] w-full flex-1 flex flex-col h-full justify-between px-[16px]">
        <div>
          <div className="flex-1 flex flex-col justify-center space-y-[12px]">
            <h1 className="leading-tight font-bold">
              <span className="text-[40px] text-[#F56711]">Peta Desk</span>
              <br />
              <span className="text-[30px] text-[#26251e] dark:text-white">MCP Control at Your Desk</span>
            </h1>

            <p className="text-[#7C8C94] dark:text-gray-400 text-[14px] leading-relaxed">
              Manage MCP servers securely from your desktop.
              <br />
              Your credentials, your control.
            </p>
          </div>
        </div>

        <div className="mt-auto py-[16px]">
          <Button
            onClick={handleStartNow}
            className="w-full h-[40px] bg-[#26251e] dark:bg-gray-700 hover:bg-gray-800 dark:hover:bg-gray-600 text-white text-[14px] font-[500] rounded-[8px]"
          >
            Start Now
          </Button>
        </div>
      </div>
    </div>
  )
}
