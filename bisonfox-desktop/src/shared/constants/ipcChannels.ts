export const IPC_CHANNELS = {
  SYSTEM: {
    LOG: 'log-from-client',
    DETECT_KEYBOARD: 'detect-keyboard',
    SEND_MAIL_LOG: 'send-mail-log',
    GET_CONFIG: 'get-config',
    CLOSE: 'system:close',
    OPEN_CMD: 'open-cmd'
  },
  SESSION: {
    VALIDATE_NAME: 'validate-name',
    VALIDATE_SUBFOLDER: 'validate-subfolder',
    VALIDATE_SPECIAL_CODE: 'validate-special-code',
    CREATE: 'create-session',
    DELETE: 'delete-session'
  },
  DRIVE: {
    LIST: 'list-drives',
    GET_DIR: 'get-dir',
    GET_DIR_COUNT: 'get-dir-count',
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
    PROGRESS_PREFIX: 'upload-progress-',
    LOG_MAIL: 'log-mail'
  }
} as const
