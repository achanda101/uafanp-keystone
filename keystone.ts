import { config } from '@keystone-6/core'
import { lists } from './schema'
import { withAuth, session } from './auth'
import { validateCloudinaryConfig } from './config/env'

// Validate environment configuration
try {
  validateCloudinaryConfig()
} catch (error) {
  console.error('🚨 Environment configuration error:', error.message)
  process.exit(1)
}

export default withAuth(
  config({
    db: {
      provider: 'sqlite',
      url: 'file:./keystone.db',
    },
    lists,
    session,
  })
)
