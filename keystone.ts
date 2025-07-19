// keystone.ts
import 'dotenv/config' // This must be at the very top
import { config } from '@keystone-6/core'
import { lists } from './schema'
import { withAuth, session } from './auth'

// Explicitly load environment variables
require('dotenv').config({ path: '.env.local' })
require('dotenv').config({ path: '.env' })

// Debug environment variables
console.log('🔍 Environment Variables Check:')
console.log('NODE_ENV:', process.env.NODE_ENV)
console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME)
console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY)
console.log('CLOUDINARY_API_SECRET exists:', !!process.env.CLOUDINARY_API_SECRET)

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
    console.error('❌ Missing Cloudinary environment variables:', missing)
    console.error('📁 Check these files exist: .env.local, .env')
    console.error('📋 Current working directory:', process.cwd())
    throw new Error(`Missing required Cloudinary environment variables: ${missing.join(', ')}`)
  }

  console.log('✅ All Cloudinary environment variables are properly set')
  return requiredVars
}

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