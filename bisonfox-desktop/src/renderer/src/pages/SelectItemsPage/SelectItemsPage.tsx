import { JSX } from 'react'
import { FileTree } from '@renderer/components/FileTree'
import { NavigationOptions } from '@renderer/components/NavigationOptions/NavigationOptions'
import { useSelectItemsPage } from '@renderer/pages/SelectItemsPage/hooks/useSelectItemsPage'
import { TreePaginationBar } from '@renderer/pages/SelectItemsPage/components/TreePaginationBar'
import '@renderer/pages/SelectItemsPage/SelectItemsPage.css'

export function SelectItemsPage(): JSX.Element {
  const {
    tree,
    scrollToPath,
    setScrollToPath,
    autoExpandMap,
    setAutoExpandMap,
    selected,
    excluded,
    searching,
    saving,
    currentDisk,
    handleLoadChildren,
    handleToggleSelect,
    handleCancelSearch,
    handleSearchRootSubmit,
    handleContinue,
    handleBack
  } = useSelectItemsPage()

  const selectedCount = selected.size

  return (
    <div className="glass-card">
      <p className="page-title select-files-title">בחירת קבצים ותיקיות</p>

      <div className="info-box disk-info-box">
        <span>
          💿 <strong>{currentDisk?.driveLetter}</strong>
        </span>
        <span>נבחרו {selectedCount} פריטים</span>
      </div>

      <TreePaginationBar searching={searching} onSearch={handleSearchRootSubmit} />

      {searching && (
        <div className="loading-container">
          <p>
            <span className="spin">⟳</span> מחפש...
          </p>
          <button className="btn btn-secondary cancel-search-btn" onClick={handleCancelSearch}>
            ✕ ביטול חיפוש
          </button>
        </div>
      )}

      <FileTree
        nodes={tree}
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

      <NavigationOptions
        onBack={handleBack}
        onForward={handleContinue}
        forwardLabel={
          saving ? (
            <>
              <span className="spin">⟳</span> שומר...
            </>
          ) : (
            <>המשך ←</>
          )
        }
        forwardDisabled={selected.size === 0 || saving}
      />
    </div>
  )
}
