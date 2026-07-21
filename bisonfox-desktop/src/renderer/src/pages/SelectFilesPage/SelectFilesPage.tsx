import { JSX } from 'react'
import { FileTree } from '@renderer/components/FileTree'
import { NavigationOptions } from '@renderer/components/NavigationOptions/NavigationOptions'
import { useSelectFilesPage } from './hooks/useSelectFilesPage'
import { TreePaginationBar } from './components/TreePaginationBar'
import './SelectFilesPage.css'

export function SelectFilesPage(): JSX.Element {
  const {
    tree,
    rootPage,
    rootTotalPages,
    rootCountLoading,
    rootHasMore,
    scrollToPath,
    setScrollToPath,
    autoExpandMap,
    setAutoExpandMap,
    selected,
    excluded,
    loading,
    pageLoading,
    searching,
    saving,
    currentDisk,
    handleLoadNextRoot,
    handleLoadPrevRoot,
    handleJumpToPage,
    handleLoadChildren,
    handleToggleSelect,
    handleCancelSearch,
    handleSearchRootSubmit,
    handleContinue,
    handleBack
  } = useSelectFilesPage()

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
      {loading ? (
        <div className="loading-container">
          <p>
            <span className="spin">⟳</span> {searching ? 'מחפש...' : 'קורא כונן...'}
          </p>
          {searching && (
            <button className="btn btn-secondary cancel-search-btn" onClick={handleCancelSearch}>
              ✕ ביטול חיפוש
            </button>
          )}
        </div>
      ) : (
        <>
          <TreePaginationBar
            rootPage={rootPage}
            rootTotalPages={rootTotalPages}
            rootCountLoading={rootCountLoading}
            rootHasMore={rootHasMore}
            loading={pageLoading}
            searching={searching}
            onLoadPrevRoot={handleLoadPrevRoot}
            onLoadNextRoot={handleLoadNextRoot}
            onJumpToPage={handleJumpToPage}
            onSearch={handleSearchRootSubmit}
          />
          {pageLoading ? (
            <div className="loading-container">
              <p>
                <span className="spin">⟳</span> קורא כונן...
              </p>
            </div>
          ) : (
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
          )}
        </>
      )}

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
