// config/env.ts
import dotenv from 'dotenv'
import path from 'path'

// Load environment variables from multiple potential locations
const envFiles = [ '.env.local', '.env' ]

for (const envFile of envFiles) {
    const envPath = path.resolve(process.cwd(), envFile)
    console.log(`🔍 Checking for env file: ${envPath}`)

    try {
        const result = dotenv.config({ path: envPath })
        if (!result.error) {
            console.log(`✅ Loaded environment variables from: ${envFile}`)
            break
        }
    } catch (error) {
        console.log(`⚠️ Could not load ${envFile}:`, error.message)
    }
}

// Validate required Cloudinary environment variables
export const cloudinaryConfig = {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME,
    apiKey: process.env.CLOUDINARY_API_KEY,
    apiSecret: process.env.CLOUDINARY_API_SECRET,
}

export function validateCloudinaryConfig() {
    const missing = Object.entries(cloudinaryConfig)
        .filter(([ key, value ]) => !value)
        .map(([ key ]) => key)

    if (missing.length > 0) {
        console.error('❌ Missing Cloudinary environment variables:', missing)
        console.error('📝 Current environment variables:')
        console.error('  CLOUDINARY_CLOUD_NAME:', cloudinaryConfig.cloudName || 'NOT SET')
        console.error('  CLOUDINARY_API_KEY:', cloudinaryConfig.apiKey || 'NOT SET')
        console.error('  CLOUDINARY_API_SECRET:', cloudinaryConfig.apiSecret ? 'SET' : 'NOT SET')

        throw new Error(`Missing required Cloudinary environment variables: ${missing.join(', ')}`)
    }

    console.log('✅ All Cloudinary environment variables are properly set')
    return cloudinaryConfig
}