export const IPC_CHANNELS = {
  SYSTEM: {
    LOG: 'log-from-client',
    DETECT_KEYBOARD: 'detect-keyboard'
  },
  SESSION: {
    VALIDATE_NAME: 'validate-name',
    CREATE: 'create-session'
  },
  DRIVE: {
    LIST: 'list-drives',
    GET_TREE: 'get-drive-tree',
    GET_DIR: 'get-dir',
    FIND_PAGE: 'find-item-page',
    DEEP_FIND: 'deep-find-item'
  },
  UPLOAD: {
    START_COUNT: 'start-count-files',
    CANCEL_COUNT: 'cancel-count-files',
    COUNT_PREFIX: 'count-files-',
    ADD_DISK_FILES: 'add-disk-files',
    REMOVE_FILE: 'remove-file',
    START: 'start-upload',
    CANCEL: 'cancel-upload',
    PROGRESS_PREFIX: 'upload-progress-'
  }
} as const
