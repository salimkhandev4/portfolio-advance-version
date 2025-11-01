const Project = require("../models/Project.js");
const mongoose = require("mongoose");
const { 
  uploadVideoToCloudinary, 
  deleteVideoFromCloudinary,
  uploadImageToCloudinary,
  deleteImageFromCloudinary 
} = require("../utils/cloudinaryUpload");

// Helper function to extract validation errors
const extractValidationErrors = (error) => {
    if (error.name === 'ValidationError') {
        const errors = {};
        Object.keys(error.errors).forEach(key => {
            errors[key] = error.errors[key].message;
        });
        return errors;
    }
    return null;
};

// Get all projects (public)
const getProjects = async (req, res) => {
    try {
        const projects = await Project.find().sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            count: projects.length,
            projects
        });
    } catch (error) {
        console.error("Error fetching projects:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching projects",
            error: error.message
        });
    }
};

// Get single project by ID (public)
const getProject = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid project ID format"
            });
        }

        const project = await Project.findById(id);

        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found"
            });
        }

        res.status(200).json({
            success: true,
            project
        });
    } catch (error) {
        console.error("Error fetching project:", error);
        res.status(500).json({
            success: false,
            message: "Error fetching project",
            error: error.message
        });
    }
};

// Add project (protected)
// Accepts JSON with Cloudinary URLs (frontend uploads directly to Cloudinary to bypass Vercel limits)
// Similar to Next.js pattern: frontend uploads to Cloudinary, backend just saves URLs
const addProject = async (req, res) => {
    try {
        const contentType = req.headers["content-type"] || "";
        
        // JSON path: accept metadata after a direct-to-Cloudinary upload (bypasses Vercel limits)
        if (contentType.includes("application/json")) {
            // Parse array fields if they come as stringified JSON or arrays
            if (req.body.features && typeof req.body.features === 'string') {
                try {
                    req.body.features = JSON.parse(req.body.features);
                } catch (e) {
                    req.body.features = [req.body.features];
                }
            }
            if (req.body.tools && typeof req.body.tools === 'string') {
                try {
                    req.body.tools = JSON.parse(req.body.tools);
                } catch (e) {
                    req.body.tools = [req.body.tools];
                }
            }

            // Handle array format (features[0], tools[0], etc.)
            const features = [];
            const tools = [];
            Object.keys(req.body).forEach(key => {
                if (key.startsWith('features[')) {
                    const match = key.match(/\[(\d+)\]/);
                    if (match) {
                        const index = parseInt(match[1]);
                        features[index] = req.body[key];
                        delete req.body[key];
                    }
                } else if (key.startsWith('tools[')) {
                    const match = key.match(/\[(\d+)\]/);
                    if (match) {
                        const index = parseInt(match[1]);
                        tools[index] = req.body[key];
                        delete req.body[key];
                    }
                }
            });
            if (features.length > 0) req.body.features = features.filter(Boolean);
            if (tools.length > 0) req.body.tools = tools.filter(Boolean);

            // Frontend already uploaded to Cloudinary, just save the URLs
            // No file processing needed - this bypasses Vercel's 4.5MB limit
            // Expecting: cloudinaryVideoUrl, cloudinaryVideoPublicId, cloudinaryThumbnailUrl, cloudinaryThumbnailPublicId
            
            const project = new Project(req.body);
            await project.save();

            return res.status(201).json({
                success: true,
                message: "Project added successfully",
                project
            });
        }

        // Multipart path (legacy fallback for local dev or small files only)
        // Parse FormData arrays (features, tools)
        if (req.body.features && typeof req.body.features === 'string') {
            try {
                req.body.features = JSON.parse(req.body.features);
            } catch (e) {
                req.body.features = [req.body.features];
            }
        }
        if (req.body.tools && typeof req.body.tools === 'string') {
            try {
                req.body.tools = JSON.parse(req.body.tools);
            } catch (e) {
                req.body.tools = [req.body.tools];
            }
        }

        // Handle array format from FormData
        const features = [];
        const tools = [];
        Object.keys(req.body).forEach(key => {
            if (key.startsWith('features[')) {
                const match = key.match(/\[(\d+)\]/);
                if (match) {
                    const index = parseInt(match[1]);
                    features[index] = req.body[key];
                    delete req.body[key];
                }
            } else if (key.startsWith('tools[')) {
                const match = key.match(/\[(\d+)\]/);
                if (match) {
                    const index = parseInt(match[1]);
                    tools[index] = req.body[key];
                    delete req.body[key];
                }
            }
        });
        if (features.length > 0) req.body.features = features.filter(Boolean);
        if (tools.length > 0) req.body.tools = tools.filter(Boolean);

        // Handle file uploads (fallback - not recommended for Vercel serverless)
        if (req.files && req.files['video'] && req.files['video'][0]) {
            try {
                const videoFile = req.files['video'][0];
                const videoInput = videoFile.buffer || videoFile.path;
                const videoResult = await uploadVideoToCloudinary(videoInput);
                req.body.cloudinaryVideoUrl = videoResult.url;
                req.body.cloudinaryVideoPublicId = videoResult.public_id;
            } catch (uploadError) {
                console.error("Error uploading video to Cloudinary:", uploadError);
                return res.status(500).json({
                    success: false,
                    message: "Error uploading video to Cloudinary",
                    error: uploadError.message
                });
            }
        }

        if (req.files && req.files['thumbnail'] && req.files['thumbnail'][0]) {
            try {
                const thumbnailFile = req.files['thumbnail'][0];
                const thumbnailInput = thumbnailFile.buffer || thumbnailFile.path;
                const thumbnailResult = await uploadImageToCloudinary(thumbnailInput);
                req.body.cloudinaryThumbnailUrl = thumbnailResult.url;
                req.body.cloudinaryThumbnailPublicId = thumbnailResult.public_id;
            } catch (uploadError) {
                console.error("Error uploading thumbnail to Cloudinary:", uploadError);
                return res.status(500).json({
                    success: false,
                    message: "Error uploading thumbnail to Cloudinary",
                    error: uploadError.message
                });
            }
        }

        const project = new Project(req.body);
        await project.save();

        return res.status(201).json({
            success: true,
            message: "Project added successfully",
            project
        });
    } catch (error) {
        console.error("Error adding project:", error);

        // Handle validation errors
        const validationErrors = extractValidationErrors(error);
        if (validationErrors) {
            return res.status(400).json({
                success: false,
                message: "Validation error",
                errors: validationErrors
            });
        }

        // Handle other errors
        res.status(500).json({
            success: false,
            message: "Error adding project",
            error: error.message
        });
    }
};

// Update project (protected)
const updateProject = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid project ID format"
            });
        }

        // Get existing project to check for old video
        const existingProject = await Project.findById(id);
        if (!existingProject) {
            return res.status(404).json({
                success: false,
                message: "Project not found"
            });
        }

        // Parse FormData arrays (features, tools)
        if (req.body.features && typeof req.body.features === 'string') {
            try {
                req.body.features = JSON.parse(req.body.features);
            } catch (e) {
                req.body.features = [req.body.features];
            }
        }
        if (req.body.tools && typeof req.body.tools === 'string') {
            try {
                req.body.tools = JSON.parse(req.body.tools);
            } catch (e) {
                req.body.tools = [req.body.tools];
            }
        }

        // Handle array format from FormData
        const features = [];
        const tools = [];
        Object.keys(req.body).forEach(key => {
            if (key.startsWith('features[')) {
                const match = key.match(/\[(\d+)\]/);
                if (match) {
                    const index = parseInt(match[1]);
                    features[index] = req.body[key];
                    delete req.body[key];
                }
            } else if (key.startsWith('tools[')) {
                const match = key.match(/\[(\d+)\]/);
                if (match) {
                    const index = parseInt(match[1]);
                    tools[index] = req.body[key];
                    delete req.body[key];
                }
            }
        });
        if (features.length > 0) req.body.features = features.filter(Boolean);
        if (tools.length > 0) req.body.tools = tools.filter(Boolean);

        // Handle video - frontend uploads directly to Cloudinary, we just manage the URLs
        if (req.body.cloudinaryVideoUrl && req.body.cloudinaryVideoPublicId) {
            // Frontend already uploaded to Cloudinary
            // Delete old video if it's different from the new one
            if (existingProject.cloudinaryVideoPublicId && 
                existingProject.cloudinaryVideoPublicId !== req.body.cloudinaryVideoPublicId) {
                try {
                    await deleteVideoFromCloudinary(existingProject.cloudinaryVideoPublicId);
                } catch (deleteError) {
                    console.warn("Error deleting old video from Cloudinary:", deleteError);
                    // Continue - don't fail the update if deletion fails
                }
            }
        } else if (req.body.removeVideo === 'true' || req.body.cloudinaryVideoUrl === '') {
            // If explicitly removing video
            if (existingProject.cloudinaryVideoPublicId) {
                try {
                    await deleteVideoFromCloudinary(existingProject.cloudinaryVideoPublicId);
                } catch (deleteError) {
                    console.warn("Error deleting video from Cloudinary:", deleteError);
                }
                req.body.cloudinaryVideoUrl = '';
                req.body.cloudinaryVideoPublicId = '';
            }
        } else if (req.files && req.files['video'] && req.files['video'][0]) {
            // Legacy fallback: server-side upload (not recommended for Vercel)
            if (existingProject.cloudinaryVideoPublicId) {
                try {
                    await deleteVideoFromCloudinary(existingProject.cloudinaryVideoPublicId);
                } catch (deleteError) {
                    console.warn("Error deleting old video:", deleteError);
                }
            }
            try {
                const videoFile = req.files['video'][0];
                const videoInput = videoFile.buffer || videoFile.path;
                const videoResult = await uploadVideoToCloudinary(videoInput);
                req.body.cloudinaryVideoUrl = videoResult.url;
                req.body.cloudinaryVideoPublicId = videoResult.public_id;
            } catch (uploadError) {
                console.error("Error uploading video to Cloudinary:", uploadError);
                return res.status(500).json({
                    success: false,
                    message: "Error uploading video to Cloudinary",
                    error: uploadError.message
                });
            }
        }

        // Handle thumbnail - frontend uploads directly to Cloudinary, we just manage the URLs
        if (req.body.cloudinaryThumbnailUrl && req.body.cloudinaryThumbnailPublicId) {
            // Frontend already uploaded to Cloudinary
            // Delete old thumbnail if it's different from the new one
            if (existingProject.cloudinaryThumbnailPublicId && 
                existingProject.cloudinaryThumbnailPublicId !== req.body.cloudinaryThumbnailPublicId) {
                try {
                    await deleteImageFromCloudinary(existingProject.cloudinaryThumbnailPublicId);
                } catch (deleteError) {
                    console.warn("Error deleting old thumbnail from Cloudinary:", deleteError);
                    // Continue - don't fail the update if deletion fails
                }
            }
        } else if (req.body.removeThumbnail === 'true' || req.body.cloudinaryThumbnailUrl === '') {
            // If explicitly removing thumbnail
            if (existingProject.cloudinaryThumbnailPublicId) {
                try {
                    await deleteImageFromCloudinary(existingProject.cloudinaryThumbnailPublicId);
                } catch (deleteError) {
                    console.warn("Error deleting thumbnail from Cloudinary:", deleteError);
                }
                req.body.cloudinaryThumbnailUrl = '';
                req.body.cloudinaryThumbnailPublicId = '';
            }
        } else if (req.files && req.files['thumbnail'] && req.files['thumbnail'][0]) {
            // Legacy fallback: server-side upload (not recommended for Vercel)
            if (existingProject.cloudinaryThumbnailPublicId) {
                try {
                    await deleteImageFromCloudinary(existingProject.cloudinaryThumbnailPublicId);
                } catch (deleteError) {
                    console.warn("Error deleting old thumbnail:", deleteError);
                }
            }
            try {
                const thumbnailFile = req.files['thumbnail'][0];
                const thumbnailInput = thumbnailFile.buffer || thumbnailFile.path;
                const thumbnailResult = await uploadImageToCloudinary(thumbnailInput);
                req.body.cloudinaryThumbnailUrl = thumbnailResult.url;
                req.body.cloudinaryThumbnailPublicId = thumbnailResult.public_id;
            } catch (uploadError) {
                console.error("Error uploading thumbnail to Cloudinary:", uploadError);
                return res.status(500).json({
                    success: false,
                    message: "Error uploading thumbnail to Cloudinary",
                    error: uploadError.message
                });
            }
        }

        const updatedProject = await Project.findByIdAndUpdate(
            id,
            req.body,
            { new: true, runValidators: true }
        );

        res.status(200).json({
            success: true,
            message: "Project updated successfully",
            project: updatedProject
        });
    } catch (error) {
        console.error("Error updating project:", error);

        // Handle validation errors
        const validationErrors = extractValidationErrors(error);
        if (validationErrors) {
            return res.status(400).json({
                success: false,
                message: "Validation error",
                errors: validationErrors
            });
        }

        // Handle other errors
        res.status(500).json({
            success: false,
            message: "Error updating project",
            error: error.message
        });
    }
};

// Delete project (protected)
const deleteProject = async (req, res) => {
    try {
        const { id } = req.params;

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({
                success: false,
                message: "Invalid project ID format"
            });
        }

        // Get project first to access Cloudinary public_id
        const project = await Project.findById(id);
        
        if (!project) {
            return res.status(404).json({
                success: false,
                message: "Project not found"
            });
        }

        // Delete video from Cloudinary if it exists
        if (project.cloudinaryVideoPublicId) {
            await deleteVideoFromCloudinary(project.cloudinaryVideoPublicId);
        }

        // Delete thumbnail from Cloudinary if it exists
        if (project.cloudinaryThumbnailPublicId) {
            await deleteImageFromCloudinary(project.cloudinaryThumbnailPublicId);
        }

        // Delete project from database
        await Project.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: "Project deleted successfully",
            project
        });
    } catch (error) {
        console.error("Error deleting project:", error);
        res.status(500).json({
            success: false,
            message: "Error deleting project",
            error: error.message
        });
    }
};

module.exports = { getProjects, getProject, addProject, deleteProject, updateProject };