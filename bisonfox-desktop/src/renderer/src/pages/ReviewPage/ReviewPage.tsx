import { useState, useCallback, useEffect } from 'react'
import { useWizardStore } from '@renderer/store/useWizardStore'
import { ItemNode } from '@shared/entities/ItemNode'
import { driveApi } from '@renderer/services/driveApi'
import { uploadApi } from '@renderer/services/uploadApi'
import { useDriveMonitor } from '@renderer/hooks/useDriveMonitor'
import { FileTree } from '@renderer/components/FileTree/FileTree'
import './ReviewPage.css'
import { JSX } from 'react'
import { UploadPage, SetupPage, SelectFilesPage } from '@renderer/entites/Wizard'
import { clientLogger } from '@renderer/utils/logger'
import { NavigationOptions } from '@renderer/components/NavigationOptions/NavigationOptions'

export function ReviewPage(): JSX.Element | null {
  const { currentDisk, setCurrentDisk, sessionId, setStep, addDiskSession, userName } =
    useWizardStore()

  useDriveMonitor()

  const [nodes, setNodes] = useState<ItemNode[]>([])
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [excluded, setExcluded] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [syncError, setSyncError] = useState<string | null>(null)
  const [autoExpandMap, setAutoExpandMap] = useState<Record<string, number>>({})
  const [scrollToPath, setScrollToPath] = useState<string | undefined>()

  useEffect(() => {
    if (!currentDisk) return

    setSelected(new Set(currentDisk.selectedItemPaths))
    setExcluded(new Set(currentDisk.excludedItemPaths ?? []))

    const initialNodes = currentDisk.selectedItemPaths.map((fp) => {
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
      selectedItemPaths: Array.from(selected),
      excludedItemPaths: Array.from(excluded)
    }

    try {
      await uploadApi.addDiskFiles(
        sessionId,
        currentDisk.driveLetter,
        finalDisk.selectedItemPaths,
        finalDisk.excludedItemPaths
      )

      setCurrentDisk(finalDisk)
      addDiskSession(finalDisk)
      clientLogger.info(
        'ReviewPage',
        `The user: ${userName} in session: ${sessionId} is starting upload of ${finalDisk.selectedItemPaths} files`
      )

      setStep(UploadPage)
    } catch (err: any) {
      setSyncError(err.message || 'אבד החיבור לשרת')
    } finally {
      setSaving(false)
    }
  }

  if (!currentDisk) {
    clientLogger.warn(
      'ReviewPage',
      `The user: ${userName} in session: ${sessionId} has no current disk found, navigating back to SetupPage`
    )
    setStep(SetupPage)
    return null
  }

  const fileCount = selected.size

  return (
    <div className="glass-card">
      <p className="page-title">אישור הקבצים להעלאה</p>

      <div
        className="info-box"
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '1rem',
          direction: 'ltr',
          fontSize: '1rem'
        }}
      >
        <span>
          💿 <strong>{currentDisk.driveLetter}</strong>
        </span>
        <span>נבחרו {fileCount} פריטים</span>
      </div>

      {nodes.length === 0 ? (
        <div className="review-empty-state">לא נבחרו קבצים. חזור כדי להוסיף!</div>
      ) : (
        <FileTree
          nodes={nodes}
          selected={selected}
          excluded={excluded}
          onToggleSelect={handleToggleSelect}
          onLoadChildren={handleLoadChildren}
          autoExpandMap={autoExpandMap}
          onAutoExpand={(map, targetPath) => {
            setAutoExpandMap(map)
            if (targetPath) setScrollToPath(targetPath)
          }}
          scrollToPath={scrollToPath}
          onScrolled={() => setScrollToPath(undefined)}
        />
      )}

      {syncError && (
        <div className="info-box sync-error">
          ⚠️ <strong>שגיאת סנכרון:</strong> {syncError}
        </div>
      )}

      <NavigationOptions
        onBack={() => {
          clientLogger.info(
            'ReviewPage',
            `The user: ${userName} in session: ${sessionId} is returning to file selection`
          )
          if (currentDisk) {
            setCurrentDisk({
              ...currentDisk,
              selectedItemPaths: Array.from(selected),
              excludedItemPaths: Array.from(excluded)
            })
          }
          setStep(SelectFilesPage)
        }}
        backDisabled={saving}
        onForward={handleStartUpload}
        forwardLabel={
          saving ? (
            <>
              <span className="spin">⟳</span> שומר...
            </>
          ) : (
            <>התחל העלאה ←</>
          )
        }
        forwardDisabled={selected.size === 0 || saving}
      />
    </div>
  )
}
