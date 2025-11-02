const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const cloudinary = require('cloudinary');

cloudinary.v2.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

// Test connection function (only run in local development, not on Vercel)
async function testCloudinaryConnection() {
    try {
        const result = await cloudinary.v2.api.ping();
        console.log('Cloudinary connected:', result);
    } catch (error) {
        console.error('Cloudinary connection failed:', error.message);
    }
}

// Only test connection in local development, not on serverless (Vercel)
if (!process.env.VERCEL) {
    testCloudinaryConnection();
}

module.exports = cloudinary.v2;

