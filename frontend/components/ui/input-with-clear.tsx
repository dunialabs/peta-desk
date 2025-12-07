/*
 * @Author: xudada 1820064201@qq.com
 * @Date: 2025-08-13 13:37:14
 * @LastEditors: xudada 1820064201@qq.com
 * @LastEditTime: 2025-08-13 13:38:53
 * @FilePath: /peta-desk/frontend/components/ui/input-with-clear.tsx
 * Input with clear button helper
 */
import * as React from 'react'
import { cn } from '@/lib/utils'

export interface InputWithClearProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  onClear?: () => void
  showClear?: boolean
}

const InputWithClear = React.forwardRef<HTMLInputElement, InputWithClearProps>(
  ({ className, type, onClear, showClear = true, value, ...props }, ref) => {
    const handleClear = () => {
      if (onClear) {
        onClear()
      }
    }

    const showClearButton = showClear && value && String(value).length > 0

    return (
      <div className="relative">
        <input
          type={type}
          className={cn(
            'w-full h-[48px] px-4 bg-white rounded-[8px] text-[14px] text-black placeholder-[#94A3B8] outline-none focus:ring-2 focus:ring-black focus:border-transparent transition-all border border-[rgba(4, 11, 15, 0.10)]',
            showClearButton ? 'pr-12' : '',
            className
          )}
          ref={ref}
          value={value}
          {...props}
        />
        {showClearButton && (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-[16px] h-[16px] bg-[#94A3B8] rounded-full flex items-center justify-center hover:bg-[#64748B] transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none">
              <path
                d="M18 6L6 18M6 6L18 18"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          </button>
        )}
      </div>
    )
  }
)
InputWithClear.displayName = 'InputWithClear'

export { InputWithClear }
