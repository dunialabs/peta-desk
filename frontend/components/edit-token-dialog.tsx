"use client"

import { Edit, ChevronDown, Globe, Github, Mail, Database } from "lucide-react"
import { useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"
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
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { cn } from "@/lib/utils"

interface Tool {
  id: string
  name: string
  icon: any
  enabled: boolean
  subFunctions: Array<{
    name: string
    enabled: boolean
  }>
}

interface Token {
  id: string
  name: string
  purpose?: string
  tools: Tool[]
}

interface EditTokenDialogProps {
  token: Token
  onSave: (updatedToken: Token) => void
}

const availableTools = [
  {
    id: "web-search",
    name: "Web Search",
    icon: Globe,
    enabled: true,
    subFunctions: [
      { name: "Google Search", enabled: true },
      { name: "Bing Search", enabled: false },
      { name: "DuckDuckGo", enabled: true },
    ],
  },
  {
    id: "github",
    name: "GitHub",
    icon: Github,
    enabled: true,
    subFunctions: [
      { name: "Repository Access", enabled: true },
      { name: "Issue Management", enabled: true },
      { name: "Pull Requests", enabled: false },
      { name: "Webhooks", enabled: false },
    ],
  },
  {
    id: "email",
    name: "Email",
    icon: Mail,
    enabled: false,
    subFunctions: [
      { name: "Send Email", enabled: false },
      { name: "Read Email", enabled: false },
      { name: "Manage Folders", enabled: false },
    ],
  },
  {
    id: "database",
    name: "Database",
    icon: Database,
    enabled: true,
    subFunctions: [
      { name: "Read Operations", enabled: true },
      { name: "Write Operations", enabled: false },
      { name: "Schema Management", enabled: true },
      { name: "Backup & Restore", enabled: false },
    ],
  },
]

export function EditTokenDialog({ token, onSave }: EditTokenDialogProps) {
  const [open, setOpen] = useState(false)
  const [name, setName] = useState(token.name)
  const [purpose, setPurpose] = useState(token.purpose || "")
  const [tools, setTools] = useState<Tool[]>(token.tools || availableTools)
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set())

  const toggleToolExpansion = (toolId: string) => {
    const newExpanded = new Set(expandedTools)
    if (newExpanded.has(toolId)) {
      newExpanded.delete(toolId)
    } else {
      newExpanded.add(toolId)
    }
    setExpandedTools(newExpanded)
  }

  const handleToolToggle = (toolId: string, enabled: boolean) => {
    setTools((prev) => prev.map((tool) => (tool.id === toolId ? { ...tool, enabled } : tool)))
  }

  const handleSubFunctionToggle = (toolId: string, subFunctionName: string, enabled: boolean) => {
    setTools((prev) =>
      prev.map((tool) =>
        tool.id === toolId
          ? {
              ...tool,
              subFunctions: tool.subFunctions.map((subFunc) =>
                subFunc.name === subFunctionName ? { ...subFunc, enabled } : subFunc,
              ),
            }
          : tool,
      ),
    )
  }

  const handleSave = () => {
    const updatedToken = {
      ...token,
      name,
      purpose,
      tools,
    }
    onSave(updatedToken)
    setOpen(false)
  }

  const handleCancel = () => {
    setName(token.name)
    setPurpose(token.purpose || "")
    setTools(token.tools || availableTools)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="text-xs bg-transparent">
          <Edit className="h-3 w-3" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Access Token</DialogTitle>
          <DialogDescription>Modify token settings, permissions, and tool access.</DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-token-name">Label <span className="text-red-500 dark:text-red-400">*</span></Label>
              <Input
                id="edit-token-name"
                placeholder="My API Token"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-token-notes">Notes (Optional)</Label>
              <Textarea
                id="edit-token-notes"
                placeholder="Add any notes about this token..."
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                rows={2}
              />
            </div>
          </div>

          {/* Tool Permissions */}
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-medium">Tool Permissions</h3>
              <p className="text-sm text-muted-foreground">
                Select which tools this token can access and configure specific functions.
              </p>
            </div>

            <div className="space-y-3">
              {tools.map((tool) => (
                <Card key={tool.id} className="bg-muted/20">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <tool.icon className="h-5 w-5" />
                        <CardTitle className="text-base">{tool.name}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={tool.enabled}
                          onCheckedChange={(checked) => handleToolToggle(tool.id, checked)}
                        />
                        {tool.subFunctions.length > 0 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0"
                            onClick={() => toggleToolExpansion(tool.id)}
                          >
                            <ChevronDown
                              className={cn("h-4 w-4 transition-transform", expandedTools.has(tool.id) && "rotate-180")}
                            />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardHeader>

                  <Collapsible open={expandedTools.has(tool.id)}>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <div className="space-y-2">
                          <p className="text-sm font-medium text-muted-foreground">Sub-functions:</p>
                          {tool.subFunctions.map((subFunc, index) => (
                            <div key={index} className="flex items-center justify-between py-1">
                              <span className="text-sm">{subFunc.name}</span>
                              <Switch
                                checked={subFunc.enabled}
                                onCheckedChange={(checked) => handleSubFunctionToggle(tool.id, subFunc.name, checked)}
                                disabled={!tool.enabled}
                              />
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!name.trim()}>Save Changes</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
