export interface UploadValidationData {
  stagingDest: string
  finalDest: string
  filesToUpload: string[]
  allExcluded: string[]
  basePath: string | undefined
}
