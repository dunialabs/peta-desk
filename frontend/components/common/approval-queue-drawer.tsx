'use client';

import { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { toast } from 'sonner';
import { useSocket } from '@/contexts/socket-context';

/**
 * Format a relative time string from a date
 */
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

/**
 * Format expiry countdown
 */
function formatExpiry(expiresAt: string): string {
  const expiry = new Date(expiresAt);
  const now = new Date();
  const diffMs = expiry.getTime() - now.getTime();

  if (diffMs <= 0) return 'Expired';

  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 60) return `${diffSec}s left`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m left`;
  const diffHr = Math.floor(diffMin / 60);
  return `${diffHr}h ${diffMin % 60}m left`;
}

/**
 * Status badge component
 */
function StatusBadge({ status }: { status: string }) {
  switch (status) {
    case 'PENDING':
      return (
        <Badge
          variant="outline"
          className="border-yellow-400 text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20"
        >
          <Clock className="h-3 w-3 mr-1" />
          Pending
        </Badge>
      );
    case 'APPROVED':
      return (
        <Badge
          variant="outline"
          className="border-green-400 text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20"
        >
          <Check className="h-3 w-3 mr-1" />
          Approved
        </Badge>
      );
    case 'REJECTED':
      return (
        <Badge
          variant="outline"
          className="border-red-400 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20"
        >
          <X className="h-3 w-3 mr-1" />
          Rejected
        </Badge>
      );
    case 'EXPIRED':
      return (
        <Badge
          variant="outline"
          className="border-gray-400 text-gray-500 dark:text-gray-400 bg-gray-50 dark:bg-gray-900/20"
        >
          <Timer className="h-3 w-3 mr-1" />
          Expired
        </Badge>
      );
    case 'EXECUTED':
      return (
        <Badge
          variant="outline"
          className="border-blue-400 text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
        >
          <Zap className="h-3 w-3 mr-1" />
          Executed
        </Badge>
      );
    case 'FAILED':
      return (
        <Badge variant="destructive">
          <XCircle className="h-3 w-3 mr-1" />
          Failed
        </Badge>
      );
    default:
      return <Badge variant="secondary">{status}</Badge>;
  }
}

/**
 * Single approval request item
 */
function ApprovalItem({
  request,
  onApprove,
  onReject,
  isDeciding = false,
}: {
  request: ApprovalRequest;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  isDeciding?: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const [expiryText, setExpiryText] = useState(() => formatExpiry(request.expiresAt));
  const isExpired = new Date(request.expiresAt).getTime() < Date.now();
  const isPending = request.status === 'PENDING' && !isExpired;
  const displayStatus = isExpired && request.status === 'PENDING' ? 'EXPIRED' : request.status;
  const canAct = isPending && !isDeciding;

  // Update expiry countdown every second for pending items
  useEffect(() => {
    if (!isPending) return;

    const interval = setInterval(() => {
      setExpiryText(formatExpiry(request.expiresAt));
    }, 1000);

    return () => clearInterval(interval);
  }, [isPending, request.expiresAt]);

  return (
    <div
      className={cn(
        'border rounded-lg p-3 space-y-2 transition-colors',
        isPending
          ? 'border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-900/10'
          : 'border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50',
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm text-gray-900 dark:text-gray-100 truncate">
              {request.toolName}
            </span>
            <StatusBadge status={displayStatus} />
          </div>
          <div className="flex items-center gap-3 text-xs text-gray-500 dark:text-gray-400">
            {request.serverId && (
              <span className="truncate max-w-[120px]" title={request.serverId}>
                {request.serverId}
              </span>
            )}
            <span>{formatRelativeTime(request.createdAt)}</span>
            {isPending && (
              <span className="text-yellow-600 dark:text-yellow-400 font-medium">{expiryText}</span>
            )}
          </div>
          {request.reason && (
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 truncate">
              {request.reason}
            </p>
          )}
          {displayStatus === 'FAILED' && request.executionError && (
            <p className="text-xs text-red-600 dark:text-red-400 mt-1 truncate">
              {request.executionError}
            </p>
          )}
          {(displayStatus === 'EXECUTED' || displayStatus === 'FAILED') &&
            request.executionResultAvailable && (
              <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                Result available. Retry the same tool call with this resume token.
              </p>
            )}
        </div>

        {/* Expand toggle */}
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors flex-shrink-0"
          aria-label={expanded ? 'Collapse details' : 'Expand details'}
        >
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-gray-500" />
          ) : (
            <ChevronRight className="h-4 w-4 text-gray-500" />
          )}
        </button>
      </div>

      {/* Expanded args */}
      {expanded && request.redactedArgs != null && (
        <div className="bg-gray-100 dark:bg-gray-800 rounded p-2 overflow-auto max-h-40">
          <pre className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-wrap break-words font-mono">
            {typeof request.redactedArgs === 'string'
              ? request.redactedArgs
              : JSON.stringify(request.redactedArgs, null, 2)}
          </pre>
        </div>
      )}

      {expanded && request.executionResultPreview && (
        <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-2 overflow-auto max-h-32">
          <p className="text-[11px] text-blue-700 dark:text-blue-300 mb-1">Execution preview</p>
          <pre className="text-xs text-blue-900 dark:text-blue-100 whitespace-pre-wrap break-words font-mono">
            {request.executionResultPreview}
          </pre>
        </div>
      )}

      {expanded && (
        <div className="text-[11px] text-gray-500 dark:text-gray-400 font-mono break-all">
          Resume token: {request.resumeToken || request.id}
        </div>
      )}

      {/* Action buttons for pending items */}
      {isPending && (
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            disabled={!canAct}
            className={cn(
              'flex-1 h-8 text-xs border-green-300 text-green-700 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20',
              isDeciding && 'opacity-50 cursor-not-allowed',
            )}
            onClick={() => onApprove(request.id)}
          >
            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
            {isDeciding ? 'Sending…' : 'Approve'}
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={!canAct}
            className={cn(
              'flex-1 h-8 text-xs border-red-300 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20',
              isDeciding && 'opacity-50 cursor-not-allowed',
            )}
            onClick={() => onReject(request.id)}
          >
            <XCircle className="h-3.5 w-3.5 mr-1" />
            {isDeciding ? 'Sending…' : 'Reject'}
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Approval queue trigger button with pending count badge
 */
export function ApprovalQueueTrigger() {
  const pendingCount = useApprovalQueueStore((s) => s.pendingCount());
  const setDrawerOpen = useApprovalQueueStore((s) => s.setDrawerOpen);

  return (
    <button
      type="button"
      onClick={() => setDrawerOpen(true)}
      className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
      aria-label="Approval queue"
    >
      <Shield className="h-5 w-5 text-gray-600 dark:text-gray-400" />
      {pendingCount > 0 && (
        <span className="absolute -top-0.5 -right-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
          {pendingCount > 99 ? '99+' : pendingCount}
        </span>
      )}
    </button>
  );
}

/**
 * Approval queue drawer component
 */
export function ApprovalQueueDrawer() {
  const requests = useApprovalQueueStore((s) => s.requests);
  const isDrawerOpen = useApprovalQueueStore((s) => s.isDrawerOpen);
  const setDrawerOpen = useApprovalQueueStore((s) => s.setDrawerOpen);
  const { sendMessage } = useSocket();
  const [showHistory, setShowHistory] = useState(false);
  const [decidingIds, setDecidingIds] = useState<Set<string>>(new Set());

  const pendingRequests = requests.filter((r) => r.status === 'PENDING');
  const historyRequests = requests.filter((r) => r.status !== 'PENDING');

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
      const now = Date.now();
      store.requests.forEach((r) => {
        if (r.status === 'EXPIRED') {
          const expiredAt = new Date(r.expiresAt).getTime();
          if (now - expiredAt > 30000) {
            store.removeRequest(r.id);
          }
        }
      });
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <Sheet open={isDrawerOpen} onOpenChange={setDrawerOpen}>
      <SheetContent side="right" className="w-[380px] sm:w-[420px] flex flex-col p-0">
        <SheetHeader className="px-4 pt-4 pb-2 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-gray-700 dark:text-gray-300" />
            <SheetTitle className="text-base">Approval Queue</SheetTitle>
            {pendingRequests.length > 0 && (
              <Badge variant="destructive" className="ml-auto text-xs">
                {pendingRequests.length} pending
              </Badge>
            )}
          </div>
          <SheetDescription className="text-xs">
            Review and manage tool approval requests
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
          {/* Pending requests */}
          {pendingRequests.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-yellow-500" />
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Pending Approvals
                </h3>
              </div>
              {pendingRequests.map((request) => (
                <ApprovalItem
                  key={request.id}
                  request={request}
                  onApprove={handleApprove}
                  onReject={handleReject}
                  isDeciding={decidingIds.has(request.id)}
                />
              ))}
            </div>
          )}

          {/* Empty state */}
          {pendingRequests.length === 0 && historyRequests.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Shield className="h-10 w-10 text-gray-300 dark:text-gray-600 mb-3" />
              <p className="text-sm text-gray-500 dark:text-gray-400">No approval requests</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Requests will appear here when tools require approval
              </p>
            </div>
          )}

          {/* History section */}
          {historyRequests.length > 0 && (
            <div className="space-y-2">
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 w-full text-left"
              >
                {showHistory ? (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                )}
                <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">
                  History ({historyRequests.length})
                </h3>
              </button>
              {showHistory &&
                historyRequests.map((request) => (
                  <ApprovalItem
                    key={request.id}
                    request={request}
                    onApprove={handleApprove}
                    onReject={handleReject}
                    isDeciding={decidingIds.has(request.id)}
                  />
                ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {requests.length > 0 && (
          <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-3">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-gray-500"
              onClick={() => {
                useApprovalQueueStore.getState().clearAll();
                toast.success('Approval queue cleared');
              }}
            >
              Clear All
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
