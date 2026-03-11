'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/common/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Plus, X } from 'lucide-react';

interface KeyValuePair {
  key: string;
  value: string;
}

function ConfigureStdioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [serverId, setServerId] = useState('');
  const [mcpServerId, setMcpServerId] = useState('');
  const [toolId, setToolId] = useState('');
  const [command, setCommand] = useState('');
  const [args, setArgs] = useState<string[]>([]);
  const [envVars, setEnvVars] = useState<KeyValuePair[]>([{ key: '', value: '' }]);
  const [adminEnvKeys, setAdminEnvKeys] = useState<Set<string>>(new Set());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const sId = searchParams.get('serverId') || '';
    const mId = searchParams.get('mcpServerId') || '';
    const tId = searchParams.get('toolId') || '';

    setServerId(sId);
    setMcpServerId(mId);
    setToolId(tId);

    const storedData = sessionStorage.getItem('stdio-config-template');
    if (storedData) {
      try {
        const data = JSON.parse(storedData);

        if (data.serverId === sId && data.mcpServerId === mId && data.toolId === tId) {
          const parsed = JSON.parse(data.configTemplate);

          if (parsed.command) {
            setCommand(parsed.command);
          }

          if (Array.isArray(parsed.args)) {
            setArgs(parsed.args);
          }

          if (parsed.env && typeof parsed.env === 'object') {
            const adminKeys = new Set<string>(Object.keys(parsed.env));
            setAdminEnvKeys(adminKeys);

            const envArray = Object.entries(parsed.env).map(([key, value]) => ({
              key,
              value: String(value),
            }));
            setEnvVars(
              envArray.length > 0
                ? [...envArray, { key: '', value: '' }]
                : [{ key: '', value: '' }],
            );
          } else {
            setEnvVars([{ key: '', value: '' }]);
          }

          sessionStorage.removeItem('stdio-config-template');
        } else {
          console.error('Stored data does not match URL parameters');
          toast.error('Configuration data mismatch');
        }
      } catch (error) {
        console.error('Failed to parse stored config template:', error);
        toast.error('Failed to load configuration template');
        setEnvVars([{ key: '', value: '' }]);
      }
    } else {
      toast.error('Configuration template not found');
    }
  }, [searchParams]);

  const handleAddEnvVar = () => {
    setEnvVars([...envVars, { key: '', value: '' }]);
  };

  const handleRemoveEnvVar = (index: number) => {
    if (envVars.length > 1) {
      setEnvVars(envVars.filter((_, i) => i !== index));
    }
  };

  const handleEnvVarChange = (index: number, field: 'key' | 'value', value: string) => {
    const newEnvVars = [...envVars];
    newEnvVars[index][field] = value;
    setEnvVars(newEnvVars);
  };

  const handleSave = () => {
    const validEnvVars = envVars.filter((e) => e.key.trim());

    if (validEnvVars.length === 0) {
      toast.error('At least one environment variable is required');
      return;
    }

    setIsSubmitting(true);

    try {
      const stdioEnv = validEnvVars.reduce(
        (acc, env) => ({
          ...acc,
          [env.key.trim()]: env.value.trim(),
        }),
        {} as Record<string, string>,
      );

      sessionStorage.setItem(
        'pendingConfig',
        JSON.stringify({
          serverId,
          mcpServerId,
          toolId,
          stdioEnv,
        }),
      );

      toast.success('Configuration saved');
      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to save configuration:', error);
      toast.error('Failed to save configuration');
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/dashboard');
  };

  if (!command) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading configuration...</p>
      </div>
    );
  }

  return (
    <div className="flex h-screen flex-col">
      <Header title="Configure Stdio Server" />

      <div className="flex-1 overflow-auto pb-24">
        <div className="mx-auto max-w-2xl space-y-6 px-4 py-6">
          {/* Command Display (Read-Only) */}
          <Card>
            <CardHeader>
              <CardTitle>Command</CardTitle>
              <CardDescription>The command to run (set by admin, read-only)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md bg-muted p-3 font-mono text-sm">{command}</div>
            </CardContent>
          </Card>

          {/* Args Display (Read-Only) */}
          {args.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Arguments</CardTitle>
                <CardDescription>Command arguments (set by admin, read-only)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-md bg-muted p-3 font-mono text-sm space-y-1">
                  {args.map((arg, index) => (
                    <div key={index}>{arg}</div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Environment Variables Editor */}
          <Card>
            <CardHeader>
              <CardTitle>Environment Variables</CardTitle>
              <CardDescription>
                Configure environment variables for the server process. Admin defaults are
                pre-filled — your values override on key collision.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {envVars.map((envVar, index) => (
                <div key={index} className="flex gap-2">
                  <div className="flex-1">
                    <Input
                      placeholder="Variable name (e.g. API_KEY)"
                      value={envVar.key}
                      onChange={(e) => handleEnvVarChange(index, 'key', e.target.value)}
                      readOnly={adminEnvKeys.has(envVar.key) && envVar.key !== ''}
                      className={
                        adminEnvKeys.has(envVar.key) && envVar.key !== '' ? 'bg-muted' : ''
                      }
                    />
                  </div>
                  <div className="flex-1">
                    <Input
                      placeholder="Value"
                      value={envVar.value}
                      onChange={(e) => handleEnvVarChange(index, 'value', e.target.value)}
                      type={
                        envVar.key.toUpperCase().match(/(SECRET|TOKEN|PASSWORD|KEY|CREDENTIAL)/)
                          ? 'password'
                          : 'text'
                      }
                    />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveEnvVar(index)}
                    disabled={envVars.length === 1}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={handleAddEnvVar} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Add Environment Variable
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
          <Button className="flex-1" onClick={handleSave} disabled={isSubmitting}>
            {isSubmitting ? 'Saving...' : 'Save Configuration'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default function ConfigureStdioPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-screen items-center justify-center">
          <p className="text-muted-foreground">Loading...</p>
        </div>
      }
    >
      <ConfigureStdioContent />
    </Suspense>
  );
}
