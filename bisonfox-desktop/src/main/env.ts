import { config } from '@main/appConfig'

// Node.js uses a C library called libuv for file system operations, and by default set to 4 threads, so even if we
// set copyConcurrency to higher than 4, Node.js will use only 4 threads. changing UV_THREADPOOL_SIZE to higher
// forces libuv to use more threads. it must be before any other module because if it is after, fs module will
// ignore the new setting of UV_THREADPOOL_SIZE
process.env.UV_THREADPOOL_SIZE = config.copyConcurrency.toString()
