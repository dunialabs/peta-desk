"use client"

import { Server, Plus, CheckCircle, AlertCircle, Globe, Wifi, Wrench } from "lucide-react"
import { useState } from "react"

import { Alert, AlertDescription } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface CloudServer {
  id: string
  name: string
  address: string
  status: "running" | "stopped" | "unknown"
  role: "Owner" | "Admin" | "Member"
  lastOnline: string
}

interface ConnectPetaServerDialogProps {
  onConnect: (servers: any[]) => void
}

export function ConnectPetaServerDialog({ onConnect }: ConnectPetaServerDialogProps) {
  const [open, setOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  // Peta server form
  const [petaName, setPetaName] = useState("")
  const [petaAddress, setPetaAddress] = useState("")
  const [petaToken, setPetaToken] = useState("")
  const [testingPeta, setTestingPeta] = useState(false)
  const [petaTestResult, setPetaTestResult] = useState<boolean | null>(null)

  // Other server form (JSON)
  const [otherName, setOtherName] = useState("")
  const [otherJson, setOtherJson] = useState("")
  const [testingOther, setTestingOther] = useState(false)
  const [otherTestResult, setOtherTestResult] = useState<boolean | null>(null)

  const handleTestPetaServer = async () => {
    if (!petaAddress || !petaToken) return
    
    setTestingPeta(true)
    
    // Simulate test - random success/failure
    await new Promise(resolve => setTimeout(resolve, 2000))
    const success = Math.random() > 0.3
    
    setPetaTestResult(success)
    setTestingPeta(false)
  }

  const handleTestOtherServer = async () => {
    if (!otherJson) return
    
    try {
      JSON.parse(otherJson) // Validate JSON
    } catch {
      setOtherTestResult(false)
      return
    }
    
    setTestingOther(true)
    
    // Simulate test - random success/failure
    await new Promise(resolve => setTimeout(resolve, 2000))
    const success = Math.random() > 0.3
    
    setOtherTestResult(success)
    setTestingOther(false)
  }


  const canConnect = () => {
    // Check peta server
    const petaValid = petaName && petaAddress && petaToken
    
    // Check other server
    const otherValid = otherName && otherJson
    try {
      if (otherJson) JSON.parse(otherJson)
    } catch {
      return petaValid
    }

    return petaValid || otherValid
  }

  const handleConnect = async () => {
    if (!canConnect()) return

    setIsLoading(true)

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000))

    const serversToAdd = []

    // Add peta server
    if (petaName && petaAddress && petaToken) {
      serversToAdd.push({
        id: `peta-${Date.now()}`,
        name: petaName,
        type: "peta",
        status: "connected",
        address: petaAddress,
        userRole: "Member",
        autoDiscovered: false,
        hasUpdates: false,
        updates: [],
        tools: [
          {
            id: `web-search-peta-${Date.now()}`,
            name: "Web Search",
            icon: Globe,
            enabled: true,
            subFunctions: [{ name: "Google Search", enabled: true }],
          },
        ],
      })
    }

    // Add other server
    if (otherName && otherJson) {
      try {
        const config = JSON.parse(otherJson)
        serversToAdd.push({
          id: `other-${Date.now()}`,
          name: otherName,
          type: "other",
          status: "connected",
          address: config.address || "Custom Server",
          autoDiscovered: false,
          hasUpdates: false,
          updates: [],
          tools: [
            {
              id: `custom-tools-${Date.now()}`,
              name: "Custom Tools",
              icon: Wrench,
              enabled: true,
              subFunctions: [{ name: "Custom Function", enabled: true }],
            },
          ],
        })
      } catch (e) {
        console.error('Invalid JSON:', e)
      }
    }

    onConnect(serversToAdd)

    // Reset form
    setPetaName("")
    setPetaAddress("")
    setPetaToken("")
    setTestingPeta(false)
    setPetaTestResult(null)
    setOtherName("")
    setOtherJson("")
    setTestingOther(false)
    setOtherTestResult(null)
    setIsLoading(false)
    setOpen(false)
  }

  const serverCount = (petaName ? 1 : 0) + (otherName ? 1 : 0)
  const [activeTab, setActiveTab] = useState("peta")

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Plus className="mr-2 h-4 w-4" />
          Add MCP Server
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Server className="h-5 w-5" />
            Add MCP Server
          </DialogTitle>
          <DialogDescription>
            Add a Peta Server using address and token, or add other servers using JSON configuration.
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="peta">
              <Server className="w-4 h-4 mr-2" />
              Add Peta Server
            </TabsTrigger>
            <TabsTrigger value="other">
              <Wrench className="w-4 h-4 mr-2" />
              Add Other Server
            </TabsTrigger>
          </TabsList>

          <TabsContent value="peta" className="space-y-4">
            <Alert>
              <Server className="h-4 w-4" />
              <AlertDescription>
                Add a Peta Server by providing the server address and access token.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="peta-name">Server Name *</Label>
                <Input
                  id="peta-name"
                  placeholder="My Peta Server"
                  value={petaName}
                  onChange={(e) => setPetaName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="peta-address">Server Address *</Label>
                <Input
                  id="peta-address"
                  placeholder="https://my-peta-server.example.com"
                  value={petaAddress}
                  onChange={(e) => setPetaAddress(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="peta-token">Access Token *</Label>
                <div className="flex gap-2">
                  <Input
                    id="peta-token"
                    type="password"
                    placeholder="Enter access token..."
                    value={petaToken}
                    onChange={(e) => setPetaToken(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestPetaServer}
                    disabled={!petaAddress || !petaToken || testingPeta}
                    className={cn(
                      "px-3",
                      petaTestResult === true && "border-green-500 text-green-700",
                      petaTestResult === false && "border-red-500 text-red-700"
                    )}
                  >
                    {testingPeta ? (
                      <>
                        <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mr-1" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <Wifi className="w-3 h-3 mr-1" />
                        Test
                      </>
                    )}
                  </Button>
                </div>
                {petaTestResult !== null && (
                  <div className={cn(
                    "text-xs mt-1 flex items-center gap-1",
                    petaTestResult ? "text-green-600" : "text-red-600"
                  )}>
                    {petaTestResult ? (
                      <>
                        <CheckCircle className="w-3 h-3" />
                        Connection successful
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3 h-3" />
                        Connection failed
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          <TabsContent value="other" className="space-y-4">
            <Alert>
              <Wrench className="h-4 w-4" />
              <AlertDescription>
                Add other MCP servers by providing a JSON configuration.
              </AlertDescription>
            </Alert>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="other-name">Server Name *</Label>
                <Input
                  id="other-name"
                  placeholder="My Custom Server"
                  value={otherName}
                  onChange={(e) => setOtherName(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="other-json">Server Configuration (JSON) *</Label>
                <Textarea
                  id="other-json"
                  placeholder={`{
  "command": "node",
  "args": ["path/to/server.js"],
  "env": {
    "API_KEY": "your-api-key"
  },
  "address": "https://server.example.com"
}`}
                  value={otherJson}
                  onChange={(e) => setOtherJson(e.target.value)}
                  className="font-mono text-sm min-h-[120px]"
                />
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleTestOtherServer}
                    disabled={!otherJson || testingOther}
                    className={cn(
                      "px-3",
                      otherTestResult === true && "border-green-500 text-green-700",
                      otherTestResult === false && "border-red-500 text-red-700"
                    )}
                  >
                    {testingOther ? (
                      <>
                        <div className="w-3 h-3 border-2 border-slate-400 border-t-transparent rounded-full animate-spin mr-1" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <Wifi className="w-3 h-3 mr-1" />
                        Validate JSON
                      </>
                    )}
                  </Button>
                </div>
                {otherTestResult !== null && (
                  <div className={cn(
                    "text-xs mt-1 flex items-center gap-1",
                    otherTestResult ? "text-green-600" : "text-red-600"
                  )}>
                    {otherTestResult ? (
                      <>
                        <CheckCircle className="w-3 h-3" />
                        Valid JSON configuration
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-3 h-3" />
                        Invalid JSON configuration
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {serverCount > 0 && (
          <>
            <Separator />
            <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
              <div className="text-sm font-medium text-blue-900 dark:text-blue-100">Connection Summary</div>
              <div className="text-xs text-blue-700 dark:text-blue-300 mt-1">
                {serverCount} server{serverCount > 1 ? "s" : ""} will be added to all MCP clients
              </div>
            </div>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleConnect} disabled={!canConnect() || isLoading}>
            {isLoading ? "Connecting..." : serverCount > 0 ? `Connect (${serverCount})` : "Connect"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
