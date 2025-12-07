"use client"

import { Check, Crown, Star, PlusIcon, Building, Key, Mail } from "lucide-react"
import { useState } from "react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

const plans = {
  free: {
    name: "Free",
    icon: Star,
    price: { monthly: 0, yearly: 0 },
    description: "Perfect for getting started with MCP",
    features: [
      "Up to 5 Access Tokens",
      "Unlimited MCP Servers",
      "Unlimited API requests",
      "Basic client management",
      "Community support",
    ],
    popular: false,
  },
  pro: {
    name: "Pro",
    icon: Crown,
    price: { monthly: 99, yearly: 1080 },
    description: "Great for teams and growing projects",
    features: [
      "Up to 30 Access Tokens",
      "Everything in Free, plus:",
      "Advanced client management",
      "Email & priority support",
      "OAuth & API key auth",
      "Backup & restore",
    ],
    popular: true,
  },
  max: {
    name: "Max",
    icon: PlusIcon,
    price: { monthly: 599, yearly: 6588 },
    description: "Perfect for professional teams and businesses",
    features: [
      "Up to 100 Access Tokens",
      "Everything in Pro, plus:",
      "24/7 priority support",
      "Advanced analytics dashboard",
      "Dedicated account manager",
      "Custom development support",
    ],
    popular: false,
  },
  enterprise: {
    name: "Enterprise",
    icon: Building,
    price: { monthly: "Custom", yearly: "Custom" },
    description: "For large organizations with unlimited needs",
    features: [
      "Unlimited Access Tokens",
      "Everything in Max, plus:",
      "24/7 phone support",
      "On-premise deployment",
      "Custom SLA",
      "White-label options",
    ],
    popular: false,
  },
}

interface PlanSelectionDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  currentPlan?: string
}

export function PlanSelectionDialog({ open, onOpenChange, currentPlan = "free" }: PlanSelectionDialogProps) {
  const [isYearly, setIsYearly] = useState(false)
  const [showUpgradeDialog, setShowUpgradeDialog] = useState(false)
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null)
  const [upgradeMethod, setUpgradeMethod] = useState<"key" | "cloud" | null>(null)
  const [licenseKey, setLicenseKey] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isProcessing, setIsProcessing] = useState(false)

  const handlePlanSelect = (planKey: string) => {
    if (planKey === "enterprise") {
      // Handle enterprise plan separately
      return
    }
    setSelectedPlan(planKey)
    setShowUpgradeDialog(true)
    setUpgradeMethod("key") // Default to key input
    setLicenseKey("")
    setEmail("")
    setPassword("")
  }

  const handleUpgrade = async () => {
    if (!upgradeMethod || !selectedPlan) return
    
    setIsProcessing(true)
    
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    if (upgradeMethod === "key") {
      console.log("Upgrading with license key:", licenseKey)
    } else if (upgradeMethod === "cloud") {
      console.log("Upgrading with cloud account:", email)
    }
    
    setIsProcessing(false)
    setShowUpgradeDialog(false)
    onOpenChange(false)
  }

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-2xl">Choose Your Plan</DialogTitle>
            <DialogDescription>
              Scale your MCP infrastructure with the right plan for your needs
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Billing Toggle */}
            <div className="flex items-center justify-center gap-4">
              <span className={`text-sm ${!isYearly ? "font-medium" : "text-muted-foreground"}`}>
                Monthly
              </span>
              <Switch checked={isYearly} onCheckedChange={setIsYearly} />
              <span className={`text-sm ${isYearly ? "font-medium" : "text-muted-foreground"}`}>
                Yearly
              </span>
              <Badge variant="secondary" className="bg-green-100 text-green-800 border-green-200">
                Save 10%
              </Badge>
            </div>

            {/* Plans Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {Object.entries(plans).map(([key, plan]) => (
                <Card key={key} className={`relative ${plan.popular ? "ring-2 ring-blue-500 shadow-lg" : ""}`}>
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-blue-500 text-white">Most Popular</Badge>
                    </div>
                  )}

                  <CardHeader className="text-center pb-4">
                    <div className="flex items-center justify-center mb-4">
                      <plan.icon className="h-8 w-8 text-blue-600 dark:text-blue-400" />
                    </div>
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <CardDescription className="text-sm">{plan.description}</CardDescription>

                    <div className="mt-4">
                      <div className="text-2xl font-bold">
                        {typeof plan.price.monthly === "number" ? (
                          <>
                            ${isYearly ? Math.floor((plan.price.yearly / 12) * 10) / 10 : plan.price.monthly}
                            <span className="text-sm font-normal text-muted-foreground">/{isYearly ? "mo" : "month"}</span>
                          </>
                        ) : (
                          <span className="text-lg">Contact Sales</span>
                        )}
                      </div>
                      {isYearly && typeof plan.price.monthly === "number" && plan.price.monthly > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">Billed yearly (${plan.price.yearly})</p>
                      )}
                    </div>
                  </CardHeader>

                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      {plan.features.map((feature, index) => (
                        <div key={index} className="flex items-start gap-2">
                          <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                          <span className="text-xs">{feature}</span>
                        </div>
                      ))}
                    </div>

                    <div className="pt-4">
                      {currentPlan === key ? (
                        <Button variant="outline" className="w-full bg-transparent" disabled>
                          Current Plan
                        </Button>
                      ) : key === "enterprise" ? (
                        <Button className="w-full">Contact Sales</Button>
                      ) : (
                        <Button className="w-full" onClick={() => handlePlanSelect(key)}>
                          {currentPlan === "free" ? "Upgrade" : "Switch"} to {plan.name}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Upgrade Dialog */}
      <Dialog open={showUpgradeDialog} onOpenChange={setShowUpgradeDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upgrade to {selectedPlan && plans[selectedPlan as keyof typeof plans]?.name}</DialogTitle>
            <DialogDescription>
              Choose how you want to activate your subscription
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {upgradeMethod === "key" ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">License Key Activation</span>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="license-key">License Key</Label>
                  <Textarea
                    id="license-key"
                    placeholder="Enter your license key here..."
                    value={licenseKey}
                    onChange={(e) => setLicenseKey(e.target.value)}
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Paste your complete license key including dashes and line breaks
                  </p>
                </div>
                
                <div className="pt-2">
                  <Button 
                    variant="link" 
                    className="p-0 h-auto text-sm"
                    onClick={() => setUpgradeMethod("cloud")}
                  >
                    Or login with your cloud account instead
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2 mb-4">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm font-medium">Cloud Account Login</span>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="password">Password</Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter your password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                  </div>
                  <div className="pt-2">
                    <Button 
                      variant="link" 
                      className="p-0 h-auto text-sm"
                      onClick={() => setUpgradeMethod("key")}
                    >
                      Or use a license key instead
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowUpgradeDialog(false)}
              disabled={isProcessing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpgrade}
              disabled={
                isProcessing ||
                (upgradeMethod === "key" && !licenseKey.trim()) ||
                (upgradeMethod === "cloud" && (!email.trim() || !password.trim()))
              }
            >
              {isProcessing ? "Processing..." : "Activate Subscription"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}