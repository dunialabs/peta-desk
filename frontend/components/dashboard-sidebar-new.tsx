"use client"

import { Package2, Crown } from "lucide-react"
import Link from "next/link"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Card, CardHeader } from "@/components/ui/card"

import { AuthLoginDialog } from "./auth-login-dialog"
import { AuthRegistrationDialog } from "./auth-registration-dialog"
import { PlaygroundDialog } from "./dashboard/playground-dialog"
import { SidebarNav } from "./dashboard/sidebar-nav"
import { UserMenu, UserData } from "./dashboard/user-menu"
import { PlanSelectionDialog } from "./plan-selection-dialog"

export function DashboardSidebar() {
  const [showPlanDialog, setShowPlanDialog] = useState(false)
  const [showLoginDialog, setShowLoginDialog] = useState(false)
  const [showRegistrationDialog, setShowRegistrationDialog] = useState(false)
  const [showPlaygroundDialog, setShowPlaygroundDialog] = useState(false)
  
  const [currentUser, setCurrentUser] = useState<UserData>({
    email: "admin@company.com",
    plan: "Pro Plan",
    isPaidPlan: true,
    isGuest: false
  })
  
  const handleLogout = () => {
    setCurrentUser({
      email: "Guest User",
      plan: "Guest Access",
      isPaidPlan: false,
      isGuest: true
    })
  }


  return (
    <>
      <div className="hidden border-r bg-background md:block fixed h-full w-[220px] lg:w-[280px]">
        <div className="flex h-full max-h-screen flex-col gap-2">
          <div className="flex h-14 items-center border-b px-4 lg:h-[60px] lg:px-6">
            <Link href="/" className="flex items-center gap-2 font-semibold flex-1">
              <Package2 className="h-6 w-6" />
              <span className="">Peta MCP Console</span>
            </Link>
            <Badge variant="secondary" className="bg-gradient-to-r from-blue-100 to-purple-100 text-blue-800 border-blue-200 dark:border-blue-800">
              <Crown className="mr-1 h-3 w-3" />
              Pro Server
            </Badge>
          </div>
          <div className="flex-1">
            <SidebarNav onPlaygroundClick={() => setShowPlaygroundDialog(true)} />
          </div>
          <div className="mt-auto p-4">
            <Card className="hover:bg-muted/50 transition-colors">
              <CardHeader className="p-2 pt-0 md:p-4">
                <UserMenu
                  currentUser={currentUser}
                  onShowPlanDialog={() => setShowPlanDialog(true)}
                  onShowLoginDialog={() => setShowLoginDialog(true)}
                  onShowRegistrationDialog={() => setShowRegistrationDialog(true)}
                  onLogout={handleLogout}
                />
              </CardHeader>
            </Card>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <PlaygroundDialog 
        open={showPlaygroundDialog} 
        onOpenChange={setShowPlaygroundDialog} 
      />



      <PlanSelectionDialog 
        open={showPlanDialog} 
        onOpenChange={setShowPlanDialog}
        currentPlan={currentUser.isPaidPlan ? "pro" : "free"}
      />

      <AuthLoginDialog
        open={showLoginDialog}
        onOpenChange={setShowLoginDialog}
        onShowRegistrationDialog={() => {
          setShowLoginDialog(false)
          setShowRegistrationDialog(true)
        }}
        onLoginSuccess={(user) => {
          setCurrentUser({
            email: user.email,
            plan: "Free Plan",
            isPaidPlan: false,
            isGuest: false
          })
        }}
      />

      <AuthRegistrationDialog
        open={showRegistrationDialog}
        onOpenChange={setShowRegistrationDialog}
        onShowLoginDialog={() => {
          setShowRegistrationDialog(false)
          setShowLoginDialog(true)
        }}
        onRegistrationSuccess={(user) => {
          setCurrentUser({
            email: user.email,
            plan: "Free Plan",
            isPaidPlan: false,
            isGuest: false
          })
        }}
      />
    </>
  )
}