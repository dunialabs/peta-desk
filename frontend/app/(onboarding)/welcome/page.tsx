'use client'

import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { useState, useEffect } from 'react'
import Header from '@/components/common/header'

export default function WelcomePage() {
  const router = useRouter()
  const [currentSlide, setCurrentSlide] = useState(0)

  const slides = [
    {
      title: (
        <>
          <span className="text-[#F56711]">Secure MCP Infrastructure</span>
          <br />
          <span className="text-[#26251e] dark:text-gray-100">for Production AI</span>
        </>
      ),
      description:
        'Zero-trust gateway with built-in MCP server orchestration. Deploy, manage, and scale MCP servers automatically. Secure AI infrastructure at scale.'
    },
    {
      title: (
        <>
          <span className="text-black dark:text-white">Support for</span>
          <br />
          <span className="text-black dark:text-white">Claude Desktop, Cursor</span>
          <br />
          <span className="text-black dark:text-white">& more</span>
        </>
      ),
      description:
        'Plus ready-to-connect MCP servers including Peta and other popular options'
    },
    {
      title: (
        <>
          <span className="text-black dark:text-white">Your data stays secure</span>
          <br />
          <span className="text-black dark:text-white">and private</span>
        </>
      ),
      description:
        'All credentials are encrypted and stored locally on your device with zero-knowledge architecture - only you have access'
    },
    {
      title: (
        <>
          <span className="text-black dark:text-white">Full control at your</span>
          <br />
          <span className="text-black dark:text-white">fingertips</span>
        </>
      ),
      description:
        'Easily turn servers on/off and customize which functions and data you want to use'
    }
  ]

  // Auto carousel
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length)
    }, 3000) // Switch every 3 seconds

    return () => clearInterval(timer)
  }, [slides.length])

  const handleStartNow = () => {
    // Jump directly to master password setup
    router.push('/master-password')
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header showLockButton={false} />
      <div className="max-w-md mt-[100px] w-full flex-1 flex flex-col h-full justify-between px-[16px]">
        <div>
          {/* Content area - centered */}
          <div className="flex-1 flex flex-col justify-center space-y-[12px]">
            {/* Progress dots */}
            <div className="flex gap-[8px]">
              {slides.map((_, index) => (
                <div
                  key={index}
                  className={`h-[2px] rounded-full transition-colors ${
                    index === currentSlide
                      ? 'bg-[#F56711] w-[20px]'
                      : 'bg-[#B6BEC2] dark:bg-gray-600 w-[10px]'
                  }`}
                />
              ))}
            </div>

            {/* Title */}
            <h1 className="text-[30px] leading-tight font-bold">
              {slides[currentSlide].title}
            </h1>

            {/* Description */}
            <p className="text-[#7C8C94] dark:text-gray-400 text-[14px] leading-relaxed">
              {slides[currentSlide].description}
            </p>
          </div>
        </div>

        {/* Start Now button - footer */}
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
