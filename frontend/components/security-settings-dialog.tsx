"use client"

import { Shield, Clock, Power, Fingerprint, CheckCircle, Info } from "lucide-react"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { PasswordDialog } from "@/components/ui/password-dialog"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface SecuritySettings {
  requirePasswordOnStartup: boolean
  autoLockTimeout: number // in minutes, 0 means never
  requirePasswordForSensitiveOps: boolean
  enableFingerprintUnlock: boolean
}

interface BiometricAvailability {
  available: boolean
  platform: string
  touchID: boolean
  faceID: boolean
  windowsHello: boolean
  error: string | null
}

interface SecuritySettingsDialogProps {
  onApplySettings?: (settings: SecuritySettings) => void
}

export function SecuritySettingsDialog({ onApplySettings }: SecuritySettingsDialogProps) {
  const [open, setOpen] = useState(false)
  const [settings, setSettings] = useState<SecuritySettings>({
    requirePasswordOnStartup: true,
    autoLockTimeout: 30, // 30 minutes default
    requirePasswordForSensitiveOps: true,
    enableFingerprintUnlock: false,
  })

  const [biometricAvailable, setBiometricAvailable] = useState<BiometricAvailability | null>(null)
  const [isCheckingBiometric, setIsCheckingBiometric] = useState(true)
  const [showPasswordDialog, setShowPasswordDialog] = useState(false)

  const handleApply = () => {
    if (onApplySettings) {
      onApplySettings(settings)
    }
    setOpen(false)
  }

  // Check biometric availability
  useEffect(() => {
    const checkBiometricAvailability = async () => {
      try {
        if (typeof window !== 'undefined' && window.electron?.biometric) {
          const result = await window.electron.biometric.isAvailable()
          setBiometricAvailable(result)
          
          // Load saved settings
          const savedSettings = localStorage.getItem('biometric-dialog-settings')
          if (savedSettings && result.available) {
            try {
              const parsed = JSON.parse(savedSettings)
              setSettings(prev => ({
                ...prev,
                enableFingerprintUnlock: parsed.enableFingerprintUnlock || false
              }))
            } catch (error) {
              console.error('Failed to parse saved settings:', error)
            }
          }
        }
      } catch (error) {
        console.error('Failed to check biometric availability:', error)
      } finally {
        setIsCheckingBiometric(false)
      }
    }

    if (open) {
      checkBiometricAvailability()
    }
  }, [open])

  // Toggle biometric setting
  const toggleBiometricSetting = async (checked: boolean) => {
    if (!biometricAvailable?.available) {
      toast.error('Biometric authentication is not available on this device')
      return
    }

    try {
      if (checked) {
        // Enable biometrics - verify current password and persist
        setShowPasswordDialog(true)
      } else {
        // Disable biometrics - just update state

        console.info('Biometric authentication disabled successfully')
        
        // Update state
        setSettings(prev => ({ ...prev, enableFingerprintUnlock: false }))

        // Save to localStorage
        const settingsToSave = { enableFingerprintUnlock: false }
        localStorage.setItem('biometric-dialog-settings', JSON.stringify(settingsToSave))
      }
    } catch (error) {
      console.error('Failed to toggle biometric setting:', error)
      toast.error('Failed to update biometric setting')
    }
  }

  // Handle password confirmation
  const handlePasswordConfirm = async (password: string, setError: (error: string) => void): Promise<boolean> => {
    try {
      // Validate master password first
      const masterPassword = localStorage.getItem('masterPassword') || 'admin'
      if (password !== masterPassword) {
        setError('Incorrect master password. Please try again.')
        return false
      }

      // Validate biometric
      const authResult = await window.electron.biometric.authenticate('Enable biometric authentication')
      if (!authResult.success) {
        setError(`Biometric authentication failed: ${authResult.error}`)
        return false
      }

      console.info('Biometric authentication enabled successfully')
      
      // Update state
      setSettings(prev => ({ ...prev, enableFingerprintUnlock: true }))

      // Save to localStorage
      const settingsToSave = { enableFingerprintUnlock: true }
      localStorage.setItem('biometric-dialog-settings', JSON.stringify(settingsToSave))
      
      setShowPasswordDialog(false)
      return true
    } catch (error) {
      console.error('Failed to enable biometric authentication:', error)
      setError('An unexpected error occurred')
      return false
    }
  }

  // Handle password cancel
  const handlePasswordCancel = () => {
    setShowPasswordDialog(false)
  }

  // Get biometric title and description
  const getBiometricInfo = () => {
    if (!biometricAvailable) return { title: 'Biometric Authentication', description: 'Checking availability...' }
    
    if (biometricAvailable.platform === 'darwin' && biometricAvailable.touchID) {
      return {
        title: 'Touch ID Authentication',
        description: 'Use Touch ID to unlock instead of typing master password'
      }
    }
    
    if (biometricAvailable.platform === 'win32' && biometricAvailable.windowsHello) {
      return {
        title: 'Windows Hello Authentication',
        description: 'Use Windows Hello to unlock instead of typing master password'
      }
    }
    
    return {
      title: 'Biometric Authentication',
      description: 'Use biometric authentication to unlock instead of typing master password'
    }
  }

  const timeoutOptions = [
    { value: 0, label: "Never" },
    { value: 5, label: "5 minutes" },
    { value: 15, label: "15 minutes" },
    { value: 30, label: "30 minutes" },
    { value: 60, label: "1 hour" },
    { value: 120, label: "2 hours" },
    { value: 240, label: "4 hours" },
  ]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="bg-transparent">
          <Shield className="w-3 h-3 mr-1.5" />
          Security
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Security Settings
          </DialogTitle>
          <DialogDescription>Configure global security settings for MCP Client Management.</DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="auth" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="auth">Authentication</TabsTrigger>
            <TabsTrigger value="session">Session Control</TabsTrigger>
          </TabsList>

          <TabsContent value="auth" className="space-y-4">
            {/* Startup Authentication */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Power className="h-5 w-5" />
                  Startup Authentication
                </CardTitle>
                <CardDescription>Control when master password is required</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="startup-password">Require password on startup</Label>
                    <p className="text-xs text-muted-foreground">
                      Require master password every time the application starts
                    </p>
                  </div>
                  <Switch
                    id="startup-password"
                    checked={settings.requirePasswordOnStartup}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({ ...prev, requirePasswordOnStartup: checked }))
                    }
                  />
                </div>

                <Separator />

                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <Label htmlFor="sensitive-ops">Require password for sensitive operations</Label>
                    <p className="text-xs text-muted-foreground">
                      Require master password for security settings and sensitive operations
                    </p>
                  </div>
                  <Switch
                    id="sensitive-ops"
                    checked={settings.requirePasswordForSensitiveOps}
                    onCheckedChange={(checked) =>
                      setSettings((prev) => ({ ...prev, requirePasswordForSensitiveOps: checked }))
                    }
                  />
                </div>
              </CardContent>
            </Card>

            {/* Biometric Authentication */}
            {(isCheckingBiometric || biometricAvailable?.available) && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Fingerprint className="h-5 w-5" />
                    {getBiometricInfo().title}
                  </CardTitle>
                  <CardDescription>Use biometric authentication for quick and secure access</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {isCheckingBiometric ? (
                    <div className="text-sm text-muted-foreground">
                      Checking biometric availability...
                    </div>
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <div className="space-y-1">
                          <Label htmlFor="biometric-unlock">Enable biometric unlock</Label>
                          <p className="text-xs text-muted-foreground">
                            {getBiometricInfo().description}
                          </p>
                        </div>
                        <Switch
                          id="biometric-unlock"
                          checked={settings.enableFingerprintUnlock}
                          onCheckedChange={toggleBiometricSetting}
                          disabled={!biometricAvailable?.available}
                        />
                      </div>

                      {biometricAvailable?.available ? (
                        <Alert>
                          <CheckCircle className="h-4 w-4" />
                          <AlertDescription>
                            <div className="space-y-1">
                              <p className="font-medium text-green-900">
                                {biometricAvailable.platform === 'darwin' ? 'Touch ID' : 'Windows Hello'} Available
                              </p>
                              <p className="text-sm text-green-800">
                                Your device supports biometric authentication. Enable this option for quick and secure access.
                              </p>
                            </div>
                          </AlertDescription>
                        </Alert>
                      ) : (
                        <Alert>
                          <Info className="h-4 w-4" />
                          <AlertDescription>
                            <div className="space-y-1">
                              <p className="font-medium">Biometric Authentication Not Available</p>
                              <p className="text-sm text-muted-foreground">
                                {biometricAvailable?.error || "Your device doesn't support biometric authentication or it's not configured."}
                              </p>
                            </div>
                          </AlertDescription>
                        </Alert>
                      )}

                      {settings.enableFingerprintUnlock && (
                        <div className="p-3 bg-blue-50 dark:bg-blue-900/20 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md">
                          <p className="text-xs text-blue-800 dark:text-blue-200">
                            <strong>Note:</strong> Biometric unlock will be used as an alternative to master password for
                            routine operations. Sensitive operations may still require password confirmation.
                          </p>
                        </div>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="session" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Session Management
                </CardTitle>
                <CardDescription>Control automatic session locking and timeouts</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="auto-lock">Auto-lock timeout</Label>
                  <Select
                    value={settings.autoLockTimeout.toString()}
                    onValueChange={(value) =>
                      setSettings((prev) => ({ ...prev, autoLockTimeout: Number.parseInt(value) }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {timeoutOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value.toString()}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Automatically lock the session after the specified time of inactivity
                  </p>
                </div>

                {settings.autoLockTimeout > 0 && (
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-md">
                    <p className="text-xs text-blue-800 dark:text-blue-200">
                      <strong>Note:</strong> Session will automatically lock after {settings.autoLockTimeout} minutes of
                      inactivity. You'll need to {settings.enableFingerprintUnlock ? "use fingerprint or " : ""}
                      enter your master password to continue.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="bg-slate-50 p-4 rounded-lg">
          <h4 className="text-sm font-medium mb-2 text-slate-900">Settings Summary</h4>
          <div className="space-y-1 text-xs text-slate-600">
            <div className="flex justify-between">
              <span>Startup password:</span>
              <span className="font-medium">{settings.requirePasswordOnStartup ? "Required" : "Not required"}</span>
            </div>
            <div className="flex justify-between">
              <span>Biometric unlock:</span>
              <span className="font-medium">
                {settings.enableFingerprintUnlock ? "Enabled" : "Disabled"}
                {!biometricAvailable?.available && settings.enableFingerprintUnlock && " (Not available)"}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Auto-lock:</span>
              <span className="font-medium">
                {settings.autoLockTimeout === 0 ? "Never" : `${settings.autoLockTimeout} minutes`}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Sensitive operations:</span>
              <span className="font-medium">
                {settings.requirePasswordForSensitiveOps ? "Password required" : "No password"}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply} className="bg-slate-900 hover:bg-slate-800">
            Apply Settings
          </Button>
        </DialogFooter>
        
        {/* Password confirmation dialog */}
        <PasswordDialog
          open={showPasswordDialog}
          onOpenChange={setShowPasswordDialog}
          title="Enable Biometric Authentication"
          description="Please enter your master password to enable biometric authentication."
          onConfirm={handlePasswordConfirm}
          onCancel={handlePasswordCancel}
        />
      </DialogContent>
    </Dialog>
  )
}
