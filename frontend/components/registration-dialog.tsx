"use client"

import { Mail, Eye, EyeOff, CheckCircle, UserPlus } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"

interface RegistrationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onShowLoginDialog?: () => void
  onRegistrationSuccess?: (user: { email: string; name: string }) => void
}

export function RegistrationDialog({
  open,
  onOpenChange,
  onShowLoginDialog,
  onRegistrationSuccess,
}: RegistrationDialogProps) {
  const [registrationMethod, setRegistrationMethod] = useState<"email" | "gmail">("email")
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isRegistering, setIsRegistering] = useState(false)
  const [errors, setErrors] = useState<{ [key: string]: string }>({})

  const resetForm = () => {
    setFormData({
      name: "",
      email: "",
      password: "",
      confirmPassword: "",
    })
    setErrors({})
    setShowPassword(false)
    setShowConfirmPassword(false)
  }

  const validateForm = () => {
    const newErrors: { [key: string]: string } = {}

    if (!formData.name.trim()) {
      newErrors.name = "Name is required"
    }

    if (!formData.email.trim()) {
      newErrors.email = "Email is required"
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address"
    }

    if (registrationMethod === "email") {
      if (!formData.password) {
        newErrors.password = "Password is required"
      } else if (formData.password.length < 8) {
        newErrors.password = "Password must be at least 8 characters"
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = "Please confirm your password"
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = "Passwords do not match"
      }
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleEmailRegistration = async () => {
    if (!validateForm()) return

    setIsRegistering(true)

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000))

    setIsRegistering(false)
    onRegistrationSuccess?.({
      email: formData.email,
      name: formData.name,
    })
    onOpenChange(false)
    resetForm()
  }

  const handleGmailRegistration = async () => {
    if (!formData.name.trim() || !formData.email.trim()) {
      setErrors({
        name: !formData.name.trim() ? "Name is required" : "",
        email: !formData.email.trim() ? "Email is required" : "",
      })
      return
    }

    setIsRegistering(true)

    // Simulate OAuth flow
    await new Promise(resolve => setTimeout(resolve, 1500))

    setIsRegistering(false)
    onRegistrationSuccess?.({
      email: formData.email,
      name: formData.name,
    })
    onOpenChange(false)
    resetForm()
  }

  const handleSwitchToLogin = () => {
    onOpenChange(false)
    resetForm()
    onShowLoginDialog?.()
  }

  return (
    <Dialog open={open} onOpenChange={(open) => {
      onOpenChange(open)
      if (!open) resetForm()
    }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            <UserPlus className="h-6 w-6 text-blue-600 dark:text-blue-400" />
            Create Account
          </DialogTitle>
          <DialogDescription>
            Join Peta MCP Console to access all features
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Registration Method Toggle */}
          <div className="flex bg-muted rounded-lg p-1">
            <button
              type="button"
              onClick={() => setRegistrationMethod("email")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                registrationMethod === "email"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Mail className="mr-2 h-4 w-4 inline" />
              Email Registration
            </button>
            <button
              type="button"
              onClick={() => setRegistrationMethod("gmail")}
              className={`flex-1 py-2 px-4 rounded-md text-sm font-medium transition-colors ${
                registrationMethod === "gmail"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <svg className="mr-2 h-4 w-4 inline" viewBox="0 0 24 24">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Gmail Registration
            </button>
          </div>

          {/* Registration Form */}
          <div className="space-y-4">
            {/* Name Field */}
            <div className="space-y-2">
              <Label htmlFor="reg-name">Full Name *</Label>
              <Input
                id="reg-name"
                placeholder="Enter your full name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                disabled={isRegistering}
                className={errors.name ? "border-red-500" : ""}
              />
              {errors.name && <p className="text-sm text-red-500 dark:text-red-400">{errors.name}</p>}
            </div>

            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="reg-email">Email Address *</Label>
              <Input
                id="reg-email"
                type="email"
                placeholder={registrationMethod === "gmail" ? "your-gmail@gmail.com" : "your@email.com"}
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                disabled={isRegistering}
                className={errors.email ? "border-red-500" : ""}
              />
              {errors.email && <p className="text-sm text-red-500 dark:text-red-400">{errors.email}</p>}
            </div>

            {/* Password Fields (only for email registration) */}
            {registrationMethod === "email" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="reg-password">Password *</Label>
                  <div className="relative">
                    <Input
                      id="reg-password"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a secure password"
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      disabled={isRegistering}
                      className={errors.password ? "border-red-500 pr-10" : "pr-10"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      disabled={isRegistering}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.password && <p className="text-sm text-red-500 dark:text-red-400">{errors.password}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-confirm-password">Confirm Password *</Label>
                  <div className="relative">
                    <Input
                      id="reg-confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      disabled={isRegistering}
                      className={errors.confirmPassword ? "border-red-500 pr-10" : "pr-10"}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      disabled={isRegistering}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && <p className="text-sm text-red-500 dark:text-red-400">{errors.confirmPassword}</p>}
                </div>
              </>
            )}

            {/* Gmail Registration Note */}
            {registrationMethod === "gmail" && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md">
                <div className="flex items-start gap-2">
                  <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                  <div>
                    <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                      Quick Gmail Registration
                    </p>
                    <p className="text-xs text-blue-700 dark:text-blue-300 dark:text-blue-200 mt-1">
                      We'll use your Gmail account for secure authentication. No password needed - 
                      your account will be verified through Google's OAuth system.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="flex-col space-y-3">
          <Button
            onClick={registrationMethod === "email" ? handleEmailRegistration : handleGmailRegistration}
            disabled={isRegistering}
            className="w-full"
          >
            {isRegistering ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                Creating Account...
              </>
            ) : (
              <>
                <UserPlus className="w-4 h-4 mr-2" />
                {registrationMethod === "gmail" ? "Create Account with Gmail" : "Create Account"}
              </>
            )}
          </Button>

          <Separator />

          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <button
                type="button"
                onClick={handleSwitchToLogin}
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:text-blue-300 font-medium"
                disabled={isRegistering}
              >
                Sign in here
              </button>
            </p>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}