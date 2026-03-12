'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Header from '@/components/common/header';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { claimSessionStorageItem, clearClaimedSessionStorageItem } from '@/lib/session-storage';
import { toast } from 'sonner';
import { Plus, X, Eye, EyeOff, AlertCircle } from 'lucide-react';

interface EnvRow {
  id: string;
  key: string;
  value: string;
}

/**
 * Token-boundary matching for sensitive env var names.
 * Matches keys like API_KEY, CLIENT_SECRET, etc. without false positives on generic "KEY".
 */
const isSensitiveEnvKey = (key: string): boolean =>
  /(^|_)(SECRET|TOKEN|PASSWORD|CREDENTIALS?|API_KEY|PRIVATE_KEY|ACCESS_KEY|CLIENT_SECRET)(_|$)/i.test(
    key,
  );

function ConfigureStdioContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const rowIdCounter = useRef(0);
  const initializedTemplateKey = useRef<string | null>(null);

  const serverIdParam = searchParams.get('serverId') || '';
  const mcpServerIdParam = searchParams.get('mcpServerId') || '';
  const toolIdParam = searchParams.get('toolId') || '';
  const stdioTemplateStorageKey = 'stdio-config-template';

  const nextRowId = () => `row-${++rowIdCounter.current}`;

  const [serverId, setServerId] = useState('');
  const [mcpServerId, setMcpServerId] = useState('');
  const [toolId, setToolId] = useState('');
  const [command, setCommand] = useState('');
  const [args, setArgs] = useState<string[]>([]);

  const [adminEnvVars, setAdminEnvVars] = useState<Record<string, string>>({});
  const [overrides, setOverrides] = useState<EnvRow[]>(() => [
    { id: 'row-init', key: '', value: '' },
  ]);

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [revealedKeys, setRevealedKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!serverIdParam && !mcpServerIdParam && !toolIdParam) {
      return;
    }

    if (!serverIdParam || !mcpServerIdParam || !toolIdParam) {
      setLoadError(
        'Missing configuration identifiers. Please try connecting again from the dashboard.',
      );
      setIsLoading(false);
      return;
    }

    const currentTemplateKey = `${serverIdParam}:${mcpServerIdParam}:${toolIdParam}`;
    if (initializedTemplateKey.current === currentTemplateKey) {
      return;
    }
    initializedTemplateKey.current = currentTemplateKey;

    setServerId(serverIdParam);
    setMcpServerId(mcpServerIdParam);
    setToolId(toolIdParam);
    setLoadError(null);
    setIsLoading(true);

    const storedData = claimSessionStorageItem(stdioTemplateStorageKey);
    console.log('storedData', storedData);
    if (!storedData) {
      setLoadError(
        'Configuration template not found. Please try connecting again from the dashboard.',
      );
      setIsLoading(false);
      return;
    }

    try {
      const data = JSON.parse(storedData);

      if (
        data.serverId !== serverIdParam ||
        data.mcpServerId !== mcpServerIdParam ||
        data.toolId !== toolIdParam
      ) {
        setLoadError(
          'Configuration data mismatch. Please try connecting again from the dashboard.',
        );
        setIsLoading(false);
        return;
      }

      const parsed = JSON.parse(data.configTemplate);

      if (parsed.command) setCommand(parsed.command);
      if (Array.isArray(parsed.args)) setArgs(parsed.args);

      if (parsed.env && typeof parsed.env === 'object') {
        setAdminEnvVars(parsed.env);
      }

      setOverrides([{ id: nextRowId(), key: '', value: '' }]);

      setIsLoading(false);
    } catch (error) {
      console.error('Failed to parse config template:', error);
      setLoadError(
        'Failed to load configuration template. Please try connecting again from the dashboard.',
      );
      setIsLoading(false);
    }
  }, [serverIdParam, mcpServerIdParam, toolIdParam]);

  const handleAddOverride = () => {
    setOverrides((prev) => [...prev, { id: nextRowId(), key: '', value: '' }]);
  };

  const handleRemoveOverride = (index: number) => {
    if (overrides.length > 1) {
      setOverrides((prev) => prev.filter((_, i) => i !== index));
    }
  };

  const handleOverrideChange = (index: number, field: 'key' | 'value', value: string) => {
    setOverrides((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const toggleReveal = (rowId: string) => {
    setRevealedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(rowId)) {
        next.delete(rowId);
      } else {
        next.add(rowId);
      }
      return next;
    });
  };

  const handleSave = () => {
    const validOverrides = overrides.filter((e) => e.key.trim());

    const seenKeys = new Set<string>();
    for (const row of validOverrides) {
      const k = row.key.trim();
      if (seenKeys.has(k)) {
        toast.error(`Duplicate setting name: ${k}`);
        return;
      }
      seenKeys.add(k);
    }

    setIsSubmitting(true);

    try {
      const stdioEnv = validOverrides.reduce(
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
      clearClaimedSessionStorageItem(stdioTemplateStorageKey);

      // No success toast here — let the dashboard own the final message
      // after core actually applies the configuration
      router.push('/dashboard');
    } catch (error) {
      console.error('Failed to save configuration:', error);
      toast.error('Failed to save configuration');
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    clearClaimedSessionStorageItem(stdioTemplateStorageKey);
    router.push('/dashboard');
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <p className="text-muted-foreground">Loading configuration...</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4 px-4">
        <AlertCircle className="h-12 w-12 text-destructive" />
        <p className="max-w-sm text-center text-sm text-muted-foreground">{loadError}</p>
        <Button variant="outline" onClick={handleCancel}>
          Back to Dashboard
        </Button>
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
              <CardDescription>The command to run (set by administrator)</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto whitespace-pre-wrap break-all rounded-md bg-muted p-3 font-mono text-sm">
                {command}
              </div>
            </CardContent>
          </Card>

          {/* Args Display (Read-Only) */}
          {args.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Arguments</CardTitle>
                <CardDescription>Command arguments (set by administrator)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto whitespace-pre-wrap break-all rounded-md bg-muted p-3 font-mono text-sm space-y-1">
                  {args.map((arg, index) => (
                    <div key={index}>{arg}</div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Admin Defaults (Read-Only) */}
          {Object.keys(adminEnvVars).length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Default Settings</CardTitle>
                <CardDescription>
                  Pre-configured by your administrator. These will be applied automatically.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {Object.entries(adminEnvVars).map(([key, value]) => (
                  <div key={key} className="flex flex-col gap-2 sm:flex-row">
                    <div className="flex-1">
                      <Label className="sr-only">Variable name</Label>
                      <div className="rounded-md bg-muted px-3 py-2 font-mono text-sm">{key}</div>
                    </div>
                    <div className="flex-1">
                      <Label className="sr-only">Value for {key}</Label>
                      <div className="rounded-md bg-muted px-3 py-2 font-mono text-sm">
                        {isSensitiveEnvKey(key) ? '••••••••' : String(value)}
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* User Overrides (Editable) */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Settings</CardTitle>
              <CardDescription>
                Add your own settings or override administrator defaults.
                {Object.keys(adminEnvVars).length > 0 &&
                  ' Use the same name as a default setting above to override its value.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {overrides.map((row, index) => (
                <div key={row.id} className="flex flex-col gap-2 sm:flex-row">
                  <div className="flex-1">
                    <Label htmlFor={`key-${row.id}`} className="sr-only">
                      Setting name
                    </Label>
                    <Input
                      id={`key-${row.id}`}
                      placeholder="Setting name (e.g. API_KEY)"
                      value={row.key}
                      onChange={(e) => handleOverrideChange(index, 'key', e.target.value)}
                    />
                  </div>
                  <div className="relative flex-1">
                    <Label htmlFor={`val-${row.id}`} className="sr-only">
                      Value for {row.key || 'setting'}
                    </Label>
                    <Input
                      id={`val-${row.id}`}
                      placeholder="Value"
                      value={row.value}
                      onChange={(e) => handleOverrideChange(index, 'value', e.target.value)}
                      type={
                        isSensitiveEnvKey(row.key) && !revealedKeys.has(row.id)
                          ? 'password'
                          : 'text'
                      }
                      className={isSensitiveEnvKey(row.key) ? 'pr-10' : ''}
                    />
                    {isSensitiveEnvKey(row.key) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="absolute right-0 top-0 h-full px-3"
                        onClick={() => toggleReveal(row.id)}
                        aria-label={
                          revealedKeys.has(row.id)
                            ? `Hide value for ${row.key}`
                            : `Show value for ${row.key}`
                        }
                      >
                        {revealedKeys.has(row.id) ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveOverride(index)}
                    disabled={overrides.length === 1}
                    aria-label={row.key ? `Remove ${row.key}` : `Remove row ${index + 1}`}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              <Button variant="outline" size="sm" onClick={handleAddOverride} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Add Setting
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
            {isSubmitting ? 'Saving...' : 'Save & Connect'}
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
