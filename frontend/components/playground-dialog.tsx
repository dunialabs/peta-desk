"use client"

import { FlaskConical, Code, Copy, Check } from "lucide-react"
import { useState } from "react"

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
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

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
  return (
    <Dialog>
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
          <DialogTrigger asChild>
            <Button variant="outline">Close</Button>
          </DialogTrigger>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface PlaygroundDialogProps {
  children?: React.ReactNode
}

export function PlaygroundDialog({ children }: PlaygroundDialogProps) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline">
            <FlaskConical className="mr-2 h-4 w-4" />
            Playground
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-2xl">Developer Playground</DialogTitle>
          <DialogDescription>Test and debug MCP Server connections.</DialogDescription>
        </DialogHeader>
        <Card>
          <CardHeader>
            <CardTitle>Connection Test</CardTitle>
            <CardDescription>Test server connection and functionality.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-muted rounded-md">
              <p className="text-sm text-muted-foreground">Currently selected:</p>
              <p className="font-semibold">Development Server</p>
              <p className="text-xs text-muted-foreground">Local development MCP server with basic development tools</p>
            </div>
            <div className="flex gap-2">
              <Button>Test Connection</Button>
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
  )
}
