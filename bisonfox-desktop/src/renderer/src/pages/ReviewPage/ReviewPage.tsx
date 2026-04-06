import { useState, useCallback, useEffect } from 'react'
import { useWizardStore } from '@renderer/store/useWizardStore'
import { FileNode } from '@shared/entities/FileNode'
import { driveApi } from '@renderer/services/driveApi'
import { uploadApi } from '@renderer/services/uploadApi'
import { useDriveMonitor } from '@renderer/hooks/useDriveMonitor'
import { FileTree } from '@renderer/components/FileTree/FileTree'
import './ReviewPage.css'
import { JSX } from 'react'
import { UploadPage, InsertDiskPage, SelectFilesPage } from '@renderer/entites/Wizard'
import { clientLogger } from '@renderer/utils/logger'

export function ReviewPage(): JSX.Element | null {
  const { currentDisk, setCurrentDisk, sessionId, setStep, addDiskSession, userName } = useWizardStore()

  useDriveMonitor()

  const [nodes, setNodes] = useState<FileNode[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [autoExpandMap, setAutoExpandMap] = useState<Record<string, number>>({})
  const [saving, setSaving] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)

  useEffect(() => {
    if (!currentDisk) return

    setSelected(new Set(currentDisk.selectedFiles))
    setExcluded(new Set(currentDisk.excludedFiles ?? []))

    const initialNodes = currentDisk.selectedFiles.map((fp) => {
      const name = fp.split(/[/\\]/).pop() ?? fp
      const isFileLike = name.includes('.')
      return {
        name: `${name}   (${fp})`,
        path: fp,
        isDirectory: !isFileLike,
        hasChildren: !isFileLike
      }
    })
    setNodes(initialNodes)
  }, [currentDisk])

  const handleLoadChildren = useCallback(async (dirPath: string, page: number) => {
    return driveApi.getDir(dirPath, page)
  }, [])

  const handleToggleSelect = useCallback(
    (path: string, _isDir: boolean, isExcluded: boolean, isInherited: boolean) => {
      if (isExcluded) {
        setExcluded((prev) => {
          const n = new Set(prev)
          n.delete(path)
          return n
        })
      } else if (isInherited) {
        setExcluded((prev) => new Set([...prev, path]))
      } else {
        setSelected((prev) => {
          const n = new Set(prev)
          if (n.has(path)) n.delete(path)
          else n.add(path)

          const prefixWindows = path + '\\'
          const prefixPosix = path + '/'
          for (const sel of n) {
            if (sel !== path && (sel.startsWith(prefixWindows) || sel.startsWith(prefixPosix))) {
              n.delete(sel)
            }
          }
          return n
        })

        setExcluded((prev) => {
          const n = new Set(prev)
          let changed = false
          const prefixWindows = path + '\\'
          const prefixPosix = path + '/'
          for (const ex of n) {
            if (ex === path || ex.startsWith(prefixWindows) || ex.startsWith(prefixPosix)) {
              n.delete(ex)
              changed = true
            }
          }
          return changed ? n : prev
        })
      }
    },
    []
  )

  async function handleStartUpload(): Promise<void | null> {
    if (!currentDisk) return
    setSaving(true)
    setSyncError(null)

    const finalDisk = {
      ...currentDisk,
      selectedFiles: Array.from(selected),
      excludedFiles: Array.from(excluded)
    }

    try {
      await uploadApi.addDiskFiles(
        sessionId,
        finalDisk.driveLabel,
        finalDisk.selectedFiles,
        finalDisk.excludedFiles
      )

      setCurrentDisk(finalDisk)
      addDiskSession(finalDisk)
      clientLogger.info('ReviewPage', `The user: ${userName} in session: ${sessionId} is starting upload of ${finalDisk.selectedFiles} files to drive: ${finalDisk.driveLabel}`)
      setStep(UploadPage)
    } catch (err: any) {
      setSyncError(
        err.message || 'Lost connection to the server. Please hit refresh and try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  if (!currentDisk) {
    clientLogger.warn('ReviewPage', `The user: ${userName} in session: ${sessionId} has no current disk found, navigating back to InsertDiskPage`)
    setStep(InsertDiskPage)
    return null
  }

  const fileCount = selected.size

  return (
    <div className="wizard-layout">
      <div className="glass-card">
        <p className="page-title">Double Check Selection</p>
        <p className="page-subtitle">
          Please review the files you&apos;ve selected from{' '}
          <strong>{currentDisk.driveLabel}</strong>.
          <br />
          Subfolder:{' '}
          <code style={{ color: 'var(--accent)' }}>{currentDisk.subfolder || '(root)'}</code>
        </p>

        <div className="review-disk">
          <div className="review-disk-head">
            <span>💿</span>
            <span className="review-disk-title">{currentDisk.driveLabel}</span>
            <span className="info-icon" style={{ marginLeft: 'auto', marginRight: '5px' }}>
              ℹ️
            </span>
            <span className="review-disk-count">
              {fileCount} root item{fileCount !== 1 ? 's' : ''} selected
            </span>
          </div>

          <div className="review-tree-container">
            {nodes.length === 0 ? (
              <div className="review-empty-state">No files selected. Go back to add some!</div>
            ) : (
              <FileTree
                nodes={nodes}
                selected={selected}
                excluded={excluded}
                onToggleSelect={handleToggleSelect}
                onLoadChildren={handleLoadChildren}
                autoExpandMap={autoExpandMap}
                onAutoExpand={setAutoExpandMap}
              />
            )}
          </div>
        </div>

        {syncError && (
          <div
            className="info-box"
            style={{
              borderColor: 'var(--accent-red)',
              color: 'var(--accent-red)',
              marginTop: '1.5rem',
              fontSize: '0.9rem'
            }}
          >
            ⚠️ <strong>Sync Error:</strong> {syncError}
          </div>
        )}

        <div className="divider" />

        <div className="action-row">
          <button
            className="btn btn-secondary"
            onClick={() => {
              clientLogger.info('ReviewPage', `The user: ${userName} in session: ${sessionId} is returning to file selection`)
              setStep(SelectFilesPage)
            }}
            disabled={saving}
          >
            ← Back to Select
          </button>
          <button
            className="btn btn-primary btn-lg"
            onClick={handleStartUpload}
            disabled={selected.size === 0 || saving}
          >
            {saving ? (
              <>
                <span className="spin">⟳</span> Saving…
              </>
            ) : (
              'Start Upload →'
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
