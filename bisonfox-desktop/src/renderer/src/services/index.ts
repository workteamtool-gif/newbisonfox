import { sessionApi } from './sessionApi'
import { driveApi } from './driveApi'
import { uploadApi } from './uploadApi'

export const api = {
  ...sessionApi,
  ...driveApi,
  ...uploadApi
}
