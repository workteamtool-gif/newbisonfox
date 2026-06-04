export function createTimeFolderName(): string {
  const now = new Date()

  // Format: YYYY-MM-DD_HH-mm-ss
  const date = now.toISOString().slice(0, 10)
  const time = now.toTimeString().slice(0, 8).replace(/:/g, '-')

  return `${date}_${time}`
}
