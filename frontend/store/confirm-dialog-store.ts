import { create } from 'zustand'

/**
 * Confirmation dialog request information
 */
export interface ConfirmRequest {
  serverId: string
  serverName: string
  requestId: string
  userAgent: string
  ip: string
  toolName: string
  toolDescription: string
  toolParams: string
  onConfirm: (confirmed: boolean) => void
}

/**
 * Confirmation dialog state
 */
interface ConfirmDialogState {
  isOpen: boolean
  request: ConfirmRequest | null
  openConfirm: (request: ConfirmRequest) => void
  confirm: () => void
  cancel: () => void
  close: () => void
  closeSilently: () => void // Close without triggering callback
}

/**
 * Confirmation dialog global state
 */
export const useConfirmDialogStore = create<ConfirmDialogState>((set, get) => ({
  isOpen: false,
  request: null,

  openConfirm: (request) => {
    set({
      isOpen: true,
      request
    })
  },

  confirm: () => {
    const { request } = get()
    if (request) {
      request.onConfirm(true)
    }
    set({
      isOpen: false,
      request: null
    })
  },

  cancel: () => {
    const { request } = get()
    if (request) {
      request.onConfirm(false)
    }
    set({
      isOpen: false,
      request: null
    })
  },

  close: () => {
    const { request } = get()
    if (request) {
      request.onConfirm(false)
    }
    set({
      isOpen: false,
      request: null
    })
  },

  closeSilently: () => {
    set({
      isOpen: false,
      request: null
    })
  }
}))
