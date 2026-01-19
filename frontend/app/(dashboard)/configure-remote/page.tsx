'use client'

import { useState, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Header from '@/components/common/header'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from '@/components/ui/card'
import { toast } from 'sonner'
import { Plus, X } from 'lucide-react'

interface KeyValuePair {
  key: string
  value: string
}

function ConfigureRemoteContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [serverId, setServerId] = useState('')
  const [mcpServerId, setMcpServerId] = useState('')
  const [toolId, setToolId] = useState('')
  const [url, setUrl] = useState('')
  const [params, setParams] = useState<KeyValuePair[]>([])
  const [headers, setHeaders] = useState<KeyValuePair[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Extract query parameters from URL
  const extractQueryParams = (urlString: string): Record<string, string> => {
    try {
      const urlObj = new URL(urlString)
      const params: Record<string, string> = {}
      urlObj.searchParams.forEach((value, key) => {
        params[key] = value
      })
      return params
    } catch (error) {
      console.error('Failed to parse URL:', error)
      return {}
    }
  }

  useEffect(() => {
    // Get parameters from URL
    const sId = searchParams.get('serverId') || ''
    const mId = searchParams.get('mcpServerId') || ''
    const tId = searchParams.get('toolId') || ''

    setServerId(sId)
    setMcpServerId(mId)
    setToolId(tId)

    // Read configTemplate from sessionStorage instead of URL
    const storedData = sessionStorage.getItem('remote-config-template')
    if (storedData) {
      try {
        const data = JSON.parse(storedData)

        // Validate that stored data matches URL params (security check)
        if (data.serverId === sId && data.mcpServerId === mId && data.toolId === tId) {
          const parsed = JSON.parse(data.configTemplate)

          // Set URL
          if (parsed.url) {
            setUrl(parsed.url)

            // Extract query params from URL
            const extractedParams = extractQueryParams(parsed.url)
            const paramsArray = Object.entries(extractedParams).map(
              ([key, value]) => ({ key, value })
            )
            setParams(paramsArray.length > 0 ? paramsArray : [{ key: '', value: '' }])
          } else {
            setParams([{ key: '', value: '' }])
          }

          // Set headers
          if (parsed.headers && typeof parsed.headers === 'object') {
            const headersArray = Object.entries(parsed.headers).map(
              ([key, value]) => ({ key, value: String(value) })
            )
            setHeaders(headersArray.length > 0 ? headersArray : [{ key: '', value: '' }])
          } else {
            setHeaders([{ key: '', value: '' }])
          }

          // Clean up sessionStorage after reading
          sessionStorage.removeItem('remote-config-template')
        } else {
          console.error('Stored data does not match URL parameters')
          toast.error('Configuration data mismatch')
        }
      } catch (error) {
        console.error('Failed to parse stored config template:', error)
        toast.error('Failed to load configuration template')
        setParams([{ key: '', value: '' }])
        setHeaders([{ key: '', value: '' }])
      }
    } else {
      toast.error('Configuration template not found')
    }
  }, [searchParams])

  const handleAddParam = () => {
    setParams([...params, { key: '', value: '' }])
  }

  const handleRemoveParam = (index: number) => {
    if (params.length > 1) {
      setParams(params.filter((_, i) => i !== index))
    }
  }

  const handleParamChange = (
    index: number,
    field: 'key' | 'value',
    value: string
  ) => {
    const newParams = [...params]
    newParams[index][field] = value
    setParams(newParams)
  }

  const handleAddHeader = () => {
    setHeaders([...headers, { key: '', value: '' }])
  }

  const handleRemoveHeader = (index: number) => {
    if (headers.length > 1) {
      setHeaders(headers.filter((_, i) => i !== index))
    }
  }

  const handleHeaderChange = (
    index: number,
    field: 'key' | 'value',
    value: string
  ) => {
    const newHeaders = [...headers]
    newHeaders[index][field] = value
    setHeaders(newHeaders)
  }

  const handleSave = () => {
    // Validate params
    const validParams = params.filter((p) => p.key.trim() && p.value.trim())
    if (validParams.length === 0) {
      toast.error('At least one parameter with key and value is required')
      return
    }

    // Validate headers (allow empty headers)
    const validHeaders = headers.filter((h) => h.key.trim() && h.value.trim())

    setIsSubmitting(true)

    try {
      // Convert arrays to objects
      const paramsObject = validParams.reduce(
        (acc, param) => ({
          ...acc,
          [param.key.trim()]: param.value.trim()
        }),
        {}
      )

      const headersObject = validHeaders.reduce(
        (acc, header) => ({
          ...acc,
          [header.key.trim()]: header.value.trim()
        }),
        {}
      )

      // Assemble remoteAuth
      const remoteAuth = {
        params: paramsObject,
        headers: headersObject
      }

      // Save to sessionStorage
      sessionStorage.setItem(
        'pendingConfig',
        JSON.stringify({
          serverId,
          mcpServerId,
          toolId,
          remoteAuth
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

  if (!url) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading configuration...</p>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col">
      <Header title="Configure Remote Server" />

      <div className="flex-1 overflow-auto pb-24">
        <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
          {/* URL Display (Read-Only) */}
          <Card>
            <CardHeader>
              <CardTitle>Server URL</CardTitle>
              <CardDescription>Read-only server endpoint URL</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md bg-muted p-3 font-mono text-sm">
                {url}
              </div>
            </CardContent>
          </Card>

          {/* Parameters Editor */}
          <Card>
            <CardHeader>
              <CardTitle>URL Parameters</CardTitle>
              <CardDescription>
                Configure query parameters for the request
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {params.map((param, index) => (
                <div key={index} className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Parameter name"
                      value={param.key}
                      onChange={(e) =>
                        handleParamChange(index, 'key', e.target.value)
                      }
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      placeholder="Parameter value"
                      value={param.value}
                      onChange={(e) =>
                        handleParamChange(index, 'value', e.target.value)
                      }
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveParam(index)}
                    disabled={params.length === 1}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddParam}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Parameter
              </Button>
            </CardContent>
          </Card>

          {/* Headers Editor */}
          <Card>
            <CardHeader>
              <CardTitle>Request Headers</CardTitle>
              <CardDescription>
                Configure HTTP headers for the request
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {headers.map((header, index) => (
                <div key={index} className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Header name"
                      value={header.key}
                      onChange={(e) =>
                        handleHeaderChange(index, 'key', e.target.value)
                      }
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      placeholder="Header value"
                      value={header.value}
                      onChange={(e) =>
                        handleHeaderChange(index, 'value', e.target.value)
                      }
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveHeader(index)}
                    disabled={headers.length === 1}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                size="sm"
                onClick={handleAddHeader}
                className="w-full"
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Header
              </Button>
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

export default function ConfigureRemotePage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <ConfigureRemoteContent />
    </Suspense>
  )
}
