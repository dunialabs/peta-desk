'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Copy, Download, Trash2, Eye, EyeOff } from 'lucide-react'
import { toast } from 'sonner'
import Header from '@/components/common/header'

interface BackupItem {
  id: string
  filename: string
  date: string
  size: string
  timestamp: string
  description?: string
  details?: string[]
  data?: any
}

export default function BackupRestorePage() {
  const router = useRouter()
  const [backups, setBackups] = useState<BackupItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedBackup, setSelectedBackup] = useState<string>('')
  const [deleteDialog, setDeleteDialog] = useState<{
    open: boolean
    backupId: string
    backupName: string
    type: 'single' | 'all'
  }>({
    open: false,
    backupId: '',
    backupName: '',
    type: 'single'
  })
  const [passwordDialog, setPasswordDialog] = useState<{
    open: boolean
    backupId: string
    backupName: string
    isImported: boolean
    importedData?: any
  }>({
    open: false,
    backupId: '',
    backupName: '',
    isImported: false
  })
  const [backupPassword, setBackupPassword] = useState('')
  const [passwordError, setPasswordError] = useState('')
  const [isRestoring, setIsRestoring] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  // Note: Navigation after restore is now handled directly in handleRestoreBackup
  // No need for sessionStorage flag since we use router.push instead of window.location.reload

  // Note: IPC listeners removed; restore now handled fully in the frontend via localStorage

  const handleBack = () => {
    router.push('/dashboard')
  }

  // Helper function to format file size
  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
  }

  // Helper function to format date
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Load backups from filesystem
  const loadBackups = async () => {
    try {
      setIsLoading(true)
      
      // Check if we're in Electron environment
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        const backupFiles = await (window as any).electronAPI.getBackups()
        const formattedBackups: BackupItem[] = backupFiles.map((file: any) => ({
          id: file.filename,
          filename: file.filename,
          date: formatDate(file.timestamp),
          size: formatFileSize(file.size),
          timestamp: file.timestamp,
          description: file.description,
          data: file.data
        }))
        
        // Sort by timestamp (newest first)
        formattedBackups.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        setBackups(formattedBackups)
      } else {
        // Fallback for development/browser environment
        console.log('Not in Electron environment, no mock data')
        setBackups([])
      }
    } catch (error) {
      console.error('Failed to load backups:', error)
      setBackups([])
    } finally {
      setIsLoading(false)
    }
  }
  // Load backups on component mount
  useEffect(() => {
    loadBackups()
  }, [])

  const handleBackup = async () => {
    try {
      console.log('Creating backup...')

      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        // Only backup MCP servers data
        const mcpServersData = localStorage.getItem('mcpServers')

        // Skip backup when there is no server data
        if (!mcpServersData) {
          toast.warning("No server data to backup")
          return
        }

        const mcpServers = JSON.parse(mcpServersData)

        // Create backup data with only mcpServers
        const backupData = {
          mcpServers: mcpServers
        }

        // Generate description from server data
        let description = 'Manual backup'
        try {
          if (mcpServers && Array.isArray(mcpServers) && mcpServers.length > 0) {
            const serverNames = mcpServers.map((server: any) =>
              `• ${server.name || server.serverName || 'Unnamed Server'}`
            ).join('\n')
            description = `Servers:\n${serverNames}`
          }
        } catch (error) {
          console.warn('Failed to generate backup description:', error)
        }

        const backupPayload = {
          timestamp: new Date().toISOString(),
          version: '1.1',
          data: backupData,
          description: description
        }
        
        const result = await (window as any).electronAPI.createBackup(backupPayload)
        
        if (result.success) {
          console.log('Backup created successfully:', result.filename)
          // Reload backups to show the new one
          await loadBackups()
          // Auto-select the newly created backup
          if (result.filename) {
            setSelectedBackup(result.filename)
          }
        } else {
          console.error('Failed to create backup:', result.error)
        }
      } else {
        console.log('Not in Electron environment')
      }
    } catch (error) {
      console.error('Error creating backup:', error)
    }
  }

  const handleImportFromFile = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.backup,.json'
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (!file) return

      try {
        // Read the file content
        const content = await file.text()

        // Parse and validate backup data
        let backupData
        try {
          backupData = JSON.parse(content)
        } catch (parseError) {
          toast.error('Invalid backup file format')
          console.error('[Frontend] Failed to parse backup file:', parseError)
          return
        }

        // Validate backup structure
        if (!backupData.data || !backupData.version) {
          toast.error('Invalid backup file: missing required data')
          console.error('[Frontend] Invalid backup structure:', backupData)
          return
        }

        console.log('[Frontend] Restoring imported backup file:', file.name)

        // Extract mcpServers from imported backup
        const { mcpServers } = backupData.data || {}

        if (!mcpServers || !Array.isArray(mcpServers) || mcpServers.length === 0) {
          toast.error('No server data found in imported backup')
          return
        }

        // Show password dialog for imported file
        setPasswordDialog({
          open: true,
          backupId: '',
          backupName: file.name,
          isImported: true,
          importedData: backupData
        })
        setBackupPassword('')
        setPasswordError('')
        setShowPassword(false)
      } catch (error) {
        toast.error(`Error importing backup: ${error instanceof Error ? error.message : 'Unknown error'}`)
        console.error('Error importing backup file:', error)
      }
    }
    input.click()
  }

  const handleRestoreBackup = async (backupId: string) => {
    // Find the backup from loaded backups
    const backup = backups.find(b => b.id === backupId)
    if (!backup) {
      toast.error('Backup not found')
      return
    }

    // Show password dialog instead of directly restoring
    setPasswordDialog({
      open: true,
      backupId,
      backupName: backup.filename,
      isImported: false
    })
    setBackupPassword('')
    setPasswordError('')
    setShowPassword(false)
  }

  const handleConfirmRestore = async () => {
    if (!backupPassword) {
      setPasswordError('Please enter the backup password')
      return
    }

    setIsRestoring(true)
    setPasswordError('')

    try {
      let mcpServers: any[]

      if (passwordDialog.isImported && passwordDialog.importedData) {
        // Restoring from imported file
        mcpServers = passwordDialog.importedData.data?.mcpServers || []
      } else {
        // Restoring from backup list
        const backup = backups.find(b => b.id === passwordDialog.backupId)
        if (!backup) {
          setPasswordError('Backup not found')
          setIsRestoring(false)
          return
        }

        // Load backup data
        const result = await (window as any).electronAPI.getBackupData(backup.filename)
        if (!result.success || !result.data) {
          setPasswordError('Failed to load backup data')
          setIsRestoring(false)
          return
        }

        mcpServers = result.data.data?.mcpServers || []
      }

      if (!mcpServers || mcpServers.length === 0) {
        setPasswordError('No server data found in backup')
        setIsRestoring(false)
        return
      }

      console.log(`[Frontend] Processing ${mcpServers.length} servers...`)

      // Re-encrypt tokens with current password
      const processedServers = []
      let decryptionErrors = 0

      for (const server of mcpServers) {
        try {
          if (server.token) {
            // Decrypt with backup password
            const decryptResult = await (window as any).electron.crypto.decryptToken(
              server.token,
              backupPassword
            )

            if (!decryptResult.success) {
              console.warn(`Failed to decrypt token for ${server.serverName || server.name}:`, decryptResult.error)
              decryptionErrors++
              continue
            }

            // Get current master password (stored in Electron)
            const passwordResult = await (window as any).electron.biometric.getPassword()
            const currentMasterPassword = passwordResult.success ? passwordResult.password : backupPassword

            // Re-encrypt with current password
            const encryptResult = await (window as any).electron.crypto.encryptToken(
              decryptResult.token,
              currentMasterPassword
            )

            if (encryptResult.success) {
              processedServers.push({
                ...server,
                token: encryptResult.encryptedToken
              })
            } else {
              console.warn(`Failed to re-encrypt token for ${server.serverName || server.name}`)
              decryptionErrors++
            }
          } else {
            // No encrypted token, keep as is
            processedServers.push(server)
          }
        } catch (error) {
          console.error(`Error processing server ${server.serverName || server.name}:`, error)
          decryptionErrors++
        }
      }

      if (processedServers.length === 0) {
        setPasswordError('Failed to decrypt any servers. Please check your backup password.')
        setIsRestoring(false)
        return
      }

      // Save to localStorage
      localStorage.setItem('mcpServers', JSON.stringify(processedServers))

      console.log(`[Frontend] ✅ Restored ${processedServers.length} servers (${decryptionErrors} failed)`)

      // Close dialog
      setPasswordDialog({ open: false, backupId: '', backupName: '', isImported: false })
      setBackupPassword('')
      setPasswordError('')
      setShowPassword(false)
      setIsRestoring(false)

      // Show success message
      if (decryptionErrors > 0) {
        toast.success(`Restored ${processedServers.length} servers (${decryptionErrors} failed to decrypt)`)
      } else {
        toast.success(`Backup restored successfully! ${processedServers.length} servers restored.`)
      }

      // Navigate to dashboard
      setTimeout(() => {
        router.push('/dashboard')
      }, 500)
    } catch (error) {
      console.error('[Frontend] Error restoring backup:', error)
      setPasswordError(error instanceof Error ? error.message : 'Unexpected error occurred')
      setIsRestoring(false)
    }
  }

  const handleDeleteBackup = async (backupId: string) => {
    try {
      console.log('Deleting backup:', backupId)
      
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        const result = await (window as any).electronAPI.deleteBackup(backupId)
        
        if (result.success) {
          console.log('Backup deleted successfully')
          toast.success('Backup deleted successfully')
          // Reload backups to reflect the deletion
          await loadBackups()
          // Clear selection if the deleted backup was selected
          if (selectedBackup === backupId) {
            setSelectedBackup('')
          }
        } else {
          console.error('Failed to delete backup:', result.error)
          throw new Error(result.error || 'Failed to delete backup')
        }
      }
    } catch (error) {
      console.error('Error deleting backup:', error)
      throw error
    }
  }

  const showDeleteConfirm = (backupId: string, backupName: string) => {
    setDeleteDialog({
      open: true,
      backupId,
      backupName,
      type: 'single'
    })
  }

  const handleClearAllBackups = () => {
    setDeleteDialog({
      open: true,
      backupId: '',
      backupName: `${backups.length} backup${backups.length > 1 ? 's' : ''}`,
      type: 'all'
    })
  }

  const confirmDelete = async () => {
    try {
      if (deleteDialog.type === 'single') {
        await handleDeleteBackup(deleteDialog.backupId)
      } else {
        // Delete all backups
        for (const backup of backups) {
          if (typeof window !== 'undefined' && (window as any).electronAPI) {
            const result = await (window as any).electronAPI.deleteBackup(backup.id)
            if (!result.success) {
              throw new Error(`Failed to delete backup: ${backup.date}`)
            }
          }
        }
        toast.success('All backups deleted successfully')
        await loadBackups()
        setSelectedBackup('')
      }
    } catch (error) {
      console.error('Error deleting backup(s):', error)
      toast.error('Failed to delete backup(s)')
    } finally {
      setDeleteDialog({ open: false, backupId: '', backupName: '', type: 'single' })
    }
  }

  const handleDownloadBackup = async (backupId: string) => {
    try {
      console.log('Downloading backup:', backupId)
      
      if (typeof window !== 'undefined' && (window as any).electronAPI) {
        const result = await (window as any).electronAPI.downloadBackup(backupId)
        
        if (result.success) {
          console.log('Backup downloaded to:', result.path)
        } else {
          console.error('Failed to download backup:', result.error)
        }
      }
    } catch (error) {
      console.error('Error downloading backup:', error)
    }
  }

  return (
    <>
      <div className="h-screen flex flex-col overflow-hidden">
        <Header showSettingsButton={true} />

        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Title */}
          <h1 className="text-[20px] leading-tight font-bold text-[#26251e] px-[16px] pt-[14px] pb-[16px]">
            Backup & Restore
          </h1>

          {/* Main Message - Fixed at top */}
          <div className="px-[16px] mb-6">
            <div className="mb-[16px]">
              <h2 className="text-sm text-[#26251E] mb-[4px] leading-tight">
                Keep your MCP configurations safe with regular backups.
              </h2>
              <p className="text-sm text-[#26251E] leading-relaxed">
                Export your server settings and credentials to restore them later or transfer to another device.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col space-y-[12px]">
              <button
                onClick={handleBackup}
                className="w-full max-w-[398px] h-[40px] text-[13px] bg-[#26251E] hover:bg-[#3A3933] text-white rounded-[8px] font-medium transition-colors"
              >
                Backup
              </button>

              <button
                onClick={handleImportFromFile}
                className="w-full max-w-[398px] h-[40px] text-[13px] rounded-[8px] font-medium border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800 transition-colors bg-white dark:bg-gray-900 text-[#26251E]"
              >
                Import from File
              </button>
            </div>
          </div>

          {/* Backup List Title - Fixed */}
          <div className="px-[16px]">
            <div className="flex items-center justify-between mb-[12px]">
              <h3 className="text-sm font-semibold text-[#26251E]">
                Backup List
              </h3>
              {backups.length > 0 && (
                <button
                  onClick={handleClearAllBackups}
                  className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                  title="Delete all backups"
                >
                  <Trash2 className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                </button>
              )}
            </div>
          </div>

          {/* Backup List Content - Scrollable */}
          <div className="flex-1 px-[16px] overflow-hidden">
            <div
              className="rounded-[8px] mb-6 h-full overflow-y-auto"
              style={{
                background: 'rgba(255, 255, 255, 0.50)'
              }}
            >
              {isLoading ? (
                <div className="py-8 text-center text-gray-500 dark:text-gray-400">
                  Loading backups...
                </div>
              ) : backups.length === 0 ? (
                <div className="py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                  No backups found. Create your first backup!
                </div>
              ) : (
                backups.map((backup, index) => (
                <div 
                  key={backup.id} 
                  className={`px-[14px] py-[10px] cursor-pointer transition-all duration-200 ${
                    index < backups.length - 1 ? 'border-b border-gray-200' : ''
                  } ${
                    selectedBackup === backup.id
                      ? 'bg-blue-50/50'
                      : 'hover:bg-gray-50/50'
                  }`}
                  onClick={() =>
                    setSelectedBackup(
                      selectedBackup === backup.id ? '' : backup.id
                    )
                  }
                >
                  {/* Backup basic information */}
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-[13px] font-bold text-[#26251E]">
                        {backup.date}
                      </div>
                      <div className="text-[11px] text-[#26251E]/50">
                        {backup.size}
                      </div>
                    </div>
                  </div>

                  {/* Show description when selected */}
                  {selectedBackup === backup.id && backup.description && (
                    <div className="mt-0 mb-2">
                      <div className="text-[11px] text-[#26251E]/50 leading-relaxed whitespace-pre-line">
                        {backup.description}
                      </div>
                    </div>
                  )}

                  {/* Action buttons - only shown when selected */}
                  {selectedBackup === backup.id && (
                    <div className="flex items-center justify-between mt-2">
                      {/* Restore button on the left */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleRestoreBackup(backup.id)
                        }}
                        className="h-[32px] px-4 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800 text-[#26251e] rounded-md text-[11px] font-medium transition-colors"
                      >
                        Restore This Backup
                      </button>

                      {/* Delete and download buttons on the right */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            showDeleteConfirm(backup.id, backup.date)
                          }}
                          className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                          title="Delete backup"
                        >
                          <Trash2 className="h-3.5 w-3.5 text-gray-600 dark:text-gray-300" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleDownloadBackup(backup.id)
                          }}
                          className="p-1.5 hover:bg-gray-200 rounded transition-colors"
                          title="Download to computer"
                        >
                          <Download className="h-3.5 w-3.5 text-gray-600 dark:text-gray-300" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
                ))
              )}
            </div>
          </div>

          {/* Bottom Close Button - Fixed */}
          <div className="flex-shrink-0 p-[16px]">
            <button
              onClick={handleBack}
              className="w-full h-[40px] bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-800 dark:bg-gray-800 text-[#26251e] text-[14px] font-[500] rounded-[8px] transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      {deleteDialog.open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-[10px] p-[16px] max-w-[260px] w-full shadow-xl">
            <h2 className="text-[13px] font-bold text-center text-[#26251e] mb-[10px]">
              {deleteDialog.type === 'single' ? 'Delete Backup?' : 'Delete All Backups?'}
            </h2>
            <p className="text-[11px] text-center text-gray-900 dark:text-gray-100 leading-[14px] mb-[16px]">
              {deleteDialog.type === 'single'
                ? `Are you sure you want to delete "${deleteDialog.backupName}"? This action cannot be undone.`
                : `Are you sure you want to delete all ${deleteDialog.backupName}? This action cannot be undone.`
              }
            </p>
            <div className="flex gap-[8px]">
              <button
                onClick={() => setDeleteDialog({ open: false, backupId: '', backupName: '', type: 'single' })}
                className="flex-1 h-[28px] rounded-[5px] bg-gray-100 dark:bg-gray-800 text-[#26251e] text-[13px] font-[400] transition-colors hover:bg-[rgba(0,0,0,0.15)] shadow-[inset_0_0.5px_0.5px_rgba(255,255,255,0.25)]"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="flex-1 h-[28px] rounded-[5px] bg-[#26251E] hover:bg-[#3A3933] text-white text-[13px] font-medium transition-colors shadow-[inset_0_0.5px_0_rgba(255,255,255,0.35)]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Password Dialog */}
      {passwordDialog.open && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-900 rounded-[10px] p-[16px] max-w-[320px] w-full shadow-xl">
            <h2 className="text-[13px] font-bold text-center text-[#26251e] mb-[10px]">
              Enter Backup Password
            </h2>
            <p className="text-[11px] text-center text-gray-900 dark:text-gray-100 leading-[14px] mb-[16px]">
              Please enter the master password that was used when creating "{passwordDialog.backupName}"
            </p>

            {/* Password Input */}
            <div className="relative mb-[20px]">
              <input
                type={showPassword ? 'text' : 'password'}
                value={backupPassword}
                onChange={(e) => {
                  setBackupPassword(e.target.value)
                  if (passwordError) setPasswordError('')
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !isRestoring) {
                    handleConfirmRestore()
                  }
                }}
                placeholder="Master password"
                className="w-full h-[32px] px-[12px] pr-[36px] border border-[rgba(4, 11, 15, 0.10)] rounded-[6px] text-[13px] focus:outline-none focus:border-transparent focus:ring-2 focus:ring-black"
                autoFocus
                disabled={isRestoring}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-[8px] top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 dark:bg-gray-800 rounded transition-colors"
                disabled={isRestoring}
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                ) : (
                  <Eye className="h-4 w-4 text-gray-500 dark:text-gray-400" />
                )}
              </button>
            </div>

            {/* Error Message */}
            {passwordError && (
              <p className="text-[11px] text-red-500 dark:text-red-400 mb-[12px] text-center">
                {passwordError}
              </p>
            )}

            <div className="flex gap-[8px]">
              <button
                onClick={() => {
                  setPasswordDialog({ open: false, backupId: '', backupName: '', isImported: false })
                  setBackupPassword('')
                  setPasswordError('')
                  setShowPassword(false)
                }}
                className="flex-1 h-[28px] rounded-[5px] bg-gray-100 dark:bg-gray-800 text-[#26251e] text-[13px] font-[400] transition-colors hover:bg-[rgba(0,0,0,0.15)] shadow-[inset_0_0.5px_0.5px_rgba(255,255,255,0.25)]"
                disabled={isRestoring}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRestore}
                className="flex-1 h-[28px] rounded-[5px] bg-[#26251E] hover:bg-[#3A3933] text-white text-[13px] font-medium transition-colors shadow-[inset_0_0.5px_0_rgba(255,255,255,0.35)] disabled:opacity-50 disabled:cursor-not-allowed"
                disabled={isRestoring || !backupPassword}
              >
                {isRestoring ? 'Restoring...' : 'Restore'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
