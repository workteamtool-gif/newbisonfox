import 'dotenv/config'

process.env.UV_THREADPOOL_SIZE = process.env.COPY_CONCURRENCY || '64'
