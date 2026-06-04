/**
 * Checks if a child path is the same as or deeply nested inside a parent path.
 * * @param parent - The directory path
 * @param child - The file or subfolder path to check
 * @param strict - If true, returns false if parent and child are identical
 */
export function isSubPath(parent: string, child: string, strict = false): boolean {
  if (!parent || !child) return false

  // 1. Normalize slashes and remove trailing slashes to start from a clean baseline
  let normalizedParent = parent.replace(/\\/g, '/').replace(/\/$/, '')
  let normalizedChild = child.replace(/\\/g, '/').replace(/\/$/, '')

  // 2. Handle Identity: Is it the exact same folder?
  if (normalizedParent.toLowerCase() === normalizedChild.toLowerCase()) {
    return !strict
  }

  // 3. Sub-path check: Add a single trailing slash to ensure we don't match
  // "folder11" as a child of "folder1"
  normalizedParent = normalizedParent.toLowerCase() + '/'
  normalizedChild = normalizedChild.toLowerCase()

  return normalizedChild.startsWith(normalizedParent)
}
