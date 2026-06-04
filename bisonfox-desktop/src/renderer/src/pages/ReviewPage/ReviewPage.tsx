import { JSX } from 'react'
import { FileTree } from '@renderer/components/FileTree/FileTree'
import { NavigationOptions } from '@renderer/components/NavigationOptions/NavigationOptions'
import { useReviewPage } from './hooks/useReviewPage'
import './ReviewPage.css'

export function ReviewPage(): JSX.Element | null {
  const {
    nodes,
    selected,
    excluded,
    saving,
    syncError,
    autoExpandMap,
    setAutoExpandMap,
    scrollToPath,
    setScrollToPath,
    currentDisk,
    handleLoadChildren,
    handleToggleSelect,
    handleStartUpload,
    handleBack
  } = useReviewPage()

  if (!currentDisk) {
    return null
  }

  const fileCount = selected.size

  return (
    <div className="glass-card">
      <p className="page-title">אישור הקבצים להעלאה</p>

      <div className="info-box review-disk-info">
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
        onBack={handleBack}
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
