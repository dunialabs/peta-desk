'use client'

import type React from 'react'

export default function ClientManagementLayout({
  children
}: {
  children: React.ReactNode
}) {
  return <div className="flex-1 space-y-4 p-4 md:p-8 pt-6">{children}</div>
}
