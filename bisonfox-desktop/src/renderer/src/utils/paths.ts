/**
 * Checks if a child path is the same as or deeply nested inside a parent path.
 * * @param parent - The directory path (e.g., 'C:/Users/Ofir')
 * @param child - The file or subfolder path to check
 * @param strict - If true, returns false if parent and child are identical
 */
export function isSubPath(parent: string, child: string, strict = false): boolean {
  if (!parent || !child) return false

  // 1. Normalize slashes and remove trailing slashes to start from a clean baseline
  const p = parent.replace(/\\/g, '/').replace(/\/$/, '')
  const c = child.replace(/\\/g, '/').replace(/\/$/, '')

  // 2. Handle Identity: Is it the exact same folder?
  if (p.toLowerCase() === c.toLowerCase()) {
    return !strict
  }

  // 3. Sub-path check: Add a single trailing slash to ensure we don't match
  // "folder11" as a child of "folder1"
  const normParent = p.toLowerCase() + '/'
  const normChild = c.toLowerCase()

  return normChild.startsWith(normParent)
}
