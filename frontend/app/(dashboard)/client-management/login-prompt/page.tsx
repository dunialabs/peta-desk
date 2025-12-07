"use client"

import { Users, UserCheck, User, ArrowLeft } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function ClientManagementLoginPromptPage() {
  const router = useRouter()

  const handleLogin = () => {
    // Set authentication status and redirect to master password
    localStorage.setItem("clientManagementAuth", "true")
    router.push("/client-management/master-password")
  }

  const handleGuestMode = () => {
    // Set guest mode and redirect to master password
    localStorage.setItem("clientManagementAuth", "guest")
    router.push("/client-management/master-password")
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-800 dark:bg-gray-900">
      <div className="w-full max-w-sm relative">
        {/* Back Button */}
        <div className="absolute -top-16 left-0">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Button>
          </Link>
        </div>

        <Card>
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-100">
              <Users className="h-8 w-8 text-blue-600 dark:text-blue-400" />
            </div>
            <CardTitle className="text-2xl">MCP Client Management</CardTitle>
            <CardDescription>Choose how you want to access the client management system.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={handleLogin} className="w-full" size="lg">
              <UserCheck className="mr-2 h-5 w-5" />
              Login with Account
            </Button>
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <span className="w-full border-t" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-background px-2 text-muted-foreground">Or</span>
              </div>
            </div>
            <Button onClick={handleGuestMode} variant="outline" className="w-full bg-transparent" size="lg">
              <User className="mr-2 h-5 w-5" />
              Continue as Guest
            </Button>
          </CardContent>
          <CardFooter className="text-center">
            <p className="text-xs text-muted-foreground">
              Guest mode provides limited functionality. Login for full access to all features.
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  )
}
