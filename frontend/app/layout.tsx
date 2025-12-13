/*
 * @Author: xudada 1820064201@qq.com
 * @Date: 2025-08-13 13:33:50
 * @LastEditors: xudada 1820064201@qq.com
 * @LastEditTime: 2025-11-12 11:57:48
 * @FilePath: /peta-desk/frontend/app/layout.tsx
 * App layout entry
 */
import type { Metadata } from 'next'
import './globals.css'
import { LockProvider } from '@/contexts/lock-context'
import LockWrapper from '@/components/common/lock-wrapper'
import { Toaster } from '@/components/ui/sonner'
import { ServerConfigProvider } from '@/contexts/server-config-provider'
import { ConfirmDialog } from '@/components/common/confirm-dialog'
import { SocketProvider } from '@/contexts/socket-context'
import { ReconnectPasswordHandler } from '@/components/common/reconnect-password-handler'
import { UnlockProvider } from '@/contexts/unlock-context'
import { ProtocolUrlHandler } from '@/components/common/protocol-url-handler'
import { ThemeProvider } from '@/contexts/theme-context'

export const metadata: Metadata = {
  title: 'MCP Desktop Application',
  description: 'Model Context Protocol Gateway Management'
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <div className="min-h-screen font-sans">
            <LockProvider>
              <UnlockProvider>
                <SocketProvider>
                  <ServerConfigProvider>
                    <LockWrapper>{children}</LockWrapper>
                  </ServerConfigProvider>
                  <Toaster />
                  <ConfirmDialog />
                  <ReconnectPasswordHandler />
                  <ProtocolUrlHandler />
                </SocketProvider>
              </UnlockProvider>
            </LockProvider>
          </div>
        </ThemeProvider>
      </body>
    </html>
  )
}
