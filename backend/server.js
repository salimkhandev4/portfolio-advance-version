require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const userRoutes = require("./routes/userRoutes.js");
const projectRoutes = require("./routes/projectRoutes.js");
const skillRoutes = require("./routes/skillRoutes.js");
const { connectDB } = require("./config/db.js");
const cloudinary = require("./config/cloudinary");

const app = express();
const PORT = process.env.PORT || 3000;

// --- Middleware ---
// Configure CORS to allow all origins
const corsOptions = {
    origin: true, // Allow all origins
    credentials: true, // Allow cookies to be sent
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'], // Allow all methods
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'], // Allow necessary headers
    exposedHeaders: ['Content-Type'], // Expose headers to client
    maxAge: 86400 // Cache preflight requests for 24 hours
};

app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));       // parse JSON request bodies with increased limit
app.use(express.urlencoded({ limit: '50mb', extended: true })); // parse URL-encoded bodies with increased limit
app.use(cookieParser());      // parse cookies

// --- Database Connection Middleware ---
// For serverless: check if connected, connect if not (reuses connection)
// For local: connect on startup
let dbConnected = false;

const ensureDBConnection = async (req, res, next) => {
    if (!dbConnected) {
        try {
            await connectDB();
            dbConnected = true;
        } catch (error) {
            console.error('Database connection error:', error);
            return res.status(500).json({
                success: false,
                message: 'Database connection failed',
                error: error.message
            });
        }
    }
    next();
};

// --- Default Route ---
app.get("/", (req, res) => {
    res.json({ message: "Hello from the backend" });
});

// --- Cloudinary Config & Signature Endpoints (safe to expose, no DB needed) ---
// Must be defined before DB middleware

// Health check for Cloudinary endpoints
app.get("/api/cloudinary-config", (req, res) => {
    res.json({
        success: true,
        cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
        uploadPreset: process.env.CLOUDINARY_UPLOAD_PRESET || ''
    });
});

// Generate signed upload parameters for direct frontend uploads
// This endpoint doesn't need DB connection, defined before DB middleware
app.post("/api/cloudinary-signature", express.json(), (req, res) => {
    try {
        const { folder, resource_type = 'auto' } = req.body;
        
        // Check if Cloudinary credentials are configured
        if (!process.env.CLOUDINARY_API_SECRET || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_CLOUD_NAME) {
            console.error('Cloudinary credentials missing:', {
                hasSecret: !!process.env.CLOUDINARY_API_SECRET,
                hasKey: !!process.env.CLOUDINARY_API_KEY,
                hasCloudName: !!process.env.CLOUDINARY_CLOUD_NAME
            });
            return res.status(500).json({
                success: false,
                message: 'Cloudinary credentials not configured on server. Please set CLOUDINARY_API_SECRET, CLOUDINARY_API_KEY, and CLOUDINARY_CLOUD_NAME environment variables.'
            });
        }
        
        const cloudinary = require("./config/cloudinary");
        
        const timestamp = Math.round(new Date().getTime() / 1000);
        
        // Build params object for signature - must match exactly what frontend sends
        // IMPORTANT: resource_type is NOT included in signature (Cloudinary excludes it)
        // See: https://cloudinary.com/documentation/signatures
        // Parameters to exclude from signature: file, cloud_name, resource_type, api_key
        const params = {};
        
        // Add folder only if provided and not empty
        if (folder && folder.trim()) {
            params.folder = folder.trim();
        }
        
        // DO NOT include resource_type in signature - Cloudinary excludes it
        // resource_type will be sent separately in the upload request
        
        // Timestamp must always be included
        params.timestamp = timestamp;

        // Create signature using Cloudinary's utility
        // This automatically sorts parameters alphabetically
        const signature = cloudinary.utils.api_sign_request(
            params,
            process.env.CLOUDINARY_API_SECRET
        );

        res.json({
            success: true,
            signature,
            timestamp,
            folder: params.folder || '',
            resource_type: resource_type || 'auto',
            api_key: process.env.CLOUDINARY_API_KEY,
            cloud_name: process.env.CLOUDINARY_CLOUD_NAME
        });
    } catch (error) {
        console.error('Error generating Cloudinary signature:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to generate upload signature',
            error: error.message
        });
    }
});

// Apply database connection middleware to all API routes
app.use('/api', ensureDBConnection);

// --- Routes ---
app.use("/api/users", userRoutes);       // login route
app.use("/api/projects", projectRoutes); // CRUD project routes
app.use("/api/skills", skillRoutes);    // CRUD skill routes

// --- Connect to MongoDB for Local Development ---
if (!process.env.VERCEL) {
    const startServer = async () => {
        try {
            await connectDB();
            dbConnected = true;
            app.listen(PORT, () => {
                console.log(`Server running on http://localhost:${PORT}`);
            });
        } catch (error) {
            console.error('Failed to start server:', error);
            process.exit(1);
        }
    };
    startServer();
} else {
    // Export app for Vercel serverless
    module.exports = app;
}
