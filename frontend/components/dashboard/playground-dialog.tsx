"use client"

import { Check, Code, Copy, FlaskConical } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

interface PlaygroundDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function PlaygroundDialog({ open, onOpenChange }: PlaygroundDialogProps) {
  const [copiedStates, setCopiedStates] = useState<{ [key: string]: boolean }>({})

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopiedStates(prev => ({ ...prev, [key]: true }))
    setTimeout(() => {
      setCopiedStates(prev => ({ ...prev, [key]: false }))
    }, 2000)
  }

  const codeExamples = {
    python: `import requests

# Example: Get weather information
response = requests.get(
    "http://localhost:8080/api/tool/weather",
    params={"location": "San Francisco"}
)
print(response.json())`,
    javascript: `// Example: Get weather information
fetch('http://localhost:8080/api/tool/weather?location=San Francisco')
  .then(response => response.json())
  .then(data => console.log(data))
  .catch(error => console.error('Error:', error));`,
    curl: `# Example: Get weather information
curl -X GET "http://localhost:8080/api/tool/weather?location=San Francisco"

# Example with authentication
curl -X GET "http://localhost:8080/api/tool/secure-data" \\
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"`
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FlaskConical className="h-5 w-5" />
            API Playground
          </DialogTitle>
          <DialogDescription>
            Test your configured tools and explore API endpoints
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="quickstart" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="quickstart">Quick Start</TabsTrigger>
              <TabsTrigger value="endpoints">Endpoints</TabsTrigger>
              <TabsTrigger value="examples">Code Examples</TabsTrigger>
            </TabsList>
            
            <TabsContent value="quickstart" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Getting Started</CardTitle>
                  <CardDescription>
                    Your Peta Server is running at: <code className="text-sm bg-muted px-2 py-1 rounded">http://localhost:8080</code>
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">1. Test Connection</h4>
                    <div className="bg-muted p-3 rounded-md font-mono text-sm">
                      curl http://localhost:8080/health
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2">2. List Available Tools</h4>
                    <div className="bg-muted p-3 rounded-md font-mono text-sm">
                      curl http://localhost:8080/api/tools
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium mb-2">3. Call a Tool</h4>
                    <div className="bg-muted p-3 rounded-md font-mono text-sm">
                      curl http://localhost:8080/api/tool/[tool-name]
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="endpoints" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Available Endpoints</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium bg-green-100 text-green-800 px-2 py-1 rounded">GET</span>
                            <code className="text-sm font-mono">/health</code>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">Check server health status</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium bg-green-100 text-green-800 px-2 py-1 rounded">GET</span>
                            <code className="text-sm font-mono">/api/tools</code>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">List all configured tools</p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="border rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium bg-blue-100 dark:bg-blue-900/30 text-blue-800 px-2 py-1 rounded">POST</span>
                            <code className="text-sm font-mono">/api/tool/:name</code>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">Execute a specific tool</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="examples" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Code Examples</CardTitle>
                  <CardDescription>
                    Sample code to interact with your Peta Server
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="python" className="w-full">
                    <TabsList>
                      <TabsTrigger value="python">Python</TabsTrigger>
                      <TabsTrigger value="javascript">JavaScript</TabsTrigger>
                      <TabsTrigger value="curl">cURL</TabsTrigger>
                    </TabsList>
                    
                    {Object.entries(codeExamples).map(([lang, code]) => (
                      <TabsContent key={lang} value={lang}>
                        <div className="relative">
                          <pre className="bg-muted p-4 rounded-lg overflow-x-auto">
                            <code className="text-sm">{code}</code>
                          </pre>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="absolute top-2 right-2"
                            onClick={() => handleCopy(code, lang)}
                          >
                            {copiedStates[lang] ? (
                              <Check className="h-4 w-4" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                      </TabsContent>
                    ))}
                  </Tabs>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  )
}