'use client'

import { useState } from 'react'
import {
  Calendar,
  Users,
  MapPin,
  Map,
  MessageCircle,
  CheckSquare,
  Cloud,
  Settings,
  Copy,
  Info,
  X
} from 'lucide-react'
// import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'

interface ServiceItem {
  id: string
  name: string
  icon: React.ComponentType<{ className?: string }>
  color: string
  enabled: boolean
}

export default function QuickPanelPage() {
  const [mcpEnabled, setMcpEnabled] = useState(true)
  const [services, setServices] = useState<ServiceItem[]>([
    {
      id: 'calendar',
      name: 'Calendar',
      icon: Calendar,
      color: 'bg-red-500',
      enabled: true
    },
    {
      id: 'contacts',
      name: 'Contacts',
      icon: Users,
      color: 'bg-amber-600',
      enabled: false
    },
    {
      id: 'location',
      name: 'Location',
      icon: MapPin,
      color: 'bg-blue-500',
      enabled: true
    },
    {
      id: 'maps',
      name: 'Maps',
      icon: Map,
      color: 'bg-purple-500',
      enabled: false
    },
    {
      id: 'messages',
      name: 'Messages',
      icon: MessageCircle,
      color: 'bg-gray-600',
      enabled: false
    },
    {
      id: 'reminders',
      name: 'Reminders',
      icon: CheckSquare,
      color: 'bg-gray-500',
      enabled: true
    },
    {
      id: 'weather',
      name: 'Weather',
      icon: Cloud,
      color: 'bg-sky-400',
      enabled: false
    }
  ])

  const toggleService = (serviceId: string) => {
    if (!mcpEnabled) return

    setServices(
      services.map((service) =>
        service.id === serviceId
          ? { ...service, enabled: !service.enabled }
          : service
      )
    )
  }

  const handleMcpToggle = (enabled: boolean) => {
    setMcpEnabled(enabled)
    if (!enabled) {
      // When MCP is disabled, disable all services
      setServices(services.map((service) => ({ ...service, enabled: false })))
    }
  }

  const closePanel = () => {
    if ((window as any).electron) {
      (window as any).electron.hideQuickPanel()
    }
  }

  const copyServerCommand = () => {
    navigator.clipboard.writeText('peta-mcp-server --port 8001')
  }

  return (
    <div className="w-80 bg-white dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200 dark:border-gray-700 rounded-lg shadow-2xl overflow-hidden">
      {/* Header with MCP Status */}
      <div className="p-3 bg-gray-50 dark:bg-gray-800/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${mcpEnabled ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
              MCP Server {mcpEnabled ? 'Running' : 'Stopped'}
            </span>
          </div>
          <Switch
            checked={mcpEnabled}
            onCheckedChange={handleMcpToggle}
            className="data-[state=checked]:bg-green-500"
          />
        </div>
      </div>

      <Separator />

      {/* Services Section */}
      <div className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Services
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {services.filter(s => s.enabled).length}/{services.length} Active
          </div>
        </div>
        <div className="space-y-1">
          {services.map((service) => {
            const IconComponent = service.icon
            return (
              <button
                key={service.id}
                onClick={() => toggleService(service.id)}
                disabled={!mcpEnabled}
                className="w-full flex items-center gap-3 px-2 py-2 rounded-md hover:bg-gray-100 dark:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div
                  className={`w-6 h-6 rounded-full ${service.color} flex items-center justify-center`}
                >
                  <IconComponent className="w-3.5 h-3.5 text-white" />
                </div>
                <span className="text-sm text-gray-700 dark:text-gray-200 flex-1 text-left">
                  {service.name}
                </span>
                {service.enabled && (
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      <Separator />

      {/* Quick Actions */}
      <div className="py-2">
        <button
          onClick={copyServerCommand}
          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 dark:bg-gray-800 transition-colors"
        >
          <Copy className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          <span className="text-sm text-gray-700 dark:text-gray-200">Copy Server Command</span>
        </button>

        <button 
          onClick={() => {
            if ((window as any).electron) {
              (window as any).electron.showSettings()
            }
          }}
          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 dark:bg-gray-800 transition-colors"
        >
          <Settings className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          <span className="text-sm text-gray-700 dark:text-gray-200">Open Settings</span>
        </button>
      </div>

      <Separator />

      {/* Quit Button */}
      <div className="py-2">
        <button
          onClick={closePanel}
          className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-100 dark:bg-gray-800 transition-colors"
        >
          <X className="w-4 h-4 text-gray-600 dark:text-gray-300" />
          <span className="text-sm text-gray-700 dark:text-gray-200">Quit</span>
        </button>
      </div>

      {/* Status Bar */}
      <div className={`h-1 ${mcpEnabled ? 'bg-green-500' : 'bg-red-500'} transition-colors duration-300`}></div>
    </div>
  )
}
