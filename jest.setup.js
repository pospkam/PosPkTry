// jest.setup.js
// Jest configuration and setup

// Set test environment variables
process.env.DATABASE_URL = 'postgresql://test:test@localhost:5432/test'
process.env.REDIS_URL = 'redis://localhost:6379'
process.env.NODE_ENV = 'test'

// Suppress console output in tests
const originalConsole = global.console
global.console = {
  ...originalConsole,
  log: () => {},
  debug: () => {},
  info: () => {},
  warn: () => {},
}

// Mock next/server
jest.mock('next/server', () => ({
  NextRequest: class {},
  NextResponse: {
    json: (data, config) => ({
      status: config?.status || 200,
      json: async () => data,
    }),
  },
}))

// Mock ioredis
jest.mock('ioredis', () => {
  return class {
    get = jest.fn().mockResolvedValue(null)
    set = jest.fn().mockResolvedValue('OK')
    del = jest.fn().mockResolvedValue(0)
    keys = jest.fn().mockResolvedValue([])
    quit = jest.fn().mockResolvedValue(undefined)
  }
})

// Mock pg
jest.mock('pg', () => ({
  Pool: class {
    query = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 })
    connect = jest.fn().mockResolvedValue({})
    end = jest.fn().mockResolvedValue(undefined)
  },
}))
