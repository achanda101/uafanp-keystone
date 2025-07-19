// test-env.js - Create this file in your project root
require('dotenv').config({ path: '.env.local' })
// require('dotenv').config({ path: '.env' })

console.log('🔍 Environment Variables Test:')
console.log('='.repeat(40))
console.log('CLOUDINARY_CLOUD_NAME:', process.env.CLOUDINARY_CLOUD_NAME)
console.log('CLOUDINARY_API_KEY:', process.env.CLOUDINARY_API_KEY)
console.log('CLOUDINARY_API_SECRET:', process.env.CLOUDINARY_API_SECRET ? 'SET (length: ' + process.env.CLOUDINARY_API_SECRET.length + ')' : 'NOT SET')
console.log('='.repeat(40))

// Check if files exist
const fs = require('fs')
console.log('.env.local exists:', fs.existsSync('.env.local'))
console.log('.env exists:', fs.existsSync('.env'))

if (fs.existsSync('.env.local')) {
    console.log('.env.local contents:')
    console.log(fs.readFileSync('.env.local', 'utf8'))
}

// Test Cloudinary config creation
try {
    const cloudinaryConfig = {
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        apiSecret: process.env.CLOUDINARY_API_SECRET,
        folder: 'banners',
    }

    if (!cloudinaryConfig.cloudName || !cloudinaryConfig.apiKey || !cloudinaryConfig.apiSecret) {
        throw new Error('Missing required Cloudinary environment variables')
    }

    console.log('✅ Cloudinary config created successfully')
    console.log('Config:', {
        ...cloudinaryConfig,
        apiSecret: '***HIDDEN***'
    })
} catch (error) {
    console.error('❌ Cloudinary config creation failed:', error.message)
}