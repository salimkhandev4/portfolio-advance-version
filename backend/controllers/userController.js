const jwt = require("jsonwebtoken");
const User = require("../models/User");

const loginUser = async (req, res) => {
    const { username, password } = req.body;

    try {
        console.log(username, password);
        const user = await User.findOne({ username });
        console.log(user);
        if (!user) return res.status(404).json({ message: "User not found" });

        if (user.password !== password)
            return res.status(401).json({ message: "Invalid credentials" });

        const token = jwt.sign(
            { id: user._id, username: user.username },
            process.env.SECRET_KEY,
            { expiresIn: "1d" }
        );

        // ✅ set cookie here
        // Determine if we're in production (HTTPS) or development (HTTP)
        const isProduction = process.env.NODE_ENV === 'production' || req.secure || req.headers['x-forwarded-proto'] === 'https';
        
        res.cookie("token", token, {
            httpOnly: true, // More secure - prevents client-side JavaScript access
            secure: isProduction, // true in production (HTTPS), false in development
            sameSite: isProduction ? "None" : "Lax", // "None" required for cross-site cookies in production
            maxAge: 24 * 60 * 60 * 1000, // 24 hours
            path: "/" // Available for all paths
        });

        return res.status(200).json({
            message: "Login successful",
            user: { username: user.username, profilePic: user.profilePicLink }
        });
    } catch (error) {
        return res.status(500).json({ message: "Server error" });
    }
};

const logoutUser = (req, res) => {
    // Determine if we're in production (HTTPS) or development (HTTP)
    const isProduction = process.env.NODE_ENV === 'production' || req.secure || req.headers['x-forwarded-proto'] === 'https';
    
    // Clear cookie with same options as when it was set
    res.clearCookie("token", {
        httpOnly: true,
        secure: isProduction,
        sameSite: isProduction ? "None" : "Lax",
        path: "/"
    });
    
    res.status(200).json({ 
        success: true,
        message: "Logout successful" 
    });
};

const verifyUser = (req, res) => {
    // This route is protected, so if we reach here, user is authenticated
    res.status(200).json({
        success: true,
        user: { username: req.user.username }
    });
};

module.exports = { loginUser, logoutUser, verifyUser };
