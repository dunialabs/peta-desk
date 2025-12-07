"use client"

import { AlertTriangle, Crown, PlusIcon, Building, Key, Zap } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

interface UpgradeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: "server" | "tool" | "token" | "api"
  currentPlan?: "free" | "plus" | "pro" | "enterprise"
}

const planRecommendations = {
  server: {
    free: {
      title: "Server Limit Reached",
      description: "You've reached the maximum of 1 server on the Free plan.",
      recommendation: "plus",
    },
    plus: {
      title: "Server Limit Reached",
      description: "You've reached the maximum of 3 servers on the Plus plan.",
      recommendation: "pro",
    },
    pro: {
      title: "Server Limit Reached",
      description: "You've reached the maximum of 10 servers on the Pro plan.",
      recommendation: "enterprise",
    },
  },
  tool: {
    free: {
      title: "Tool Limit Reached",
      description: "You've reached the maximum of 5 tools per server on the Free plan.",
      recommendation: "plus",
    },
    plus: {
      title: "Tool Limit Reached",
      description: "You've reached the maximum of 10 tools per server on the Plus plan.",
      recommendation: "pro",
    },
    pro: {
      title: "Tool Limit Reached",
      description: "You've reached the maximum of 20 tools per server on the Pro plan.",
      recommendation: "enterprise",
    },
  },
  token: {
    free: {
      title: "Access Token Limit Reached",
      description: "You've reached the maximum of 3 access tokens per server on the Free plan.",
      recommendation: "plus",
    },
    plus: {
      title: "Access Token Limit Reached",
      description: "You've reached the maximum of 10 access tokens per server on the Plus plan.",
      recommendation: "pro",
    },
    pro: {
      title: "Access Token Limit Reached",
      description:
        "You've reached the maximum of 50 access tokens per server on the Pro plan. You can purchase additional tokens or upgrade to Enterprise.",
      recommendation: "enterprise",
    },
  },
  api: {
    free: {
      title: "API Request Limit Reached",
      description: "You've reached the maximum of 3,000 API requests per month on the Free plan.",
      recommendation: "plus",
    },
    plus: {
      title: "API Request Limit Reached",
      description: "You've reached the maximum of 30,000 API requests per month on the Plus plan.",
      recommendation: "pro",
    },
    pro: {
      title: "API Request Limit Reached",
      description:
        "You've reached the maximum of 1,000,000 API requests per month on the Pro plan. You can purchase additional requests or upgrade to Enterprise.",
      recommendation: "enterprise",
    },
  },
}

const planDetails = {
  plus: {
    name: "Plus",
    price: "$99/month",
    icon: PlusIcon,
    features: ["3 Servers", "10 Tools per server", "10 Access tokens per server", "30K API requests/month"],
  },
  pro: {
    name: "Pro",
    price: "$999/month",
    icon: Crown,
    features: [
      "10 Servers",
      "20 Tools per server",
      "50 Access tokens per server",
      "1M API requests/month",
      "Purchase add-ons",
    ],
  },
  enterprise: {
    name: "Enterprise",
    price: "Custom pricing",
    icon: Building,
    features: ["Unlimited servers", "Unlimited tools", "Unlimited tokens", "Unlimited API requests"],
  },
}

export function UpgradeDialog({ open, onOpenChange, type, currentPlan = "free" }: UpgradeDialogProps) {
  const recommendation = planRecommendations[type][currentPlan as keyof (typeof planRecommendations)[typeof type]]
  const recommendedPlan = planDetails[recommendation.recommendation as keyof typeof planDetails]

  if (!recommendation || !recommendedPlan) return null

  const isProAddOnAvailable = currentPlan === "pro" && (type === "token" || type === "api")

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            <DialogTitle>{recommendation.title}</DialogTitle>
          </div>
          <DialogDescription>{recommendation.description}</DialogDescription>
        </DialogHeader>

        <div className="py-4 space-y-4">
          {/* Main Recommendation */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/20 dark:to-purple-950/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
            <div className="flex items-center gap-3 mb-3">
              <recommendedPlan.icon className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              <div>
                <h3 className="font-semibold text-blue-900 dark:text-blue-100">Upgrade to {recommendedPlan.name}</h3>
                <p className="text-sm text-blue-700 dark:text-blue-300 dark:text-blue-200">{recommendedPlan.price}</p>
              </div>
            </div>
            <ul className="space-y-1">
              {recommendedPlan.features.map((feature, index) => (
                <li key={index} className="text-sm text-blue-800 dark:text-blue-200 flex items-center gap-2">
                  <span className="w-1 h-1 bg-blue-600 rounded-full"></span>
                  {feature}
                </li>
              ))}
            </ul>
          </div>

          {/* Pro Add-on Option */}
          {isProAddOnAvailable && (
            <div className="bg-gradient-to-r from-purple-50 to-pink-50 dark:from-purple-950/20 dark:to-pink-950/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
              <div className="flex items-center gap-3 mb-3">
                {type === "token" ? (
                  <Key className="h-6 w-6 text-purple-600" />
                ) : (
                  <Zap className="h-6 w-6 text-purple-600" />
                )}
                <div>
                  <h3 className="font-semibold text-purple-900 dark:text-purple-100">
                    Purchase {type === "token" ? "Additional Tokens" : "Additional API Requests"}
                  </h3>
                  <p className="text-sm text-purple-700 dark:text-purple-200">
                    {type === "token" ? "$10 per token per server per month" : "$50 per 100K requests per month"}
                  </p>
                </div>
              </div>
              <p className="text-sm text-purple-800 dark:text-purple-200">Extend your Pro plan without upgrading</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Maybe Later
          </Button>
          <Link href="/subscription">
            <Button className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700">
              <recommendedPlan.icon className="mr-2 h-4 w-4" />
              View Plans
            </Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
