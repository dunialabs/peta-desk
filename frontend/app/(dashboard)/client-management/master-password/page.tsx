"use client"

import { Users, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import type React from "react"
import { useState, useEffect } from "react"

import { MCPCard } from "@/components/layouts/mcp-card"
import { MCPLoading } from "@/components/layouts/mcp-loading"
import { MCPPageLayout } from "@/components/layouts/mcp-page-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"


export default function ClientManagementMasterPasswordPage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  const [authMode, setAuthMode] = useState<string | null>(null)

  useEffect(() => {
    // Check if user came from login prompt, if not default to guest mode
    const authStatus = localStorage.getItem("clientManagementAuth")
    if (!authStatus) {
      // Set guest mode as default if no auth status
      localStorage.setItem("clientManagementAuth", "guest")
      setAuthMode("guest")
    } else {
      setAuthMode(authStatus)
    }
  }, [router])

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    // Simulate password verification
    await new Promise((resolve) => setTimeout(resolve, 1000))

    // Set master password verification for client management
    localStorage.setItem("clientManagementMasterAuth", "true")

    setIsLoading(false)
    router.push("/client-management")
  }

  if (!authMode) {
    return <MCPLoading fullPage title="Loading..." />
  }

  return (
    <MCPPageLayout containerSize="sm" centerContent>
      <div className="w-full relative">
        <div className="absolute -top-16 left-0">
          <Link href="/client-management/login-prompt">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
          </Link>
        </div>

        <MCPCard variant="elevated" size="lg" className="text-center">
          <div className="space-y-6">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-100">
              <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="space-y-2">
              <h1 className="text-2xl font-bold">Master Password</h1>
              <p className="text-muted-foreground">
                Enter your Master Password to access MCP Client Management
                {authMode === "guest" && " in Guest Mode"}.
              </p>
            </div>
            
            <form onSubmit={handleUnlock} className="grid gap-4 text-left">
              <div className="grid gap-2">
                <Label htmlFor="master-password">Master Password</Label>
                <Input
                  id="master-password"
                  type="password"
                  defaultValue="masterpassword"
                  required
                  disabled={isLoading}
                />
              </div>
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? "Verifying..." : "Unlock Client Management"}
              </Button>
            </form>
            
            <Button variant="link" className="text-xs text-muted-foreground">
              Forgot Master Password? Reset Account
            </Button>
          </div>
        </MCPCard>
      </div>
    </MCPPageLayout>
  )
}
