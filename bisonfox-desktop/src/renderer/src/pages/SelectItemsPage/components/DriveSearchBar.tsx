import { useState, JSX } from 'react'

interface DriveSearchBarProps {
  searching: boolean
  onSearch: (query: string) => Promise<boolean>
}

export function DriveSearchBar({
  searching,
  onSearch
}: DriveSearchBarProps): JSX.Element {
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
      <form onSubmit={handleSearchSubmit} className="pagination-search-form ltr-form">
        <input
          type="text"
          placeholder="🔍 Search file or folder..."
          value={rootSearchQuery}
          onChange={(e) => setRootSearchQuery(e.target.value)}
          className="pagination-search-input"
          disabled={searching}
        />
        <button
          type="submit"
          disabled={!rootSearchQuery.trim() || searching}
          className={`pagination-search-btn ${rootSearchQuery.trim() ? 'active' : ''}`}
        >
          →
        </button>
      </form>
    </div>
  )
}
