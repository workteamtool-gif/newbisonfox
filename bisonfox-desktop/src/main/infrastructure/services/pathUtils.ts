/** Normalise Windows drive letter to uppercase for consistent path.relative calls. */
export function normalizeDriveCase(p: string): string {
  if (p.charAt(1) === ':') return p.charAt(0).toUpperCase() + p.slice(1)
  return p
}
