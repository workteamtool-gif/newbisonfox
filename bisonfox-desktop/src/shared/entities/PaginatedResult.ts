export interface PaginatedResult<T> {
  nodes: T
  hasMore: boolean
  totalPages: number
}
