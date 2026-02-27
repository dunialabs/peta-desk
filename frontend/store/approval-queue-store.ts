import { create } from 'zustand'

/**
 * Approval request from peta-core
 */
export interface ApprovalRequest {
  id: string
  toolName: string
  serverId: string | null
  redactedArgs: unknown
  expiresAt: string
  createdAt: string
  status: string
  uniformRequestId?: string | null
  policyVersion: number
  matchedRuleId: string | null
  reason: string | null
  coreConnectionId: string
}

/**
 * Approval queue state
 */
interface ApprovalQueueState {
  requests: ApprovalRequest[]
  isDrawerOpen: boolean

  // Actions
  addRequest: (request: ApprovalRequest) => void
  removeRequest: (id: string) => void
  updateRequest: (id: string, updates: Partial<ApprovalRequest>) => void
  markDecided: (id: string, decision: string) => void
  markExpired: (id: string) => void
  markExecuted: (id: string) => void
  markFailed: (id: string) => void
  setDrawerOpen: (open: boolean) => void
  clearAll: () => void
  pendingCount: () => number
}

/**
 * Approval queue global state
 */
export const useApprovalQueueStore = create<ApprovalQueueState>((set, get) => ({
  requests: [],
  isDrawerOpen: false,

  addRequest: (request) => {
    set((state) => {
      const existingIdx = state.requests.findIndex((r) => r.id === request.id)
      if (existingIdx >= 0) {
        // Merge: keep terminal status if placeholder was already decided
        const existing = state.requests[existingIdx]
        const merged = existing.status !== 'PENDING'
          ? { ...request, status: existing.status }
          : request
        const updated = [...state.requests]
        updated[existingIdx] = merged
        return { requests: updated }
      }
      return { requests: [request, ...state.requests] }
    })
  },

  removeRequest: (id) => {
    set((state) => ({
      requests: state.requests.filter((r) => r.id !== id)
    }))
  },

  updateRequest: (id, updates) => {
    set((state) => ({
      requests: state.requests.map((r) =>
        r.id === id ? { ...r, ...updates } : r
      )
    }))
  },

  markDecided: (id, decision) => {
    set((state) => {
      const exists = state.requests.some((r) => r.id === id)
      if (exists) {
        return {
          requests: state.requests.map((r) =>
            r.id === id ? { ...r, status: decision } : r
          )
        }
      }
      return {
        requests: [
          { id, status: decision, toolName: 'Unknown', serverId: null, redactedArgs: null, expiresAt: new Date().toISOString(), createdAt: new Date().toISOString(), policyVersion: 0, matchedRuleId: null, reason: null, coreConnectionId: '' },
          ...state.requests
        ]
      }
    })
  },

  markExpired: (id) => {
    set((state) => {
      const exists = state.requests.some((r) => r.id === id)
      if (exists) {
        return {
          requests: state.requests.map((r) =>
            r.id === id ? { ...r, status: 'EXPIRED' } : r
          )
        }
      }
      return {
        requests: [
          { id, status: 'EXPIRED', toolName: 'Unknown', serverId: null, redactedArgs: null, expiresAt: new Date().toISOString(), createdAt: new Date().toISOString(), policyVersion: 0, matchedRuleId: null, reason: null, coreConnectionId: '' },
          ...state.requests
        ]
      }
    })
  },

  markExecuted: (id) => {
    set((state) => {
      const exists = state.requests.some((r) => r.id === id)
      if (exists) {
        return {
          requests: state.requests.map((r) =>
            r.id === id ? { ...r, status: 'EXECUTED' } : r
          )
        }
      }
      return {
        requests: [
          { id, status: 'EXECUTED', toolName: 'Unknown', serverId: null, redactedArgs: null, expiresAt: new Date().toISOString(), createdAt: new Date().toISOString(), policyVersion: 0, matchedRuleId: null, reason: null, coreConnectionId: '' },
          ...state.requests
        ]
      }
    })
  },

  markFailed: (id) => {
    set((state) => {
      const exists = state.requests.some((r) => r.id === id)
      if (exists) {
        return {
          requests: state.requests.map((r) =>
            r.id === id ? { ...r, status: 'FAILED' } : r
          )
        }
      }
      return {
        requests: [
          { id, status: 'FAILED', toolName: 'Unknown', serverId: null, redactedArgs: null, expiresAt: new Date().toISOString(), createdAt: new Date().toISOString(), policyVersion: 0, matchedRuleId: null, reason: null, coreConnectionId: '' },
          ...state.requests
        ]
      }
    })
  },

  setDrawerOpen: (open) => {
    set({ isDrawerOpen: open })
  },

  clearAll: () => {
    set({ requests: [] })
  },

  pendingCount: () => {
    return get().requests.filter((r) => r.status === 'PENDING').length
  }
}))
