import { config } from './appConfig'

process.env.UV_THREADPOOL_SIZE = config.copyConcurrency.toString()
