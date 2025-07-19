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

// Validate environment configuration
try {
  validateCloudinaryConfig()
} catch (error) {
  console.error('Environment configuration error:', error.message)
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