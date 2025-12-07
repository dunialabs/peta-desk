/*
 * @Author: xudada 1820064201@qq.com
 * @Date: 2025-08-15 11:38:39
 * @LastEditors: xudada 1820064201@qq.com
 * @LastEditTime: 2025-11-14 11:32:11
 * @FilePath: /peta-desk/frontend/components/common/header.tsx
 * Header component utilities
 */
'use client'

import { useLock } from '@/contexts/lock-context'
import { ThemeToggle } from '@/components/common/theme-toggle'
import { useTheme } from '@/contexts/theme-context'

interface HeaderProps {
  showSettingsButton?: boolean // Toggle settings button; default false
  showBackButton?: boolean // Toggle back button; default false
  onBack?: () => void // Back button callback
  showLockButton?: boolean // Toggle lock button; default true
}

export default function Header({
  showSettingsButton = false,
  showBackButton = false,
  onBack,
  showLockButton = true
}: HeaderProps) {
  const { lockApp, autoLockTimer } = useLock()
  const { actualTheme } = useTheme()

  const handleLockClick = () => {
    lockApp(true) // User actively locks the app
  }

  const handleSettingsClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    window.electron.showSettingsMenu(rect.left, rect.bottom + 4, autoLockTimer)
  }

  return (
    <div className="flex items-center justify-between p-[10px]" style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}>
      <div className="flex items-center gap-3">
        <img
          src={actualTheme === 'dark' ? '/images/darkLogo.svg' : '/images/lightLogo.svg'}
          alt="Peta Desk"
          className="h-8"
        />
      </div>
      <div className="flex items-center gap-2" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        {/* Theme toggle */}
        <ThemeToggle />

        {/* Back/Reset button - visible only when showBackButton is true */}
        {showBackButton && onBack && (
          <button
            onClick={onBack}
            className="p-[4px] hover:bg-gray-100 dark:hover:bg-gray-700 rounded-[4px] transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className="text-gray-900 dark:text-gray-100"
            >
              <path
                d="M12.2426 12.2426C11.1569 13.3284 9.65687 14 8 14C4.6863 14 2 11.3137 2 8C2 4.6863 4.6863 2 8 2C9.65687 2 11.1569 2.67157 12.2426 3.75737C12.7953 4.31003 14 5.66667 14 5.66667"
                stroke="currentColor"
                strokeWidth="1.33333"
                strokeLinejoin="round"
              />
              <path
                d="M14 2.66602V5.66602H11"
                stroke="currentColor"
                strokeWidth="1.33333"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
        {/* Settings button - visible only when showSettingsButton is true */}
        {showSettingsButton && (
          <button
            onClick={handleSettingsClick}
            className="p-[4px] hover:bg-gray-100 dark:hover:bg-gray-700 rounded-[4px] transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className="text-gray-900 dark:text-gray-100"
            >
              <g clipPath="url(#clip0_5157_40074)">
                <path
                  d="M6.09427 14.3903C4.97724 14.0577 3.98294 13.4403 3.19563 12.6222C3.48934 12.2741 3.66634 11.8243 3.66634 11.3332C3.66634 10.2286 2.77091 9.3332 1.66634 9.3332C1.59952 9.3332 1.53347 9.33651 1.46834 9.34291C1.3796 8.90907 1.33301 8.45994 1.33301 7.99987C1.33301 7.303 1.43993 6.63111 1.63827 5.99967C1.64761 5.99981 1.65697 5.99987 1.66634 5.99987C2.77091 5.99987 3.66634 5.10444 3.66634 3.99987C3.66634 3.68277 3.59254 3.38294 3.46121 3.11654C4.23217 2.39967 5.17317 1.86318 6.21704 1.57422C6.54781 2.22257 7.22191 2.66655 7.99967 2.66655C8.77744 2.66655 9.45154 2.22257 9.78231 1.57422C10.8262 1.86318 11.7672 2.39967 12.5381 3.11654C12.4068 3.38294 12.333 3.68277 12.333 3.99987C12.333 5.10444 13.2284 5.99987 14.333 5.99987C14.3424 5.99987 14.3517 5.99981 14.3611 5.99967C14.5594 6.63111 14.6663 7.303 14.6663 7.99987C14.6663 8.45994 14.6197 8.90907 14.531 9.34291C14.4659 9.33651 14.3998 9.3332 14.333 9.3332C13.2284 9.3332 12.333 10.2286 12.333 11.3332C12.333 11.8243 12.51 12.2741 12.8037 12.6222C12.0164 13.4403 11.0221 14.0577 9.90507 14.3903C9.64727 13.5838 8.89167 12.9999 7.99967 12.9999C7.10767 12.9999 6.35207 13.5838 6.09427 14.3903Z"
                  stroke="currentColor"
                  strokeWidth="1.33333"
                  strokeLinejoin="round"
                />
                <path
                  d="M8.00033 10.3327C9.28899 10.3327 10.3337 9.28802 10.3337 7.99935C10.3337 6.71068 9.28899 5.66602 8.00033 5.66602C6.71166 5.66602 5.66699 6.71068 5.66699 7.99935C5.66699 9.28802 6.71166 10.3327 8.00033 10.3327Z"
                  stroke="currentColor"
                  strokeWidth="1.33333"
                  strokeLinejoin="round"
                />
              </g>
              <defs>
                <clipPath id="clip0_5157_40074">
                  <rect width="16" height="16" fill="white" />
                </clipPath>
              </defs>
            </svg>
          </button>
        )}

        {/* Lock button - visible only when showLockButton is true */}
        {showLockButton && (
          <button
            onClick={handleLockClick}
            className="p-[4px] hover:bg-gray-100 dark:hover:bg-gray-700 hover:rounded-[4px] transition-colors"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 16 16"
              fill="none"
              className="text-gray-900 dark:text-gray-100"
            >
              <path
                d="M13.3333 7.33398H2.66667C2.29848 7.33398 2 7.63246 2 8.00065V14.0007C2 14.3688 2.29848 14.6673 2.66667 14.6673H13.3333C13.7015 14.6673 14 14.3688 14 14.0007V8.00065C14 7.63246 13.7015 7.33398 13.3333 7.33398Z"
                stroke="currentColor"
                strokeWidth="1.33333"
                strokeLinejoin="round"
              />
              <path
                d="M4.66699 7.33398V4.66732C4.66699 2.82637 6.15939 1.33398 8.00033 1.33398C9.84126 1.33398 11.3337 2.82637 11.3337 4.66732V7.33398"
                stroke="currentColor"
                strokeWidth="1.33333"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M8 10V12"
                stroke="currentColor"
                strokeWidth="1.33333"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}
