"use client"

import {
  Package2,
  Users,
  Network,
  Server,
  Wrench,
  Activity,
  CircleUser,
  Crown,
  TrendingUp,
  LinkIcon,
  LayoutDashboard,
  CreditCard,
  ChevronDown,
  ChevronRight,
  UserCheck,
  Settings,
  LogIn,
  Download,
  FlaskConical,
  Code,
  Copy,
  Check,
} from "lucide-react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useState, useEffect } from "react"
import { useTheme } from "@/contexts/theme-context"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"

const navItems = [
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

export function DashboardSidebar() {
  const pathname = usePathname()
  const { actualTheme } = useTheme()
  const [expandedItems, setExpandedItems] = useState<string[]>([])
  const [showSwitchUserDialog, setShowSwitchUserDialog] = useState(false)
  const [showPlanDialog, setShowPlanDialog] = useState(false)
  const [showLoginDialog, setShowLoginDialog] = useState(false)
  const [showPlaygroundDialog, setShowPlaygroundDialog] = useState(false)
  const [loginForm, setLoginForm] = useState({ email: '', password: '' })
  
  // Mock current user data - supports guest usage
  const [currentUser, setCurrentUser] = useState({
    email: "admin@company.com",
    plan: "Pro Plan",
    isPaidPlan: true,
    isGuest: false
  })
  
  const handleLogout = () => {
    // Switch to guest mode instead of redirecting
    setCurrentUser({
      email: "Guest User",
      plan: "Guest Access",
      isPaidPlan: false,
      isGuest: true
    })
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault()
    
    // Mock login validation - in real app would call API
    const mockUsers = {
      'new@company.com': { email: 'new@company.com', plan: 'Pro Plan', isPaidPlan: true },
      'test@company.com': { email: 'test@company.com', plan: 'Free Plan', isPaidPlan: false },
      'enterprise@company.com': { email: 'enterprise@company.com', plan: 'Enterprise Plan', isPaidPlan: true }
    }
    
    const user = mockUsers[loginForm.email as keyof typeof mockUsers]
    if (user && loginForm.password) {
      setCurrentUser({ ...user, isGuest: false })
      setShowLoginDialog(false)
      setShowSwitchUserDialog(false)
      setLoginForm({ email: '', password: '' })
    } else {
      alert('Invalid credentials. Try: new@company.com, test@company.com, or enterprise@company.com with any password.')
    }
  }

  // Smart expand/collapse logic
  useEffect(() => {
    if (pathname.startsWith("/dashboard/usage") || pathname === "/dashboard/billing") {
      // Expand usage menu on usage-related or license pages
      setExpandedItems(["/dashboard/usage"])
    } else {
      // Collapse menus on other pages
      setExpandedItems([])
    }
  }, [pathname])


  const toggleExpanded = (href: string) => {
    setExpandedItems((prev) => (prev.includes(href) ? prev.filter((item) => item !== href) : [...prev, href]))
  }

  return (
    <div className="hidden border-r bg-background dark:bg-gray-900 dark:border-gray-800 md:block fixed h-full w-[220px] lg:w-[280px]">
      <div className="flex h-full max-h-screen flex-col gap-2">
        <div className="flex h-14 items-center border-b dark:border-gray-800 px-4 lg:h-[60px] lg:px-6">
          <Link href="/" className="flex items-center gap-2 font-semibold dark:text-gray-100">
            <img
              src={actualTheme === 'dark' ? '/images/darkLogo.svg' : '/images/lightLogo.svg'}
              alt="Peta MCP Console"
              className="h-8"
            />
          </Link>
        </div>
        <div className="flex-1">
          <nav className="grid items-start px-2 text-sm font-medium lg:px-4">
            {navItems.map((item) => (
              <div key={item.label}>
                {item.subItems ? (
                  <Collapsible open={expandedItems.includes(item.href)} onOpenChange={() => toggleExpanded(item.href)}>
                    <CollapsibleTrigger asChild>
                      <button
                        className={cn(
                          "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground dark:text-gray-400 transition-all hover:text-primary dark:hover:text-blue-400 w-full",
                          (pathname.startsWith(item.href) || (item.href === "/dashboard/usage" && pathname === "/dashboard/billing")) && "bg-muted dark:bg-gray-800 text-primary dark:text-blue-400",
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
                        subItem.label === "Playground" ? (
                          <button
                            key={subItem.href}
                            onClick={() => setShowPlaygroundDialog(true)}
                            className={cn(
                              "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary text-sm w-full text-left",
                            )}
                          >
                            {subItem.label}
                          </button>
                        ) : subItem.external ? (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary text-sm",
                              pathname === subItem.href && "bg-muted text-primary",
                            )}
                          >
                            {subItem.label}
                          </Link>
                        ) : (
                          <Link
                            key={subItem.href}
                            href={subItem.href}
                            className={cn(
                              "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground dark:text-gray-400 transition-all hover:text-primary dark:hover:text-blue-400 text-sm",
                              pathname === subItem.href && "bg-muted dark:bg-gray-800 text-primary dark:text-blue-400",
                            )}
                          >
                            {subItem.label}
                          </Link>
                        )
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                ) : (
                  <TooltipProvider key={item.label}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        {item.external ? (
                          <Link
                            href={item.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={cn(
                              "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted relative overflow-hidden",
                              "bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700",
                              "shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200",
                              "border border-blue-500/20 hover:border-blue-400/30",
                              "before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/10 before:to-transparent before:opacity-0 hover:before:opacity-100 before:transition-opacity",
                            )}
                          >
                            <item.icon className="h-4 w-4 relative z-10" />
                            <span className="relative z-10 font-medium">{item.label}</span>
                            <LinkIcon className="h-3 w-3 ml-auto opacity-80 relative z-10" />
                          </Link>
                        ) : (
                          <Link
                            href={item.href}
                            className={cn(
                              "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground dark:text-gray-400 transition-all hover:text-primary dark:hover:text-blue-400",
                              pathname === item.href && "bg-muted dark:bg-gray-800 text-primary dark:text-blue-400",
                            )}
                          >
                            <item.icon className="h-4 w-4" />
                            {item.label}
                          </Link>
                        )}
                      </TooltipTrigger>
                      <TooltipContent side="right">
                        <p>
                          {item.label}
                          {item.external && " (Opens in new tab)"}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                )}
              </div>
            ))}
            
            {/* Connect Section */}
            <div className="mt-6">
              <div className="px-3 py-2">
                <h3 className="text-xs font-semibold text-muted-foreground dark:text-gray-400 uppercase tracking-wider border-b border-muted dark:border-gray-700 pb-2 mb-3">
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
                      onClick={() => setShowPlaygroundDialog(true)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-muted-foreground transition-all hover:text-primary hover:bg-muted w-full text-left",
                        "bg-gradient-to-r from-green-600 to-emerald-600 dark:from-green-700 dark:to-emerald-700 text-white hover:from-green-700 hover:to-emerald-700 dark:hover:from-green-800 dark:hover:to-emerald-800",
                        "shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-200",
                        "border border-green-500/20 dark:border-green-600/30 hover:border-green-400/30 dark:hover:border-green-500/40",
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
        </div>
        <div className="mt-auto p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 flex-1">
              <DropdownMenu>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-auto p-2 justify-start flex-1 max-w-[180px]">
                          <CircleUser className="h-4 w-4 mr-2 flex-shrink-0" />
                          <div className="text-left overflow-hidden">
                            <div className="text-xs font-medium truncate">{currentUser.email}</div>
                            <div className="text-xs text-muted-foreground truncate">{currentUser.plan}</div>
                          </div>
                        </Button>
                      </DropdownMenuTrigger>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>User Menu</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>
                    <div className="text-sm">{currentUser.email}</div>
                    <div className="text-xs text-muted-foreground font-normal">{currentUser.plan}</div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowSwitchUserDialog(true)}>
                    <UserCheck className="mr-2 h-4 w-4" />
                    Switch User
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setShowPlanDialog(true)}>
                    <Crown className="mr-2 h-4 w-4" />
                    Manage Plan
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem>
                    <Settings className="mr-2 h-4 w-4" />
                    Settings
                  </DropdownMenuItem>
                  <DropdownMenuItem>Support</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    Logout
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {!currentUser.isPaidPlan && (
              <Link href="/subscription">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-xs text-muted-foreground hover:text-foreground bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 border border-blue-200 dark:border-blue-800 hover:bg-gradient-to-r hover:from-blue-100 hover:to-purple-100 ml-2"
                      >
                        <Crown className="mr-1 h-3 w-3" />
                        Upgrade
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>View subscription plans</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Link>
            )}
          </div>
        </div>

        {/* Switch User Dialog */}
        <Dialog open={showSwitchUserDialog} onOpenChange={setShowSwitchUserDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Switch User</DialogTitle>
              <DialogDescription>
                Switching users will not affect the current server's plan. You can manage plans independently for each user account.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">{currentUser.email}</div>
                    <div className="text-sm text-muted-foreground">{currentUser.plan}</div>
                  </div>
                  <Button variant="outline" size="sm" disabled>
                    Current
                  </Button>
                </div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">dev@company.com</div>
                    <div className="text-sm text-muted-foreground">Free Plan</div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setCurrentUser({email: "dev@company.com", plan: "Free Plan", isPaidPlan: false, isGuest: false})
                      setShowSwitchUserDialog(false)
                    }}
                  >
                    Switch
                  </Button>
                </div>
              </div>
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">user@company.com</div>
                    <div className="text-sm text-muted-foreground">Enterprise Plan</div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setCurrentUser({email: "user@company.com", plan: "Enterprise Plan", isPaidPlan: true, isGuest: false})
                      setShowSwitchUserDialog(false)
                    }}
                  >
                    Switch
                  </Button>
                </div>
              </div>
              <div className="p-4 border rounded-lg bg-muted/20">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Guest User</div>
                    <div className="text-sm text-muted-foreground">Guest Access - Limited features</div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      setCurrentUser({email: "Guest User", plan: "Guest Access", isPaidPlan: false, isGuest: true})
                      setShowSwitchUserDialog(false)
                    }}
                  >
                    Switch to Guest
                  </Button>
                </div>
              </div>
              
              {/* Login to another account option */}
              <div className="p-4 border-2 border-dashed border-muted-foreground/20 rounded-lg hover:border-blue-300 hover:bg-blue-50 dark:bg-blue-900/20/50 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium text-blue-700 dark:text-blue-300">Login to another account</div>
                    <div className="text-sm text-muted-foreground">Sign in with different credentials</div>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:bg-blue-900/20"
                    onClick={() => {
                      setShowSwitchUserDialog(false)
                      setShowLoginDialog(true)
                    }}
                  >
                    <LogIn className="mr-1 h-3 w-3" />
                    Login
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Login Dialog */}
        <Dialog open={showLoginDialog} onOpenChange={setShowLoginDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Login to Another Account</DialogTitle>
              <DialogDescription>
                Enter your credentials to switch to a different account. This will not affect the current server settings.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">Email</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="user@company.com"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({...loginForm, email: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="login-password">Password</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="Enter your password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({...loginForm, password: e.target.value})}
                  required
                />
              </div>
              
              <div className="bg-muted/50 p-3 rounded-lg text-sm text-muted-foreground">
                <strong>Demo accounts:</strong><br />
                • new@company.com (Pro Plan)<br />
                • test@company.com (Free Plan)<br />
                • enterprise@company.com (Enterprise Plan)<br />
                <em>Use any password</em>
              </div>
              
              <div className="flex justify-end gap-2 pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => {
                    setShowLoginDialog(false)
                    setLoginForm({ email: '', password: '' })
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  <LogIn className="mr-2 h-4 w-4" />
                  Login
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        {/* Plan Management Dialog */}
        <Dialog open={showPlanDialog} onOpenChange={setShowPlanDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Manage Plan</DialogTitle>
              <DialogDescription>
                Current plan: {currentUser.plan}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="grid gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Free Plan</div>
                      <div className="text-sm text-muted-foreground">Basic features included</div>
                    </div>
                    <Button 
                      variant={currentUser.plan === "Free Plan" ? "default" : "outline"} 
                      size="sm"
                      disabled={currentUser.plan === "Free Plan"}
                      onClick={() => {
                        setCurrentUser({...currentUser, plan: "Free Plan", isPaidPlan: false})
                        setShowPlanDialog(false)
                      }}
                    >
                      {currentUser.plan === "Free Plan" ? "Current" : "Downgrade"}
                    </Button>
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Pro Plan</div>
                      <div className="text-sm text-muted-foreground">$19/month - Advanced features</div>
                    </div>
                    <Button 
                      variant={currentUser.plan === "Pro Plan" ? "default" : "outline"} 
                      size="sm"
                      disabled={currentUser.plan === "Pro Plan"}
                      onClick={() => {
                        setCurrentUser({...currentUser, plan: "Pro Plan", isPaidPlan: true})
                        setShowPlanDialog(false)
                      }}
                    >
                      {currentUser.plan === "Pro Plan" ? "Current" : "Upgrade"}
                    </Button>
                  </div>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Enterprise Plan</div>
                      <div className="text-sm text-muted-foreground">$99/month - All features included</div>
                    </div>
                    <Button 
                      variant={currentUser.plan === "Enterprise Plan" ? "default" : "outline"} 
                      size="sm"
                      disabled={currentUser.plan === "Enterprise Plan"}
                      onClick={() => {
                        setCurrentUser({...currentUser, plan: "Enterprise Plan", isPaidPlan: true})
                        setShowPlanDialog(false)
                      }}
                    >
                      {currentUser.plan === "Enterprise Plan" ? "Current" : "Upgrade"}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPlanDialog(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Playground Dialog */}
        <Dialog open={showPlaygroundDialog} onOpenChange={setShowPlaygroundDialog}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="text-2xl">Developer Playground</DialogTitle>
              <DialogDescription>Test and debug MCP Server connections.</DialogDescription>
            </DialogHeader>
            <Card>
              <CardContent className="space-y-4 pt-6">
                <div className="flex gap-2">
                  <GetCodeDialog />
                  <Button variant="ghost">Clear</Button>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="mcp-query">Ask MCP Server:</Label>
                  <div className="flex gap-2">
                    <Input id="mcp-query" placeholder="Enter your question, e.g.: How to configure this tool?" />
                    <Button>Submit</Button>
                  </div>
                  <p className="text-xs text-muted-foreground">Press Enter to submit your question quickly.</p>
                </div>
              </CardContent>
            </Card>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}

// Code snippets for the Get Code dialog
const aiSdkCode = `import { createMcp } from 'ai/rsc';
import { openai } from '@ai-sdk/openai';

const mcp = createMcp({
  // Your MCP server endpoint
  url: 'https://your-mcp-server.peta.io/api/mcp', 
});

const { text } = await mcp.generateText({
  model: openai('gpt-4o'),
  prompt: 'How do I configure the Web Search tool?',
});

console.log(text);`

const langchainCode = `from langchain_community.mcp import MCPTool

# Initialize the MCP tool with your server endpoint
mcp_tool = MCPTool(
    mcp_url="https://your-mcp-server.peta.io/api/mcp"
)

# Use the tool within a LangChain agent or directly
response = mcp_tool.invoke(
    "How do I configure the Web Search tool?"
)

print(response)`

function CodeSnippet({ code }: { code: string }) {
  const [hasCopied, setHasCopied] = useState(false)

  const copyToClipboard = () => {
    navigator.clipboard.writeText(code)
    setHasCopied(true)
    setTimeout(() => setHasCopied(false), 2000)
  }

  return (
    <div className="relative">
      <pre className="bg-muted p-4 rounded-md text-sm overflow-x-auto">
        <code>{code}</code>
      </pre>
      <Button
        size="icon"
        variant="ghost"
        className="absolute top-2 right-2 h-7 w-7"
        onClick={copyToClipboard}
        aria-label="Copy code"
      >
        {hasCopied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
      </Button>
    </div>
  )
}

function GetCodeDialog() {
  const [open, setOpen] = useState(false)
  
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Code className="mr-2 h-4 w-4" /> Get Code
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Connect with Code</DialogTitle>
          <DialogDescription>
            Use the following snippets to connect to your MCP server from your application.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="ai-sdk">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="ai-sdk">AI SDK</TabsTrigger>
            <TabsTrigger value="langchain">Langchain</TabsTrigger>
          </TabsList>
          <TabsContent value="ai-sdk">
            <CodeSnippet code={aiSdkCode} />
          </TabsContent>
          <TabsContent value="langchain">
            <CodeSnippet code={langchainCode} />
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
