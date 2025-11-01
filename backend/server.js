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
// Configure CORS to allow credentials (cookies)
// Allow both localhost (development) and production frontend URLs
const allowedOrigins = [
    "http://localhost:5173", // Local development
    "https://portfolio-advance-version-frontend.vercel.app", // Production frontend
    process.env.FRONTEND_URL // Allow environment variable override
].filter(Boolean); // Remove any undefined values

app.use(cors({
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin) return callback(null, true);
        
        if (allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            // Reject origin not in allowed list
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true // Allow cookies to be sent
}));
app.use(express.json());       // parse JSON request bodies
app.use(cookieParser());      // parse cookies

// --- Default Route ---
app.get("/", (req, res) => {
    res.json({ message: "Hello from the backend" });
});

// --- Routes ---
app.use("/api/users", userRoutes);       // login route
app.use("/api/projects", projectRoutes); // CRUD project routes
app.use("/api/skills", skillRoutes);    // CRUD skill routes

// --- Connect to MongoDB and start server ---
const startServer = async () => {
    try {
        
        await connectDB();
        
        app.listen(PORT, () => {
            console.log(`Server running on http://localhost:${PORT}`);
        });
    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
