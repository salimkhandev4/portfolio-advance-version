import {
  faCode,
  faEdit,
  faHome,
  faLaptopCode,
  faPlus,
  faSave,
  faSignOutAlt,
  faTimes,
  faTrash,
} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import axios from 'axios';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import swal from 'sweetalert2';
import { useAuth } from '../context/AuthContext';
import { useProjects } from '../context/ProjectsContext';
import { useSkills } from '../context/SkillsContext';
import { uploadImageToCloudinary, uploadVideoToCloudinary } from '../utils/cloudinaryUpload';

// Helper to ensure HTTPS in production
const ensureHttps = (url) => {
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('http://')) {
    return url.replace('http://', 'https://');
  }
  return url;
};

const BASE_URL = ensureHttps(import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000');
const API_BASE_URL = BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`;

axios.defaults.withCredentials = true;

const UnifiedDashboard = () => {
  const [activeTab, setActiveTab] = useState('projects'); // 'projects' or 'skills'
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-black via-[#0a1122] to-black text-white p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header with Tabs */}
        <div className="flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
            Dashboard
          </h1>
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="flex items-center space-x-2 px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/50 rounded-lg transition-colors text-blue-400 hover:text-blue-300"
            >
              <FontAwesomeIcon icon={faHome} />
              <span>Home</span>
            </Link>
            <LogoutButton />
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-4 mb-6 border-b border-white/10">
          <button
            onClick={() => setActiveTab('projects')}
            className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
              activeTab === 'projects'
                ? 'border-blue-400 text-blue-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <FontAwesomeIcon icon={faLaptopCode} className="mr-2" />
            Projects
          </button>
          <button
            onClick={() => setActiveTab('skills')}
            className={`px-6 py-3 font-semibold transition-colors border-b-2 ${
              activeTab === 'skills'
                ? 'border-purple-400 text-purple-400'
                : 'border-transparent text-gray-400 hover:text-white'
            }`}
          >
            <FontAwesomeIcon icon={faCode} className="mr-2" />
            Skills
          </button>
        </div>

        {/* Content Area */}
        {activeTab === 'projects' ? <ProjectsView /> : <SkillsView />}
      </div>
    </div>
  );
};

// Logout Button Component
const LogoutButton = () => {
  const { logout } = useAuth();

  const handleLogout = async () => {
    await logout();
    window.location.href = '/login';
  };

  return (
    <button
      onClick={handleLogout}
      className="flex items-center space-x-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/50 rounded-lg transition-colors"
    >
      <FontAwesomeIcon icon={faSignOutAlt} />
      <span>Logout</span>
    </button>
  );
};

// Projects View Component
const ProjectsView = () => {
  const { projects, refreshProjects } = useProjects();
  const [isEditing, setIsEditing] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    features: [],
    tools: [],
    githubLink: '',
    deployedUrl: '',
    duration: '',
    challenges: '',
  });

  const [newFeature, setNewFeature] = useState('');
  const [newTool, setNewTool] = useState('');
  const [videoFile, setVideoFile] = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [thumbnailFile, setThumbnailFile] = useState(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [existingVideoUrl, setExistingVideoUrl] = useState(null);
  const [existingThumbnailUrl, setExistingThumbnailUrl] = useState(null);

  // Only fetch on mount, not on every render
  useEffect(() => {
    refreshProjects();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps - only run once on mount

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setFormData((prev) => ({
        ...prev,
        features: [...prev.features, newFeature.trim()],
      }));
      setNewFeature('');
    }
  };

  const removeFeature = (index) => {
    setFormData((prev) => ({
      ...prev,
      features: prev.features.filter((_, i) => i !== index),
    }));
  };

  const addTool = () => {
    if (newTool.trim()) {
      setFormData((prev) => ({
        ...prev,
        tools: [...prev.tools, newTool.trim()],
      }));
      setNewTool('');
    }
  };

  const removeTool = (index) => {
    setFormData((prev) => ({
      ...prev,
      tools: prev.tools.filter((_, i) => i !== index),
    }));
  };

  const startEdit = (project) => {
    setIsEditing(project._id);
    setIsAdding(false);
    setFormData({
      title: project.title || '',
      description: project.description || '',
      features: project.features || [],
      tools: project.tools || [],
      githubLink: project.githubLink || '',
      deployedUrl: project.deployedUrl || '',
      duration: project.duration || '',
      challenges: project.challenges || '',
    });
    setVideoFile(null);
    setVideoPreview(null);
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setExistingVideoUrl(project.cloudinaryVideoUrl || null);
    setExistingThumbnailUrl(project.cloudinaryThumbnailUrl || null);
  };

  const cancelEdit = () => {
    setIsEditing(null);
    setIsAdding(false);
    setFormData({
      title: '',
      description: '',
      features: [],
      tools: [],
      githubLink: '',
      deployedUrl: '',
      duration: '',
      challenges: '',
    });
    setNewFeature('');
    setNewTool('');
    setVideoFile(null);
    setVideoPreview(null);
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setExistingVideoUrl(null);
    setExistingThumbnailUrl(null);
  };

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/mkv'];
      if (!validTypes.includes(file.type) && !file.name.match(/\.(mp4|mov|avi|wmv|flv|webm|mkv)$/i)) {
        swal.fire({
          title: 'Invalid File Type',
          text: 'Please upload a valid video file (mp4, mov, avi, webm, etc.)',
          icon: 'error',
        });
        return;
      }

      if (file.size > 100 * 1024 * 1024) {
        swal.fire({
          title: 'File Too Large',
          text: 'Video file must be less than 100MB',
          icon: 'error',
        });
        return;
      }

      setVideoFile(file);
      setVideoPreview(URL.createObjectURL(file));
      setExistingVideoUrl(null);
    }
  };

  const removeVideo = () => {
    setVideoFile(null);
    setVideoPreview(null);
    setExistingVideoUrl(null);
    if (isEditing) {
      setFormData(prev => ({
        ...prev,
        cloudinaryVideoUrl: '',
        removeVideo: 'true'
      }));
    }
  };

  const handleThumbnailChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type) && !file.name.match(/\.(jpeg|jpg|png|gif|webp)$/i)) {
        swal.fire({
          title: 'Invalid File Type',
          text: 'Please upload a valid image file (jpg, png, gif, webp)',
          icon: 'error',
        });
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        swal.fire({
          title: 'File Too Large',
          text: 'Thumbnail file must be less than 10MB',
          icon: 'error',
        });
        return;
      }

      setThumbnailFile(file);
      setThumbnailPreview(URL.createObjectURL(file));
      setExistingThumbnailUrl(null);
    }
  };

  const removeThumbnail = () => {
    setThumbnailFile(null);
    setThumbnailPreview(null);
    setExistingThumbnailUrl(null);
    if (isEditing) {
      setFormData(prev => ({
        ...prev,
        cloudinaryThumbnailUrl: '',
        removeThumbnail: 'true'
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setUploading(true);

    try {
      // Upload files directly to Cloudinary first
      let cloudinaryVideoUrl = existingVideoUrl;
      let cloudinaryVideoPublicId = formData.cloudinaryVideoPublicId;
      
      if (videoFile) {
        swal.fire({
          title: 'Uploading video...',
          text: 'Please wait while we upload your video to Cloudinary',
          allowOutsideClick: false,
          didOpen: () => {
            swal.showLoading();
          }
        });
        
        const videoResult = await uploadVideoToCloudinary(videoFile, 'project-videos');
        cloudinaryVideoUrl = videoResult.url;
        cloudinaryVideoPublicId = videoResult.public_id;
      }

      let cloudinaryThumbnailUrl = existingThumbnailUrl;
      let cloudinaryThumbnailPublicId = formData.cloudinaryThumbnailPublicId;

      if (thumbnailFile) {
        swal.fire({
          title: 'Uploading thumbnail...',
          text: 'Please wait while we upload your thumbnail',
          allowOutsideClick: false,
          didOpen: () => {
            swal.showLoading();
          }
        });
        
        const thumbnailResult = await uploadImageToCloudinary(thumbnailFile, 'project-thumbnails');
        cloudinaryThumbnailUrl = thumbnailResult.url;
        cloudinaryThumbnailPublicId = thumbnailResult.public_id;
      }

      // Prepare data to send to backend (JSON with Cloudinary URLs - bypasses Vercel limits)
      // Similar to Next.js pattern: frontend uploads to Cloudinary, backend just saves URLs
      const submitData = {
        ...formData,
        // Send Cloudinary URLs (secure_url equivalent) and public_ids
        cloudinaryVideoUrl: cloudinaryVideoUrl || '',
        cloudinaryVideoPublicId: cloudinaryVideoPublicId || '',
        cloudinaryThumbnailUrl: cloudinaryThumbnailUrl || '',
        cloudinaryThumbnailPublicId: cloudinaryThumbnailPublicId || ''
      };

      // Handle removal flags for updates
      if (isEditing) {
        if (!videoFile && !existingVideoUrl) {
          // User wants to remove video
          submitData.removeVideo = 'true';
          submitData.cloudinaryVideoUrl = '';
          submitData.cloudinaryVideoPublicId = '';
        }
        
        if (!thumbnailFile && !existingThumbnailUrl) {
          // User wants to remove thumbnail
          submitData.removeThumbnail = 'true';
          submitData.cloudinaryThumbnailUrl = '';
          submitData.cloudinaryThumbnailPublicId = '';
        }
      }

      // Send JSON to backend (no files - all uploaded directly to Cloudinary)
      if (isEditing) {
        await axios.put(
          `${API_BASE_URL}/projects/${isEditing}`,
          submitData,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
        swal.fire({
          title: 'Success!',
          text: 'Project updated successfully',
          icon: 'success',
          timer: 2000,
        });
      } else {
        await axios.post(
          `${API_BASE_URL}/projects`,
          submitData,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );
        swal.fire({
          title: 'Success!',
          text: 'Project added successfully',
          icon: 'success',
          timer: 2000,
        });
      }
      refreshProjects();
      cancelEdit();
    } catch (error) {
      console.error('Submission error:', error);
      
      // Provide more helpful error messages
      let errorMessage = 'Something went wrong';
      if (error.message) {
        errorMessage = error.message;
        // Check for Cloudinary-specific errors
        if (error.message.includes('upload preset') || error.message.includes('Cloudinary')) {
          errorMessage = `Cloudinary upload failed: ${error.message}. Please check your Cloudinary configuration or contact support.`;
        }
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.data?.error) {
        errorMessage = error.response.data.error;
      }
      
      swal.fire({
        title: 'Error!',
        text: errorMessage,
        icon: 'error',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    const result = await swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
    });

    if (result.isConfirmed) {
      try {
        await axios.delete(`${API_BASE_URL}/projects/${id}`);
        swal.fire({
          title: 'Deleted!',
          text: 'Project has been deleted.',
          icon: 'success',
          timer: 2000,
        });
        refreshProjects();
      } catch (error) {
        swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to delete project',
          icon: 'error',
        });
      }
    }
  };

  return (
    <>
      {!isAdding && !isEditing && (
        <button
          onClick={() => {
            setIsAdding(true);
            setIsEditing(null);
          }}
          className="mb-6 flex items-center space-x-2 px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/50 rounded-lg transition-colors"
        >
          <FontAwesomeIcon icon={faPlus} />
          <span>Add New Project</span>
        </button>
      )}

      {(isAdding || isEditing) && (
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4 sm:p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">
            {isEditing ? 'Edit Project' : 'Add New Project'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-2 text-sm font-semibold">Title *</label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500/50 text-white"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-semibold">Description *</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                rows="3"
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500/50 text-white"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 text-sm font-semibold">Features *</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addFeature())}
                    placeholder="Add feature"
                    className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500/50 text-white"
                  />
                  <button
                    type="button"
                    onClick={addFeature}
                    className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg transition-colors"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 min-h-[40px]">
                  {formData.features.map((feature, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-blue-500/20 rounded-full flex items-center gap-2 text-sm"
                    >
                      {feature}
                      <button
                        type="button"
                        onClick={() => removeFeature(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <label className="block mb-2 text-sm font-semibold">Tools/Technologies *</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newTool}
                    onChange={(e) => setNewTool(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTool())}
                    placeholder="Add tool"
                    className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500/50 text-white"
                  />
                  <button
                    type="button"
                    onClick={addTool}
                    className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 rounded-lg transition-colors"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2 min-h-[40px]">
                  {formData.tools.map((tool, index) => (
                    <span
                      key={index}
                      className="px-3 py-1 bg-purple-500/20 rounded-full flex items-center gap-2 text-sm"
                    >
                      {tool}
                      <button
                        type="button"
                        onClick={() => removeTool(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block mb-2 text-sm font-semibold">GitHub Link</label>
                <input
                  type="url"
                  name="githubLink"
                  value={formData.githubLink}
                  onChange={handleInputChange}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500/50 text-white"
                />
              </div>
              <div>
                <label className="block mb-2 text-sm font-semibold">Deployed URL</label>
                <input
                  type="url"
                  name="deployedUrl"
                  value={formData.deployedUrl}
                  onChange={handleInputChange}
                  placeholder="https://your-project.com"
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500/50 text-white"
                />
              </div>
            </div>

            <div>
              <label className="block mb-2 text-sm font-semibold">Project Video</label>
              <div className="space-y-3">
                <input
                  type="file"
                  accept="video/*"
                  onChange={handleVideoChange}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500/50 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-blue-500/20 file:text-blue-300 hover:file:bg-blue-500/30 file:cursor-pointer"
                />
                <p className="text-xs text-gray-400">
                  Upload a video file (mp4, mov, avi, webm, mkv). Max size: 100MB
                </p>
                
                {(videoPreview || existingVideoUrl) && (
                  <div className="relative">
                    <video
                      src={videoPreview || existingVideoUrl}
                      controls
                      className="w-full rounded-lg max-h-64 bg-black"
                    />
                    <button
                      type="button"
                      onClick={removeVideo}
                      className="absolute top-2 right-2 px-3 py-1 bg-red-500/80 hover:bg-red-500 text-white rounded-lg text-sm flex items-center gap-2"
                    >
                      <FontAwesomeIcon icon={faTimes} />
                      Remove Video
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block mb-2 text-sm font-semibold">Thumbnail Image</label>
              <div className="space-y-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleThumbnailChange}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500/50 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-500/20 file:text-purple-300 hover:file:bg-purple-500/30 file:cursor-pointer"
                />
                <p className="text-xs text-gray-400">
                  Upload a thumbnail image (jpg, png, gif, webp). Max size: 10MB. Will be shown if no video is available.
                </p>
                
                {(thumbnailPreview || existingThumbnailUrl) && (
                  <div className="relative">
                    <img
                      src={thumbnailPreview || existingThumbnailUrl}
                      alt="Thumbnail preview"
                      className="w-full rounded-lg max-h-64 bg-black object-cover"
                    />
                    <button
                      type="button"
                      onClick={removeThumbnail}
                      className="absolute top-2 right-2 px-3 py-1 bg-red-500/80 hover:bg-red-500 text-white rounded-lg text-sm flex items-center gap-2"
                    >
                      <FontAwesomeIcon icon={faTimes} />
                      Remove Thumbnail
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block mb-2 text-sm font-semibold">Duration</label>
              <input
                type="text"
                name="duration"
                value={formData.duration}
                onChange={handleInputChange}
                placeholder="e.g., 3 months"
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500/50 text-white"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-semibold">Challenges</label>
              <textarea
                name="challenges"
                value={formData.challenges}
                onChange={handleInputChange}
                rows="3"
                placeholder="Describe challenges faced..."
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500/50 text-white"
              />
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={uploading}
                className="flex items-center space-x-2 px-6 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faSave} />
                    <span>{isEditing ? 'Update Project' : 'Add Project'}</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="flex items-center space-x-2 px-6 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg transition-colors"
              >
                <FontAwesomeIcon icon={faTimes} />
                <span>Cancel</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {!isAdding && !isEditing && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <div
              key={project._id}
              className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6 hover:bg-white/10 transition-all"
            >
              <h3 className="text-xl font-bold mb-2">{project.title}</h3>
              <p className="text-gray-400 text-sm mb-4 line-clamp-2">
                {project.description}
              </p>
              <div className="flex gap-2 mb-4">
                {project.tools && project.tools.length > 0 && (
                  <span className="px-2 py-1 text-xs bg-blue-500/20 rounded">
                    {project.tools.length} tools
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(project)}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 rounded-lg transition-colors"
                >
                  <FontAwesomeIcon icon={faEdit} />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDelete(project._id)}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg transition-colors"
                >
                  <FontAwesomeIcon icon={faTrash} />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {projects.length === 0 && !isAdding && !isEditing && (
        <div className="text-center text-gray-400 py-12">
          No projects yet. Click &quot;Add New Project&quot; to get started.
        </div>
      )}
    </>
  );
};

// Skills View Component
const SkillsView = () => {
  const { skills, refreshSkills } = useSkills();
  const [isEditing, setIsEditing] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    topics: [],
  });
  const [newTopic, setNewTopic] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [existingImageUrl, setExistingImageUrl] = useState(null);
  const [selectedSkill, setSelectedSkill] = useState(null);
  const [showTopicsDrawer, setShowTopicsDrawer] = useState(false);

  useEffect(() => {
    refreshSkills();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const addTopic = () => {
    if (newTopic.trim()) {
      setFormData((prev) => ({
        ...prev,
        topics: [...prev.topics, newTopic.trim()],
      }));
      setNewTopic('');
    }
  };

  const removeTopic = (index) => {
    setFormData((prev) => ({
      ...prev,
      topics: prev.topics.filter((_, i) => i !== index),
    }));
  };

  const startEdit = (skill) => {
    setIsEditing(skill._id);
    setIsAdding(false);
    setFormData({
      name: skill.name || '',
      topics: skill.topics || [],
    });
    setImageFile(null);
    setImagePreview(null);
    setExistingImageUrl(skill.imageUrl || null);
  };

  const cancelEdit = () => {
    setIsEditing(null);
    setIsAdding(false);
    setFormData({
      name: '',
      topics: [],
    });
    setNewTopic('');
    setImageFile(null);
    setImagePreview(null);
    setExistingImageUrl(null);
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
      if (!validTypes.includes(file.type) && !file.name.match(/\.(jpeg|jpg|png|gif|webp)$/i)) {
        swal.fire({
          title: 'Invalid File Type',
          text: 'Please upload a valid image file (jpg, png, gif, webp)',
          icon: 'error',
        });
        return;
      }

      if (file.size > 10 * 1024 * 1024) {
        swal.fire({
          title: 'File Too Large',
          text: 'Image file must be less than 10MB',
          icon: 'error',
        });
        return;
      }

      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
      setExistingImageUrl(null);
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setExistingImageUrl(null);
    if (isEditing) {
      setFormData(prev => ({
        ...prev,
        imageUrl: '',
        removeImage: 'true'
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Client-side validation
    if (!formData.name || formData.name.trim() === '') {
      swal.fire({
          title: 'Skill name is required',
        icon: 'error',
      });
      return;
    }

    if (!formData.topics || formData.topics.length === 0) {
      swal.fire({
        title: 'At least one topic is required',
        icon: 'error',
      });
      return;
    }

    if (!isEditing && !imageFile) {
      swal.fire({
        title: 'Skill icon image is required',
        icon: 'error',
      });
      return;
    }

    setUploading(true);

    try {
      const submitData = new FormData();
      
      if (imageFile) {
        submitData.append('image', imageFile);
      }

      Object.keys(formData).forEach(key => {
        if (key !== 'removeImage') {
          if (Array.isArray(formData[key])) {
            formData[key].forEach((item, index) => {
              submitData.append(`${key}[${index}]`, item);
            });
          } else {
            submitData.append(key, formData[key]);
          }
        }
      });

      if (isEditing && !imageFile && !existingImageUrl) {
        submitData.append('removeImage', 'true');
      }

      if (isEditing) {
        await axios.put(
          `${API_BASE_URL}/skills/${isEditing}`,
          submitData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );
        swal.fire({
          title: 'Success!',
          text: 'Skill updated successfully',
          icon: 'success',
          timer: 2000,
        });
      } else {
        await axios.post(
          `${API_BASE_URL}/skills`,
          submitData,
          {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          }
        );
        swal.fire({
          title: 'Success!',
          text: 'Skill added successfully',
          icon: 'success',
          timer: 2000,
        });
      }
      refreshSkills();
      cancelEdit();
    } catch (error) {
      console.error('Error submitting skill:', error);
      const errorMessage = error.response?.data?.message || 
                          error.response?.data?.error || 
                          (error.response?.data?.errors ? JSON.stringify(error.response.data.errors) : 'Something went wrong');
      swal.fire({
        title: 'Error!',
        text: errorMessage,
        icon: 'error',
        width: 600,
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    const result = await swal.fire({
      title: 'Are you sure?',
      text: "You won't be able to revert this!",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#d33',
      cancelButtonColor: '#3085d6',
      confirmButtonText: 'Yes, delete it!',
    });

    if (result.isConfirmed) {
      try {
        await axios.delete(`${API_BASE_URL}/skills/${id}`);
        swal.fire({
          title: 'Deleted!',
          text: 'Skill has been deleted.',
          icon: 'success',
          timer: 2000,
        });
        refreshSkills();
      } catch (error) {
        swal.fire({
          title: 'Error!',
          text: error.response?.data?.message || 'Failed to delete skill',
          icon: 'error',
        });
      }
    }
  };

  return (
    <>
      {!isAdding && !isEditing && (
        <button
          onClick={() => {
            setIsAdding(true);
            setIsEditing(null);
          }}
          className="mb-6 flex items-center space-x-2 px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/50 rounded-lg transition-colors"
        >
          <FontAwesomeIcon icon={faPlus} />
          <span>Add New Skill</span>
        </button>
      )}

      {(isAdding || isEditing) && (
        <div className="bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 p-4 sm:p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">
            {isEditing ? 'Edit Skill' : 'Add New Skill'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block mb-2 text-sm font-semibold">Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500/50 text-white"
              />
            </div>

            <div>
              <label className="block mb-2 text-sm font-semibold">Topics *</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addTopic())}
                  placeholder="Add topic"
                  className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500/50 text-white"
                />
                <button
                  type="button"
                  onClick={addTopic}
                  className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 rounded-lg transition-colors"
                >
                  Add
                </button>
              </div>
              <div className="flex flex-wrap gap-2 min-h-[40px]">
                {formData.topics.map((topic, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-blue-500/20 rounded-full flex items-center gap-2 text-sm"
                  >
                    {topic}
                    <button
                      type="button"
                      onClick={() => removeTopic(index)}
                      className="text-red-400 hover:text-red-300"
                    >
                      ×
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div>
              <label className="block mb-2 text-sm font-semibold">Skill Icon *</label>
              <div className="space-y-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImageChange}
                  className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-lg focus:outline-none focus:border-blue-500/50 text-white file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-purple-500/20 file:text-purple-300 hover:file:bg-purple-500/30 file:cursor-pointer"
                />
                <p className="text-xs text-gray-400">
                  Upload a PNG icon (jpg, png, gif, webp). Max size: 10MB.
                </p>
                
                {(imagePreview || existingImageUrl) && (
                  <div className="relative inline-block">
                    <img
                      src={imagePreview || existingImageUrl}
                      alt="Skill icon preview"
                      className="w-32 h-32 rounded-full bg-black object-cover border-2 border-white/20"
                    />
                    <button
                      type="button"
                      onClick={removeImage}
                      className="absolute top-2 right-2 px-3 py-1 bg-red-500/80 hover:bg-red-500 text-white rounded-lg text-sm flex items-center gap-2"
                    >
                      <FontAwesomeIcon icon={faTimes} />
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={uploading}
                className="flex items-center space-x-2 px-6 py-2 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {uploading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Uploading...</span>
                  </>
                ) : (
                  <>
                    <FontAwesomeIcon icon={faSave} />
                    <span>{isEditing ? 'Update Skill' : 'Add Skill'}</span>
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={cancelEdit}
                className="flex items-center space-x-2 px-6 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg transition-colors"
              >
                <FontAwesomeIcon icon={faTimes} />
                <span>Cancel</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {!isAdding && !isEditing && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {skills.map((skill) => (
            <div
              key={skill._id}
              className="bg-white/5 backdrop-blur-xl rounded-xl border border-white/10 p-6 hover:bg-white/10 transition-all"
            >
              <div className="flex items-center gap-4 mb-4">
                <img
                  src={skill.imageUrl}
                  alt={skill.name}
                  className="w-16 h-16 rounded-full object-contain bg-white/10 p-2"
                />
                <div>
                  <h3 className="text-xl font-bold">{skill.name}</h3>
                </div>
              </div>
              <p className="text-gray-400 text-sm mb-2">
                {skill.topics?.length || 0} topics
              </p>
              <button
                onClick={() => {
                  setSelectedSkill(skill);
                  setShowTopicsDrawer(true);
                }}
                className="text-blue-400 hover:text-blue-300 text-sm mb-4"
              >
                View Topics
              </button>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(skill)}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 rounded-lg transition-colors"
                >
                  <FontAwesomeIcon icon={faEdit} />
                  <span>Edit</span>
                </button>
                <button
                  onClick={() => handleDelete(skill._id)}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-2 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-lg transition-colors"
                >
                  <FontAwesomeIcon icon={faTrash} />
                  <span>Delete</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {skills.length === 0 && !isAdding && !isEditing && (
        <div className="text-center text-gray-400 py-12">
          No skills yet. Click &quot;Add New Skill&quot; to get started.
        </div>
      )}

      {/* Topics Drawer */}
      {showTopicsDrawer && selectedSkill && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white/10 backdrop-blur-xl rounded-2xl border border-white/20 p-6 max-w-md w-full max-h-[80vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-2xl font-bold">{selectedSkill.name} Topics</h3>
              <button
                onClick={() => {
                  setShowTopicsDrawer(false);
                  setSelectedSkill(null);
                }}
                className="text-white hover:text-red-400"
              >
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className="space-y-2">
              {selectedSkill.topics?.map((topic, index) => (
                <div
                  key={index}
                  className="px-4 py-2 bg-blue-500/20 rounded-lg"
                >
                  {topic}
                </div>
              ))}
              {(!selectedSkill.topics || selectedSkill.topics.length === 0) && (
                <p className="text-gray-400">No topics available</p>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default UnifiedDashboard;
