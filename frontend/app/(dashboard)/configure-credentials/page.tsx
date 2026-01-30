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

interface Credential {
  name: string
  description: string
  dataType: number
  key: string
  value?: string
}

interface CredentialInput extends Credential {
  value: string
}

function ConfigureCredentialsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()

  const [serverId, setServerId] = useState('')
  const [mcpServerId, setMcpServerId] = useState('')
  const [toolId, setToolId] = useState('')
  const [credentials, setCredentials] = useState<CredentialInput[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isReady, setIsReady] = useState(false)
  const [hasError, setHasError] = useState(false)

  useEffect(() => {
    const sId = searchParams.get('serverId') || ''
    const mId = searchParams.get('mcpServerId') || ''
    const tId = searchParams.get('toolId') || ''

    setServerId(sId)
    setMcpServerId(mId)
    setToolId(tId)

    const storedData = sessionStorage.getItem('credentials-config-template')
    if (storedData) {
      try {
        const data = JSON.parse(storedData)

        if (data.serverId === sId && data.mcpServerId === mId && data.toolId === tId) {
          const parsed = JSON.parse(data.configTemplate)
          const templateCredentials = parsed.credentials as Credential[]

          if (!Array.isArray(templateCredentials) || templateCredentials.length === 0) {
            toast.error('Credentials not found in configuration template')
            console.error('Credentials not found in configuration template')
            setHasError(true)
          } else {
            const credentialInputs = templateCredentials.map((credential) => ({
              ...credential,
              value: ''
            }))
            setCredentials(credentialInputs)
          }
        } else {
          console.error('Stored data does not match URL parameters')
          toast.error('Configuration data mismatch')
          setHasError(true)
        }
      } catch (error) {
        console.error('Failed to parse stored config template:', error)
        toast.error('Failed to load configuration template')
        setHasError(true)
      }
    } else {
      console.error('Configuration template not found')
      toast.error('Configuration template not found')
      setHasError(true)
    }

    setIsReady(true)
  }, [searchParams])

  const handleCredentialChange = (index: number, value: string) => {
    const nextCredentials = [...credentials]
    nextCredentials[index].value = value
    setCredentials(nextCredentials)
  }

  const handleSave = () => {
    const hasEmpty = credentials.some((credential) => !credential.value.trim())
    if (hasEmpty) {
      toast.error('All credential fields are required')
      return
    }

    setIsSubmitting(true)

    try {
      const authConf = credentials.map((credential) => ({
        key: credential.key,
        dataType: credential.dataType,
        value: credential.value.trim()
      }))

      sessionStorage.setItem(
        'pendingConfig',
        JSON.stringify({
          serverId,
          mcpServerId,
          toolId,
          authConf
        })
      )
      sessionStorage.removeItem('credentials-config-template')

      toast.success('Configuration saved')
      router.push('/dashboard')
    } catch (error) {
      console.error('Failed to save configuration:', error)
      toast.error('Failed to save configuration')
      setIsSubmitting(false)
    }
  }

  const handleCancel = () => {
    sessionStorage.removeItem('credentials-config-template')
    router.push('/dashboard')
  }

  if (!isReady || hasError) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <p className="text-muted-foreground">
            {hasError ? 'Configuration not available' : 'Loading configuration...'}
          </p>
          {hasError ? (
            <Button variant="outline" onClick={handleCancel}>
              Back to Dashboard
            </Button>
          ) : null}
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-screen flex-col">
      <Header title="Configure Credentials" />

      <div className="flex-1 overflow-auto pb-24">
        <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
          <Card>
            <CardHeader>
              <CardTitle>Credentials</CardTitle>
              <CardDescription>
                Enter the required credentials to configure this server
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {credentials.map((credential, index) => (
                <div key={credential.key} className="space-y-2">
                  <Label htmlFor={`credential-${credential.key}`}>
                    {credential.name}
                  </Label>
                  {credential.description ? (
                    <p className="text-sm text-muted-foreground">
                      {credential.description}
                    </p>
                  ) : null}
                  <Input
                    id={`credential-${credential.key}`}
                    value={credential.value}
                    onChange={(e) =>
                      handleCredentialChange(index, e.target.value)
                    }
                    placeholder={`Enter ${credential.name}`}
                  />
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

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

export default function ConfigureCredentialsPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <ConfigureCredentialsContent />
    </Suspense>
  )
}
