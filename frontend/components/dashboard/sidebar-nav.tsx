"use client"

import {
  LayoutDashboard,
  Server,
  Wrench,
  Network,
  Users,
  TrendingUp,
  Activity,
  ChevronDown,
  ChevronRight,
  Download,
  FlaskConical,
  LinkIcon,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"

import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

export const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/dashboard/server-control", icon: Server, label: "Server Control" },
  { href: "/dashboard/tool-configure", icon: Wrench, label: "Tool Configure" },
  { href: "/dashboard/network-access", icon: Network, label: "Network Access" },
  { href: "/dashboard/members", icon: Users, label: "Access Token Management" },
  {
    href: "/dashboard/usage",
    icon: TrendingUp,
    label: "Usage & Billing",
    subItems: [
      { href: "/dashboard/usage", label: "Overview" },
      { href: "/dashboard/usage/tool-usage", label: "Tool Usage" },
      { href: "/dashboard/usage/token-usage", label: "Access Token Usage" },
      { href: "/dashboard/billing", label: "License" },
    ],
  },
  { href: "/dashboard/logs", icon: Activity, label: "Log & Monitor" },
]

interface SidebarNavProps {
  onPlaygroundClick?: () => void
}

export function SidebarNav({ onPlaygroundClick }: SidebarNavProps) {
  const pathname = usePathname()
  const [expandedItems, setExpandedItems] = useState<string[]>([])

  useEffect(() => {
    if (pathname.startsWith("/dashboard/usage") || pathname === "/dashboard/billing") {
      setExpandedItems(["/dashboard/usage"])
    } else {
      setExpandedItems([])
    }
  }, [pathname])

  const toggleExpanded = (href: string) => {
    setExpandedItems((prev) => (prev.includes(href) ? prev.filter((item) => item !== href) : [...prev, href]))
  }

  return (
    <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
      {navItems.map((item) => (
        <div key={item.label}>
          {item.subItems ? (
            <Collapsible open={expandedItems.includes(item.href)} onOpenChange={() => toggleExpanded(item.href)}>
              <CollapsibleTrigger asChild>
                <button
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary w-full",
                    (pathname.startsWith(item.href) || (item.href === "/dashboard/usage" && pathname === "/dashboard/billing")) && "bg-muted text-primary",
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                  {expandedItems.includes(item.href) ? (
                    <ChevronDown className="h-4 w-4 ml-auto" />
                  ) : (
                    <ChevronRight className="h-4 w-4 ml-auto" />
                  )}
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent className="ml-6 mt-1 space-y-1">
                {item.subItems.map((subItem) => (
                  <Link
                    key={subItem.href}
                    href={subItem.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary text-sm",
                      pathname === subItem.href && "bg-muted text-primary",
                    )}
                  >
                    {subItem.label}
                  </Link>
                ))}
              </CollapsibleContent>
            </Collapsible>
          ) : (
            <Link
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary",
                pathname === item.href && "bg-muted text-primary",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          )}
        </div>
      ))}
      
      {/* Connect Section */}
      <div className="mt-6">
        <div className="px-3 py-2">
          <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-muted pb-2 mb-3">
            Connect to
          </h3>
        </div>
        
        {/* Download Peta Desk */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/client-management"
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted relative overflow-hidden mb-1",
                  "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700",
                  "shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200",
                  "border border-blue-500/20 hover:border-blue-400/30",
                  "before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/10 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity"
                )}
              >
                <Download className="h-4 w-4 relative z-10" />
                <span className="relative z-10 font-medium">Download Peta Desk</span>
                <LinkIcon className="h-3 w-3 ml-auto opacity-80 relative z-10" />
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Download Peta Desk (Opens in new tab)</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
        
        {/* Playground */}
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onPlaygroundClick}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted w-full text-left",
                  "bg-gradient-to-r from-green-600 to-emerald-600 text-white hover:from-green-700 hover:to-emerald-700",
                  "shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200",
                  "border border-green-500/20 hover:border-green-400/30",
                  "before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/10 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity relative overflow-hidden"
                )}
              >
                <FlaskConical className="h-4 w-4 relative z-10" />
                <span className="relative z-10 font-medium">Playground</span>
              </button>
            </TooltipTrigger>
            <TooltipContent side="right">
              <p>Developer Playground - Test MCP connections</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </nav>
  )
}