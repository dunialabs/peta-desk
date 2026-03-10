'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useApprovalQueueStore, type ApprovalRequest } from '@/store/approval-queue-store';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Shield,
  Check,
  X,
  Clock,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Zap,
  Timer,
  ArrowRight,
  Search,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useSocket } from '@/contexts/socket-context';

// ─── Urgency helpers ───────────────────────────────────────────────

type UrgencyLevel = 'normal' | 'warning' | 'critical';

function getUrgency(expiresAt: string, now: number): UrgencyLevel {
  const remaining = new Date(expiresAt).getTime() - now;
  if (remaining <= 60_000) return 'critical'; // <1 min
  if (remaining <= 300_000) return 'warning'; // <5 min
  return 'normal';
}

const urgencyBorderColor: Record<UrgencyLevel, string> = {
  normal: 'border-l-gray-300 dark:border-l-gray-600',
  warning: 'border-l-amber-500 dark:border-l-amber-400',
  critical: 'border-l-red-500 dark:border-l-red-400',
};

const urgencyTimerStyle: Record<UrgencyLevel, string> = {
  normal: 'text-gray-600 dark:text-gray-400 bg-gray-100 dark:bg-gray-800/60',
  warning: 'text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-900/30',
  critical: 'text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/30 animate-pulse',
};

// ─── Time formatters ───────────────────────────────────────────────

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);

  if (diffSec < 60) return `${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  return `${diffDay}d ago`;
}

function formatExpiry(expiresAt: string, now: number): string {
  const diffMs = new Date(expiresAt).getTime() - now;

  if (diffMs <= 0) return 'Expired';

  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ${diffSec % 60}s`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}h ${diffMin % 60}m`;
}

/**
 * Summarise redactedArgs into a short inline preview (first 1-2 keys).
 * Returns null when there is nothing meaningful to show.
 */
function getArgsPreview(args: unknown): string | null {
  if (args == null) return null;
  if (typeof args === 'string') {
    return args.length > 80 ? `${args.slice(0, 80)}…` : args;
  }
  if (typeof args === 'object' && !Array.isArray(args)) {
    const entries = Object.entries(args as Record<string, unknown>).slice(0, 2);
    if (entries.length === 0) return null;
    return entries
      .map(([k, v]: [string, unknown]) => {
        const val = typeof v === 'string' ? v : JSON.stringify(v);
        const short = val && val.length > 40 ? `${val.slice(0, 40)}…` : val;
        return `${k}: ${short}`;
      })
      .join(' · ');
  }
  return null;
}

// ─── Shared tick hook ──────────────────────────────────────────────

/** Single interval for the whole drawer — avoids N timers for N cards. */
function useNow(enabled: boolean, intervalMs = 1000): number {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    // Immediately refresh when enabled changes (e.g. drawer opens)
    if (enabled) setNow(Date.now());
    if (!enabled) return;
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [enabled, intervalMs]);
  return now;
}

// ─── Status badge ──────────────────────────────────────────────────

function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'PENDING':
      return (
        <Badge
          variant="outline"
          className="border-yellow-400 text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 text-[10px] px-1.5 py-0"
        >
          <Clock className="h-2.5 w-2.5 mr-0.5" />
          Pending
        </Badge>
      );
    case 'APPROVED':
      return (
        <Badge
          variant="outline"
          className="border-green-400 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 text-[10px] px-1.5 py-0"
        >
          <Check className="h-2.5 w-2.5 mr-0.5" />
          Approved
        </Badge>
      );
    case 'REJECTED':
      return (
        <Badge
          variant="outline"
          className="border-red-400 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 text-[10px] px-1.5 py-0"
        >
          <X className="h-2.5 w-2.5 mr-0.5" />
          Rejected
        </Badge>
      );
    case 'EXPIRED':
      return (
        <Badge
          variant="outline"
          className="border-gray-400 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20 text-[10px] px-1.5 py-0"
        >
          <Timer className="h-2.5 w-2.5 mr-0.5" />
          Expired
        </Badge>
      );
    case 'EXECUTED':
      return (
        <Badge
          variant="outline"
          className="border-blue-400 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 text-[10px] px-1.5 py-0"
        >
          <Zap className="h-2.5 w-2.5 mr-0.5" />
          Executed
        </Badge>
      );
    case 'FAILED':
      return (
        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
          <XCircle className="h-2.5 w-2.5 mr-0.5" />
          Failed
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {status}
        </Badge>
      );
  }
}

// ─── Single approval item ──────────────────────────────────────────

function ApprovalItem({
  request,
  onApprove,
  onReject,
  isDeciding = false,
  now,
}: {
  request: ApprovalRequest;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isDeciding?: boolean;
  now: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const isExpired = new Date(request.expiresAt).getTime() <= now;
  const isPending = request.status === 'PENDING' && !isExpired;
  const displayStatus = isExpired && request.status === 'PENDING' ? 'EXPIRED' : request.status;
  const canAct = isPending && !isDeciding;
  const urgency = isPending ? getUrgency(request.expiresAt, now) : 'normal';
  const argsPreview = getArgsPreview(request.redactedArgs);

  return (
    <div
      className={cn(
        'border rounded-lg transition-colors overflow-hidden',
        isPending
          ? cn(
              'border-l-[3px]',
              urgencyBorderColor[urgency],
              'border-yellow-200 dark:border-yellow-800 bg-white dark:bg-gray-900/60',
            )
          : 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50',
      )}
    >
      {/* Clickable header — whole area toggles expand */}
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        className="w-full text-left p-3 pb-2 hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors"
        aria-expanded={expanded}
        aria-label={`${request.toolName} details`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            {/* Tool name — prominent */}
            <div className="flex items-center gap-2 mb-1">
              <span className="font-semibold text-[13px] text-gray-900 dark:text-gray-100 truncate">
                {request.toolName}
              </span>
              <StatusBadge status={displayStatus} />
            </div>
            {/* Metadata row */}
            <div className="flex items-center gap-2 text-[11px] text-gray-500 dark:text-gray-400">
              {request.serverId && (
                <span className="truncate max-w-[100px]" title={request.serverId}>
                  {request.serverId}
                </span>
              )}
              <span>·</span>
              <span>{formatRelativeTime(request.createdAt)}</span>
            </div>
          </div>

          {/* Urgency timer badge for pending */}
          {isPending && (
            <span
              className={cn(
                'flex-shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap',
                urgencyTimerStyle[urgency],
              )}
            >
              <Clock className="h-3 w-3 inline mr-0.5 -mt-px" />
              {formatExpiry(request.expiresAt, now)}
            </span>
          )}

          {/* Expand chevron */}
          <span className="flex-shrink-0 p-0.5 text-gray-400">
            {expanded ? (
              <ChevronDown className="h-3.5 w-3.5" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5" />
            )}
          </span>
        </div>

        {/* Inline args preview (collapsed view) */}
        {!expanded && argsPreview && (
          <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-1.5 truncate font-mono">
            {argsPreview}
          </p>
        )}

        {/* Reason */}
        {request.reason && (
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1 truncate italic">
            {request.reason}
          </p>
        )}
      </button>

      {/* Expanded content */}
      {expanded && (
        <div className="px-3 pb-3 space-y-2">
          {/* Full args */}
          {request.redactedArgs != null && (
            <div className="bg-gray-100 dark:bg-gray-800 rounded-md p-2 overflow-auto max-h-40">
              <pre className="text-[11px] text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words font-mono leading-relaxed">
                {typeof request.redactedArgs === 'string'
                  ? request.redactedArgs
                  : JSON.stringify(request.redactedArgs, null, 2)}
              </pre>
            </div>
          )}

          {/* Execution result preview */}
          {request.executionResultPreview && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-md p-2 overflow-auto max-h-32">
              <p className="text-[10px] font-medium text-blue-600 dark:text-blue-400 mb-1">
                Execution preview
              </p>
              <pre className="text-[11px] text-blue-900 dark:text-blue-100 whitespace-pre-wrap break-words font-mono">
                {request.executionResultPreview}
              </pre>
            </div>
          )}

          {/* Error */}
          {displayStatus === 'FAILED' && request.executionError && (
            <p className="text-[11px] text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 rounded-md px-2 py-1.5">
              {request.executionError}
            </p>
          )}

          {(displayStatus === 'EXECUTED' || displayStatus === 'FAILED') &&
            request.executionResultAvailable && (
              <p className="text-[11px] text-blue-600 dark:text-blue-400">
                Result available. Retry the same tool call with this resume token.
              </p>
            )}

          {/* Resume token */}
          <div className="text-[10px] text-gray-400 dark:text-gray-500 font-mono break-all select-all">
            Token: {request.resumeToken || request.id}
          </div>
        </div>
      )}

      {/* Action buttons for pending items */}
      {isPending && (
        <div className="flex gap-2 px-3 pb-3">
          <Button
            size="sm"
            disabled={!canAct}
            className={cn(
              'flex-1 h-9 text-xs font-medium',
              'bg-green-600 hover:bg-green-700 text-white dark:bg-green-600 dark:hover:bg-green-700',
              isDeciding && 'opacity-50 cursor-not-allowed',
            )}
            onClick={(e) => {
              e.stopPropagation();
              onApprove(request.id);
            }}
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
            {isDeciding ? 'Sending…' : 'Approve'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!canAct}
            className={cn(
              'flex-1 h-9 text-xs font-medium border-red-300 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20',
              isDeciding && 'opacity-50 cursor-not-allowed',
            )}
            onClick={(e) => {
              e.stopPropagation();
              onReject(request.id);
            }}
          >
            <XCircle className="h-3.5 w-3.5 mr-1.5" />
            {isDeciding ? 'Sending…' : 'Reject'}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Empty state ───────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center py-10 px-6 text-center animate-in fade-in-0 duration-500">
      {/* Shield icon with subtle ring */}
      <div className="relative mb-4">
        <div className="absolute inset-0 rounded-full bg-gray-100 dark:bg-gray-800 scale-150" />
        <ShieldCheck className="relative h-10 w-10 text-gray-300 dark:text-gray-600" />
      </div>

      <p className="text-sm font-medium text-gray-600 dark:text-gray-300 mb-1">
        No approval requests
      </p>
      <p className="text-xs text-gray-400 dark:text-gray-500 mb-6 max-w-[260px]">
        When AI agents request to use tools that require human review, you&apos;ll manage them here.
      </p>

      {/* How-it-works micro-explainer */}
      <div className="w-full max-w-[260px] space-y-2.5">
        {[
          { step: '1', label: 'Agent requests a tool', icon: Search },
          { step: '2', label: 'You review the details', icon: Shield },
          { step: '3', label: 'Approve or reject', icon: CheckCircle2 },
        ].map(({ step, label, icon: Icon }) => (
          <div
            key={step}
            className="flex items-center gap-3 text-left bg-gray-50 dark:bg-gray-800/60 rounded-lg px-3 py-2"
          >
            <div className="flex-shrink-0 w-5 h-5 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center">
              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400">
                {step}
              </span>
            </div>
            <span className="text-[11px] text-gray-600 dark:text-gray-400 flex-1">{label}</span>
            <Icon className="h-3.5 w-3.5 text-gray-300 dark:text-gray-600 flex-shrink-0" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Trigger button ────────────────────────────────────────────────

export function ApprovalQueueTrigger() {
  const requests = useApprovalQueueStore((s) => s.requests);
  const setDrawerOpen = useApprovalQueueStore((s) => s.setDrawerOpen);

  // Expiry-aware pending count (matches drawer logic)
  const pendingCount = useMemo(() => {
    const ts = Date.now();
    return requests.filter(
      (r) => r.status === 'PENDING' && new Date(r.expiresAt).getTime() > ts,
    ).length;
  }, [requests]);

  return (
    <button
      type="button"
      onClick={() => setDrawerOpen(true)}
      className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      aria-label={`Approval queue${pendingCount > 0 ? `, ${pendingCount} pending` : ''}`}
    >
      <Shield className="h-5 w-5 text-gray-600 dark:text-gray-400" />
      {pendingCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white animate-in zoom-in-50 duration-200">
          {pendingCount > 99 ? '99+' : pendingCount}
        </span>
      )}
    </button>
  );
}

// ─── Main drawer ───────────────────────────────────────────────────

export function ApprovalQueueDrawer() {
  const requests = useApprovalQueueStore((s) => s.requests);
  const isDrawerOpen = useApprovalQueueStore((s) => s.isDrawerOpen);
  const setDrawerOpen = useApprovalQueueStore((s) => s.setDrawerOpen);
  const { sendMessage } = useSocket();
  const [showHistory, setShowHistory] = useState(false);
  const [decidingIds, setDecidingIds] = useState<Set<string>>(new Set());

  // Shared timer — one interval drives all countdown displays
  const hasPending = requests.some((r) => r.status === 'PENDING');
  const now = useNow(hasPending && isDrawerOpen);

  // Derive pending/history with local expiry detection, sorted by nearest expiry
  const pendingRequests = useMemo(() => {
    return requests
      .filter((r) => r.status === 'PENDING' && new Date(r.expiresAt).getTime() > now)
      .sort((a, b) => new Date(a.expiresAt).getTime() - new Date(b.expiresAt).getTime());
  }, [requests, now]);

  const historyRequests = useMemo(() => {
    return requests.filter(
      (r) => r.status !== 'PENDING' || new Date(r.expiresAt).getTime() <= now,
    );
  }, [requests, now]);

  // Auto-open history when no pending but history exists
  useEffect(() => {
    if (pendingRequests.length === 0 && historyRequests.length > 0) {
      setShowHistory(true);
    }
  }, [pendingRequests.length, historyRequests.length]);

  const handleApprove = useCallback(
    (id: string) => {
      const request = useApprovalQueueStore.getState().requests.find((r) => r.id === id);
      if (!request) return;

      setDecidingIds((prev) => new Set(prev).add(id));

      const sent = sendMessage(request.coreConnectionId, 'approval_decide', {
        id: request.id,
        decision: 'APPROVED',
      });

      if (sent) {
        toast.success(`Approved: ${request.toolName}`);
      } else {
        toast.error('Failed to send approval — server may be disconnected');
        setDecidingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [sendMessage],
  );

  const handleReject = useCallback(
    (id: string) => {
      const request = useApprovalQueueStore.getState().requests.find((r) => r.id === id);
      if (!request) return;

      setDecidingIds((prev) => new Set(prev).add(id));

      const sent = sendMessage(request.coreConnectionId, 'approval_decide', {
        id: request.id,
        decision: 'REJECTED',
      });

      if (sent) {
        toast.success(`Rejected: ${request.toolName}`);
      } else {
        toast.error('Failed to send rejection — server may be disconnected');
        setDecidingIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    },
    [sendMessage],
  );

  // Clear decidingIds when requests change status (server responded)
  useEffect(() => {
    setDecidingIds((prev) => {
      if (prev.size === 0) return prev;
      const next = new Set(prev);
      for (const id of prev) {
        const req = requests.find((r) => r.id === id);
        if (!req || req.status !== 'PENDING') {
          next.delete(id);
        }
      }
      return next.size === prev.size ? prev : next;
    });
  }, [requests]);

  // Auto-remove expired items after 30 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const store = useApprovalQueueStore.getState();
      const ts = Date.now();
      store.requests.forEach((r) => {
        if (r.status === 'EXPIRED') {
          const expiredAt = new Date(r.expiresAt).getTime();
          if (ts - expiredAt > 30000) {
            store.removeRequest(r.id);
          }
        }
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const handleClearHistory = useCallback(() => {
    const store = useApprovalQueueStore.getState();
    const ts = Date.now();
    // Remove non-pending items AND locally-expired PENDING items
    store.requests.forEach((r) => {
      if (r.status !== 'PENDING' || new Date(r.expiresAt).getTime() <= ts) {
        store.removeRequest(r.id);
      }
    });
    toast.success('History cleared');
  }, []);

  return (
    <Sheet open={isDrawerOpen} onOpenChange={setDrawerOpen}>
      <SheetContent side="right" className="w-[380px] sm:w-[420px] flex flex-col p-0">
        {/* Header */}
        <SheetHeader className="pl-4 pr-14 pt-4 pb-3 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            <SheetTitle className="text-base">Approval Queue</SheetTitle>
            {pendingRequests.length > 0 && (
              <Badge variant="destructive" className="ml-auto text-[10px] px-2 py-0.5">
                {pendingRequests.length} pending
              </Badge>
            )}
          </div>
          <SheetDescription className="text-xs">
            Review and manage tool approval requests
          </SheetDescription>
        </SheetHeader>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {/* Pending requests — sorted by nearest expiry */}
          {pendingRequests.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
                <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                  Pending Approvals
                </h3>
                <span className="text-[10px] text-gray-400 dark:text-gray-500">
                  — nearest expiry first
                </span>
              </div>
              {pendingRequests.map((request) => (
                <ApprovalItem
                  key={request.id}
                  request={request}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  isDeciding={decidingIds.has(request.id)}
                  now={now}
                />
              ))}
            </div>
          )}

          {/* Empty state — no pending AND no history */}
          {pendingRequests.length === 0 && historyRequests.length === 0 && <EmptyState />}

          {/* History section — auto-opens when no pending */}
          {historyRequests.length > 0 && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 w-full text-left group"
                aria-expanded={showHistory}
                aria-label="Toggle history"
              >
                {showHistory ? (
                  <ChevronDown className="h-3.5 w-3.5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
                )}
                <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  History
                </h3>
                <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                  {historyRequests.length}
                </Badge>
              </button>
              {showHistory &&
                historyRequests.map((request) => (
                  <ApprovalItem
                    key={request.id}
                    request={request}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    isDeciding={decidingIds.has(request.id)}
                    now={now}
                  />
                ))}
            </div>
          )}
        </div>

        {/* Footer — Clear History only (never removes pending items) */}
        {historyRequests.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2.5">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-gray-400 hover:text-red-600 dark:hover:text-red-400 gap-1.5"
              onClick={handleClearHistory}
            >
              <Trash2 className="h-3 w-3" />
              Clear History
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
