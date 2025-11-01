const express = require("express");
const { getProjects, getProject, addProject, deleteProject, updateProject } = require("../controllers/projectController.js");
const { protect } = require("../middleware/authMiddleware.js");
const { uploadMultiple } = require("../utils/upload.js");

const router = express.Router();

// Optional multer middleware - only processes files if present
// Since we now accept direct Cloudinary URLs, files are optional
const optionalUpload = (req, res, next) => {
    // If content-type is JSON, skip multer (direct Cloudinary URLs)
    if (req.is('application/json')) {
        return next();
    }
    // Otherwise, use multer for file uploads (backwards compatibility)
    return uploadMultiple(req, res, next);
};

router.get("/", getProjects);
router.get("/:id", getProject);
router.post("/", protect, optionalUpload, addProject);
router.put("/:id", protect, optionalUpload, updateProject);
router.delete("/:id", protect, deleteProject);

module.exports = router;
