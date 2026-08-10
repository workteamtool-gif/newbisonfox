import { useState, JSX } from 'react'

interface TreePaginationBarProps {
  rootPage: number
  rootTotalPages: number
  rootCountLoading?: boolean
  rootHasMore: boolean
  loading: boolean
  searching: boolean
  onLoadPrevRoot: () => void
  onLoadNextRoot: () => void
  onJumpToPage: (page: number) => void
  onSearch: (query: string) => Promise<boolean>
}

export function TreePaginationBar({
  rootPage,
  rootTotalPages,
  rootCountLoading,
  rootHasMore,
  loading,
  searching,
  onLoadPrevRoot,
  onLoadNextRoot,
  onJumpToPage,
  onSearch
}: TreePaginationBarProps): JSX.Element {
  const [jumpToPageInput, setJumpToPageInput] = useState('')
  const [rootSearchQuery, setRootSearchQuery] = useState('')

  const handleSearchSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const shouldClear = await onSearch(rootSearchQuery.trim())
    if (shouldClear) {
      setRootSearchQuery('')
    }
  }

  return (
    <div className="tree-pagination-bar tree-pagination-container">
      <div className="pagination-controls">
        <button
          className="pagination-btn"
          onClick={onLoadPrevRoot}
          disabled={rootPage <= 1 || loading}
        >
          ◀
        </button>

        <form
          className="pagination-jump-form"
          onSubmit={(e) => {
            e.preventDefault()
            const page = parseInt(jumpToPageInput, 10)
            if (!isNaN(page)) {
              onJumpToPage(page)
              setJumpToPageInput('')
            }
          }}
        >
          {loading ? (
            <span
              className="pagination-jump-input"
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}
            >
              <span className="spin" style={{ display: 'inline-block', fontSize: '0.75rem' }}>
                ⟳
              </span>
            </span>
          ) : (
            <input
              type="number"
              min={1}
              max={rootTotalPages > 0 ? rootTotalPages : undefined}
              placeholder={String(rootPage)}
              value={jumpToPageInput}
              onChange={(e) => setJumpToPageInput(e.target.value)}
              className="pagination-jump-input"
              disabled={loading || rootCountLoading}
            />
          )}
          <span className="pagination-text">
            /{' '}
            {rootCountLoading ? (
              <span
                className="spin"
                style={{ display: 'inline-block', fontSize: '0.75rem', marginLeft: '4px' }}
              >
                ⟳
              </span>
            ) : (
              Math.max(rootTotalPages, 1)
            )}
          </span>
        </form>

        <button
          className="pagination-btn"
          onClick={onLoadNextRoot}
          disabled={!rootHasMore || loading}
        >
          ▶
        </button>
      </div>

      <div className="pagination-divider" />

      <form onSubmit={handleSearchSubmit} className="pagination-search-form ltr-form">
        <input
          type="text"
          placeholder="🔍 Search file or folder..."
          value={rootSearchQuery}
          onChange={(e) => setRootSearchQuery(e.target.value)}
          className="pagination-search-input"
          disabled={loading || searching}
        />
        <button
          type="submit"
          disabled={!rootSearchQuery.trim() || loading || searching}
          className={`pagination-search-btn ${rootSearchQuery.trim() ? 'active' : ''}`}
        >
          →
        </button>
      </form>
    </div>
  )
}
