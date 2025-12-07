"use client"

import { CircleUser, Crown, LogIn, UserPlus } from "lucide-react"

import { Button } from "@/components/ui/button"
import { CardTitle, CardDescription } from "@/components/ui/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export interface UserData {
  email: string
  plan: string
  isPaidPlan: boolean
  isGuest: boolean
}

interface UserMenuProps {
  currentUser: UserData
  onShowPlanDialog: () => void
  onShowLoginDialog: () => void
  onShowRegistrationDialog?: () => void
  onLogout: () => void
}

export function UserMenu({
  currentUser,
  onShowPlanDialog,
  onShowLoginDialog,
  onShowRegistrationDialog,
  onLogout,
}: UserMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="flex items-center justify-between w-full cursor-pointer">
          <div className="flex items-center gap-2 flex-1">
            <CircleUser className="h-5 w-5 text-muted-foreground" />
            <div className="flex-1">
              <CardTitle className="text-sm">
                {currentUser.isGuest ? "Guest User" : currentUser.email}
              </CardTitle>
              <CardDescription className="text-xs">
                {currentUser.plan}
              </CardDescription>
            </div>
          </div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>
          {currentUser.isGuest ? (
            <span>Guest Access</span>
          ) : (
            <span>{currentUser.email}</span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem className="text-xs text-muted-foreground">
          {currentUser.plan}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        {currentUser.isGuest ? (
          <>
            <DropdownMenuItem onClick={onShowLoginDialog}>
              <LogIn className="mr-2 h-4 w-4" />
              Log In
            </DropdownMenuItem>
            {onShowRegistrationDialog && (
              <DropdownMenuItem onClick={onShowRegistrationDialog}>
                <UserPlus className="mr-2 h-4 w-4" />
                Create Account
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onShowPlanDialog}>
              <Crown className="mr-2 h-4 w-4" />
              View Plans
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem onClick={onShowPlanDialog}>
              <Crown className="mr-2 h-4 w-4" />
              View Plan
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onLogout}>
              Log Out
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}