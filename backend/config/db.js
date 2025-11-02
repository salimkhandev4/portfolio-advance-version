const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const uri = process.env.MONGODB_URI;

        if (!uri) {
            const error = new Error('MONGODB_URI not set in environment');
            console.error('❌', error.message);
            throw error; // Don't exit on serverless, throw error instead
        }

        // Reuse existing connection if available
        if (mongoose.connection.readyState === 1) {
            console.log('✅ MongoDB already connected');
            return mongoose.connection;
        }

        const conn = await mongoose.connect(uri, {
            serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
        });
        console.log(`✅ MongoDB connected successfully: ${conn.connection.host}`);
        return conn;
    } catch (error) {
        console.error(`❌ MongoDB connection failed: ${error.message}`);
        // Don't call process.exit() on serverless - let it handle the error
        if (!process.env.VERCEL) {
            process.exit(1);
        }
        throw error; // Re-throw for serverless to handle
    }
};

module.exports = { connectDB, mongoose };
