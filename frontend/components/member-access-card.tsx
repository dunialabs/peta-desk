import { Users, ArrowRight, Server } from "lucide-react"
import Link from "next/link"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

interface MemberAccessCardProps {
  serverName: string
}

export function MemberAccessCard({ serverName }: MemberAccessCardProps) {
  return (
    <div className="flex items-center justify-center min-h-[80vh] p-4">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-100">
            <Server className="h-8 w-8 text-blue-600 dark:text-blue-400" />
          </div>
          <CardTitle className="text-2xl">Member Access</CardTitle>
          <CardDescription className="text-base">You have member access to this server</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="text-center space-y-3">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-sm text-muted-foreground mb-1">Connected to:</p>
              <p className="font-semibold text-lg">{serverName}</p>
            </div>
            <p className="text-sm text-muted-foreground leading-relaxed">
              As a member, you can connect to and use this server's tools through MCP Client Management. Server
              configuration is managed by administrators.
            </p>
          </div>

          <div className="space-y-3">
            <Link href="/client-management" passHref className="w-full">
              <Button className="w-full" size="lg">
                <Users className="mr-2 h-4 w-4" />
                Go to MCP Client Management
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </Link>

            <div className="text-center">
              <Link href="/" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                ← Back to Portal Home
              </Link>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
