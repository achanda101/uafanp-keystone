// keystone.ts
import 'dotenv/config'
import { config } from '@keystone-6/core'
import { lists } from './schema'
import { withAuth, session } from './auth'

// Explicitly load environment variables
require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

// Validate Cloudinary configuration
function validateCloudinaryConfig() {
  const requiredVars = {
    CLOUDINARY_CLOUD_NAME: process.env.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: process.env.CLOUDINARY_API_KEY,
    CLOUDINARY_API_SECRET: process.env.CLOUDINARY_API_SECRET,
  }

  const missing = Object.entries(requiredVars)
    .filter(([ key, value ]) => !value)
    .map(([ key ]) => key)

  if (missing.length > 0) {
    throw new Error(`Missing required Cloudinary environment variables: ${missing.join(', ')}`)
  }

  return requiredVars
}

// Validate session secret
if (!process.env.SESSION_SECRET) {
  console.error('SESSION_SECRET environment variable is required')
  if (process.env.NODE_ENV === 'production') {
    process.exit(1)
  }
}

// Validate environment configuration
try {
  validateCloudinaryConfig()
} catch (error) {
  console.error('Environment configuration error:', error.message)
  process.exit(1)
}

// NEW VERSION - chooses provider dynamically
let databaseConfig;

if (process.env.NODE_ENV === 'production' || process.env.DATABASE_URL?.startsWith('postgres')) {
  databaseConfig = {
    provider: 'postgresql' as const,  // ← PostgreSQL in production
    useMigrations: true,
    url: process.env.DATABASE_URL,
  };
} else {
  databaseConfig = {
    provider: 'sqlite' as const,      // ← SQLite only in development
    url: process.env.DATABASE_URL || 'file:./keystone.db',
  };
}

export default withAuth(
  config({
    db: databaseConfig,  // ← Uses the conditional config
    lists,
    session,
    server: {
      cors: { origin: true, credentials: true },
      port: process.env.PORT ? parseInt(process.env.PORT) : 3000,
    },
  })
)