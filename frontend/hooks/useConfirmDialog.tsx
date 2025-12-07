'use client'

import { create } from 'zustand'
import React from 'react'

/**
 * Confirmation dialog state
 */
interface ConfirmDialogState {
  isOpen: boolean
  title: string
  message: string
  toolName: string
  toolDescription: string
  toolParams: string
  dangerLevel: number
  serverName: string
  onConfirm: (() => void) | null
  onCancel: (() => void) | null
}

/**
 * Confirmation dialog Store
 */
interface ConfirmDialogStore extends ConfirmDialogState {
  showConfirm: (options: {
    title?: string
    message?: string
    toolName: string
    toolDescription: string
    toolParams?: string
    dangerLevel?: number
    serverName: string
    onConfirm: () => void
    onCancel?: () => void
  }) => void
  confirm: () => void
  cancel: () => void
  close: () => void
}

/**
 * Confirmation dialog state management
 */
export const useConfirmDialogStore = create<ConfirmDialogStore>((set, get) => ({
  isOpen: false,
  title: '',
  message: '',
  toolName: '',
  toolDescription: '',
  toolParams: '',
  dangerLevel: 0,
  serverName: '',
  onConfirm: null,
  onCancel: null,

  showConfirm: (options) => {
    set({
      isOpen: true,
      title: options.title || 'Confirm Action',
      message: options.message || '',
      toolName: options.toolName,
      toolDescription: options.toolDescription,
      toolParams: options.toolParams || '',
      dangerLevel: options.dangerLevel || 0,
      serverName: options.serverName,
      onConfirm: options.onConfirm,
      onCancel: options.onCancel || null
    })
  },

  confirm: () => {
    const { onConfirm } = get()
    if (onConfirm) {
      onConfirm()
    }
    set({
      isOpen: false,
      onConfirm: null,
      onCancel: null
    })
  },

  cancel: () => {
    const { onCancel } = get()
    if (onCancel) {
      onCancel()
    }
    set({
      isOpen: false,
      onConfirm: null,
      onCancel: null
    })
  },

  close: () => {
    set({
      isOpen: false,
      onConfirm: null,
      onCancel: null
    })
  }
}))

/**
 * Hook for using confirmation dialog
 */
export function useConfirmDialog() {
  const store = useConfirmDialogStore()

  const showConfirm = (options: Parameters<ConfirmDialogStore['showConfirm']>[0]) => {
    return new Promise<boolean>((resolve) => {
      store.showConfirm({
        ...options,
        onConfirm: () => {
          options.onConfirm?.()
          resolve(true)
        },
        onCancel: () => {
          options.onCancel?.()
          resolve(false)
        }
      })
    })
  }

  return {
    showConfirm,
    confirm: store.confirm,
    cancel: store.cancel,
    close: store.close,
    isOpen: store.isOpen,
    title: store.title,
    message: store.message,
    toolName: store.toolName,
    toolDescription: store.toolDescription,
    toolParams: store.toolParams,
    dangerLevel: store.dangerLevel,
    serverName: store.serverName
  }
}
