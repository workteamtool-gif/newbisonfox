import React, { useState } from 'react'

export interface PaginationBarProps {
  page: number
  totalPages: number
  hasMore: boolean
  loading: boolean
  depth: number
  onLoadPrev: (e: React.MouseEvent) => void
  onLoadNext: (e: React.MouseEvent) => void
  onSearchSubmit: (query: string) => Promise<void>
  onJumpToPage?: (page: number) => void
}

export function PaginationBar({
  page,
  totalPages,
  hasMore,
  loading,
  depth,
  onLoadPrev,
  onLoadNext,
  onSearchSubmit,
  onJumpToPage
}: PaginationBarProps): React.JSX.Element {
  const [searchQuery, setSearchQuery] = useState('')
  const [jumpInput, setJumpInput] = useState('')

  const handleSearch = (e: React.FormEvent): void => {
    e.preventDefault()
    onSearchSubmit(searchQuery)
  }

  return (
    <div
      className="tree-row tree-pagination-bar"
      style={{ paddingLeft: `${depth}vh`, direction: 'ltr' }}
    >
      <div className="pagination-controls">
        <button
          className="pagination-btn"
          onClick={onLoadPrev}
          disabled={page <= 1 || loading}
        >
          ◀
        </button>

        {loading ? (
          <span className="pagination-text">
            <span className="spin" style={{ display: 'inline-block' }}>
              ⟳
            </span>
          </span>
        ) : (
          <form
            className="pagination-jump-form"
            onSubmit={(e) => {
              e.preventDefault()
              const target = parseInt(jumpInput, 10)
              if (!isNaN(target) && onJumpToPage) {
                onJumpToPage(target)
                setJumpInput('')
              }
            }}
          >
            <input
              type="number"
              min={1}
              max={totalPages}
              placeholder={String(page)}
              value={jumpInput}
              onChange={(e) => setJumpInput(e.target.value)}
              className="pagination-jump-input"
              disabled={loading}
            />
            <span className="pagination-text">/ {totalPages}</span>
          </form>
        )}

        <button
          className="pagination-btn"
          onClick={onLoadNext}
          disabled={!hasMore || loading}
        >
          ▶
        </button>
      </div>

      <div className="pagination-divider" />

      <form onSubmit={handleSearch} className="pagination-search-form">
        <input
          type="text"
          placeholder="🔍 Search file or folder..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pagination-search-input"
          disabled={loading}
        />
        <button
          type="submit"
          disabled={!searchQuery.trim() || loading}
          className={`pagination-search-btn ${searchQuery.trim() ? 'active' : ''}`}
        >
          →
        </button>
      </form>
    </div>
  )
}
