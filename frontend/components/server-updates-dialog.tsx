"use client"

import { RefreshCw, Server } from "lucide-react"

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
} from "@/components/ui/dialog"

interface ServerUpdatesDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  servers: any[]
}

export function ServerUpdatesDialog({ open, onOpenChange, servers }: ServerUpdatesDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            Servers with Updates
          </DialogTitle>
          <DialogDescription>
            The following Peta servers have updates available and will be synced to all clients.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 max-h-60 overflow-y-auto">
          {servers.map((server) => (
            <Card key={server.id} className="border border-slate-200">
              <CardContent className="p-3">
                <div className="flex items-center gap-3">
                  <Server className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-sm font-medium text-slate-900">{server.name}</span>
                      <Badge className="text-xs font-medium bg-red-100 text-red-700 border-red-200">
                        {server.updates?.length || 0} update{(server.updates?.length || 0) !== 1 ? "s" : ""}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500">{server.address}</p>
                    <p className="text-xs text-slate-600 mt-1">Tools have been updated and need to be synced</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg">
          <p className="text-xs text-blue-800">
            <strong>Note:</strong> When you sync all clients, these server updates will be automatically applied to all
            connected MCP clients. This ensures all clients have the latest tool configurations.
          </p>
        </div>

        <DialogFooter>
          <Button onClick={() => onOpenChange(false)}>Close</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
