'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from '@/components/common/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { toast } from 'sonner'

type AuthType = 'bearer' | 'header' | 'query_param' | 'basic'

function ConfigureRestApiContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [serverId, setServerId] = useState('')
  const [mcpServerId, setMcpServerId] = useState('')
  const [toolId, setToolId] = useState('')
  const [configTemplateObj, setConfigTemplateObj] = useState<any>(null)

  // Auth fields
  const [authType, setAuthType] = useState<AuthType>('bearer')
  const [authValue, setAuthValue] = useState('')
  const [authHeader, setAuthHeader] = useState('')
  const [authParam, setAuthParam] = useState('')
  const [authUsername, setAuthUsername] = useState('')
  const [authPassword, setAuthPassword] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    // Get parameters from URL
    const sId = searchParams.get('serverId') || ''
    const mId = searchParams.get('mcpServerId') || ''
    const tId = searchParams.get('toolId') || ''

    setServerId(sId)
    setMcpServerId(mId)
    setToolId(tId)

    // Read configTemplate from sessionStorage instead of URL
    const storedData = sessionStorage.getItem('restapi-config-template')
    if (storedData) {
      try {
        const data = JSON.parse(storedData)

        // Validate that stored data matches URL params (security check)
        if (data.serverId === sId && data.mcpServerId === mId && data.toolId === tId) {
          const parsed = JSON.parse(data.configTemplate)
          setConfigTemplateObj(parsed)

          // Pre-fill auth fields if they exist
          if (parsed.auth) {
            const auth = parsed.auth
            setAuthType((auth.type as AuthType) || 'bearer')
            setAuthValue(auth.value || '')
            setAuthHeader(auth.header || '')
            setAuthParam(auth.param || '')
            setAuthUsername(auth.username || '')
            setAuthPassword(auth.password || '')
          }

          // Clean up sessionStorage after reading
          sessionStorage.removeItem('restapi-config-template')
        } else {
          console.error('Stored data does not match URL parameters')
          toast.error('Configuration data mismatch')
        }
      } catch (error) {
        console.error('Failed to parse stored config template:', error)
        toast.error('Failed to load configuration template')
      }
    } else {
      toast.error('Configuration template not found')
    }
  }, [searchParams])

  const validateAuth = (): boolean => {
    if (authType === 'bearer') {
      if (!authValue.trim()) {
        toast.error('Bearer token is required')
        return false
      }
    } else if (authType === 'header') {
      if (!authHeader.trim()) {
        toast.error('Header name is required')
        return false
      }
      if (!authValue.trim()) {
        toast.error('Header value is required')
        return false
      }
    } else if (authType === 'query_param') {
      if (!authParam.trim()) {
        toast.error('Parameter name is required')
        return false
      }
      if (!authValue.trim()) {
        toast.error('Parameter value is required')
        return false
      }
    } else if (authType === 'basic') {
      if (!authUsername.trim()) {
        toast.error('Username is required')
        return false
      }
      if (!authPassword.trim()) {
        toast.error('Password is required')
        return false
      }
    }
    return true
  }

  const handleSave = () => {
    if (!validateAuth()) {
      return
    }

    setIsSubmitting(true)

    try {
      // Assemble restfulApiAuth based on auth type
      let restfulApiAuth: any = { type: authType }

      if (authType === 'bearer') {
        restfulApiAuth.value = authValue.trim()
      } else if (authType === 'header') {
        restfulApiAuth.header = authHeader.trim()
        restfulApiAuth.value = authValue.trim()
      } else if (authType === 'query_param') {
        restfulApiAuth.param = authParam.trim()
        restfulApiAuth.value = authValue.trim()
      } else if (authType === 'basic') {
        restfulApiAuth.username = authUsername.trim()
        restfulApiAuth.password = authPassword.trim()
      }

      // Save to sessionStorage
      sessionStorage.setItem(
        'pendingConfig',
        JSON.stringify({
          serverId,
          mcpServerId,
          toolId,
          restfulApiAuth
        })
      )

      toast.success('Configuration saved')
      router.push('/dashboard')
    } catch (error) {
      console.error('Failed to save configuration:', error)
      toast.error('Failed to save configuration')
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    router.push('/dashboard')
  }

  if (!configTemplateObj) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading configuration...</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col">
      <Header title="Configure REST API" />

      <div className="flex-1 overflow-auto pb-24">
        <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
          {/* Full JSON Display (Read-Only) */}
          <Card>
            <CardHeader>
              <CardTitle>Complete Configuration</CardTitle>
              <CardDescription>
                Read-only view of the complete API configuration
              </CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="overflow-auto rounded-md bg-muted p-4 text-sm">
                <code>{JSON.stringify(configTemplateObj, null, 2)}</code>
              </pre>
            </CardContent>
          </Card>

          {/* Auth Configuration (Editable) */}
          <Card>
            <CardHeader>
              <CardTitle>Authentication Configuration</CardTitle>
              <CardDescription>
                Configure the authentication details for this API
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Auth Type Selector */}
              <div className="space-y-2">
                <Label htmlFor="authType">Authentication Type</Label>
                <Select
                  value={authType}
                  onValueChange={(value) => setAuthType(value as AuthType)}
                >
                  <SelectTrigger id="authType">
                    <SelectValue placeholder="Select authentication type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bearer">Bearer Token</SelectItem>
                    <SelectItem value="header">Custom Header</SelectItem>
                    <SelectItem value="query_param">Query Parameter</SelectItem>
                    <SelectItem value="basic">Basic Auth</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Dynamic fields based on auth type */}
              {authType === 'bearer' && (
                <div className="space-y-2">
                  <Label htmlFor="authValue">Bearer Token</Label>
                  <Input
                    id="authValue"
                    type="password"
                    value={authValue}
                    onChange={(e) => setAuthValue(e.target.value)}
                    placeholder="Enter your bearer token"
                  />
                </div>
              )}

              {authType === 'header' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="authHeader">Header Name</Label>
                    <Input
                      id="authHeader"
                      value={authHeader}
                      onChange={(e) => setAuthHeader(e.target.value)}
                      placeholder="e.g., X-API-Key"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="authValue">Header Value</Label>
                    <Input
                      id="authValue"
                      type="password"
                      value={authValue}
                      onChange={(e) => setAuthValue(e.target.value)}
                      placeholder="Enter your API key"
                    />
                  </div>
                </>
              )}

              {authType === 'query_param' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="authParam">Parameter Name</Label>
                    <Input
                      id="authParam"
                      value={authParam}
                      onChange={(e) => setAuthParam(e.target.value)}
                      placeholder="e.g., api_key"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="authValue">Parameter Value</Label>
                    <Input
                      id="authValue"
                      type="password"
                      value={authValue}
                      onChange={(e) => setAuthValue(e.target.value)}
                      placeholder="Enter your API key"
                    />
                  </div>
                </>
              )}

              {authType === 'basic' && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="authUsername">Username</Label>
                    <Input
                      id="authUsername"
                      value={authUsername}
                      onChange={(e) => setAuthUsername(e.target.value)}
                      placeholder="Enter username"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="authPassword">Password</Label>
                    <Input
                      id="authPassword"
                      type="password"
                      value={authPassword}
                      onChange={(e) => setAuthPassword(e.target.value)}
                      placeholder="Enter password"
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Fixed Bottom Buttons */}
      <div className="fixed bottom-0 left-0 right-0 border-t bg-background p-4">
        <div className="mx-auto flex max-w-2xl gap-2">
          <Button
            variant="outline"
            className="flex-1"
            onClick={handleCancel}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            className="flex-1"
            onClick={handleSave}
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default function ConfigureRestApiPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <ConfigureRestApiContent />
    </Suspense>
  )
}
