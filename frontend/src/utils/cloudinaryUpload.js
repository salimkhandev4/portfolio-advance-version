/**
 * Direct Cloudinary upload utility for frontend
 * Uploads files directly to Cloudinary without going through the server
 * This avoids serverless function timeouts and file size limits
 */

// Helper to ensure HTTPS in production
const ensureHttps = (url) => {
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('http://')) {
    return url.replace('http://', 'https://');
  }
  return url;
};

const BASE_URL = ensureHttps(import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000');
const API_BASE_URL = BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`;

// Cache for Cloudinary config
let cloudinaryConfig = null;

/**
 * Get Cloudinary configuration from backend or environment
 */
const getCloudinaryConfig = async () => {
  // Return cached config if available
  if (cloudinaryConfig) {
    return cloudinaryConfig;
  }

  // Try environment variables first
  const envCloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const envUploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (envCloudName) {
    cloudinaryConfig = {
      cloudName: envCloudName,
      uploadPreset: envUploadPreset || ''
    };
    return cloudinaryConfig;
  }

  // Fetch from backend API
  try {
    const response = await fetch(`${API_BASE_URL}/cloudinary-config`);
    if (response.ok) {
      const data = await response.json();
      if (data.cloudName) {
        cloudinaryConfig = {
          cloudName: data.cloudName,
          uploadPreset: data.uploadPreset || ''
        };
        return cloudinaryConfig;
      }
    }
  } catch (error) {
    console.warn('Failed to fetch Cloudinary config from backend:', error);
  }

  // Return empty config if nothing found
  return { cloudName: '', uploadPreset: '' };
};

/**
 * Upload video directly to Cloudinary
 * @param {File} file - Video file to upload
 * @param {string} folder - Cloudinary folder (optional)
 * @param {Function} onProgress - Progress callback (optional)
 * @returns {Promise<{url: string, public_id: string}>}
 */
export const uploadVideoToCloudinary = async (file, folder = 'project-videos', onProgress = null) => {
  const config = await getCloudinaryConfig();
  
  if (!config.cloudName) {
    throw new Error('Cloudinary cloud name is not configured. Please set VITE_CLOUDINARY_CLOUD_NAME in your .env file or configure it on the backend.');
  }

  // Get signed upload parameters from backend
  let uploadParams;
  try {
    const sigResponse = await fetch(`${API_BASE_URL}/cloudinary-signature`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        folder: folder,
        resource_type: 'video'
      })
    });
    
    if (sigResponse.ok) {
      const sigData = await sigResponse.json();
      uploadParams = sigData;
    }
  } catch (error) {
    console.warn('Failed to get signed upload params, trying unsigned:', error);
  }

  const formData = new FormData();
  formData.append('file', file);
  
  if (uploadParams && uploadParams.signature) {
    // Use signed upload (no preset needed)
    // IMPORTANT: Parameters in signature must match what we send
    // Note: resource_type is NOT in signature but MUST be in upload request
    formData.append('api_key', uploadParams.api_key);
    formData.append('timestamp', uploadParams.timestamp);
    formData.append('signature', uploadParams.signature);
    
    // Only append folder if it was in the signature (not empty)
    if (uploadParams.folder && uploadParams.folder.trim()) {
      formData.append('folder', uploadParams.folder.trim());
    }
    
    // ALWAYS append resource_type - it's required for upload but NOT in signature
    // Cloudinary excludes resource_type from signature generation
    if (uploadParams.resource_type && uploadParams.resource_type !== 'auto') {
      formData.append('resource_type', uploadParams.resource_type);
    }
  } else {
    // Fallback to unsigned upload with preset
    formData.append('upload_preset', config.uploadPreset || 'unsigned_video');
    formData.append('folder', folder);
    formData.append('resource_type', 'video');
  }
  
  formData.append('chunk_size', '6000000'); // 6MB chunks for large files

  try {
    const xhr = new XMLHttpRequest();

    // Set up progress tracking
    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          onProgress(percentComplete);
        }
      });
    }

    const uploadPromise = new Promise((resolve, reject) => {
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve({
              url: response.secure_url,
              public_id: response.public_id,
              thumbnail: response.secure_url.replace('/upload/', '/upload/w_400,h_300,c_pad,q_auto,f_jpg/')
            });
          } catch (parseError) {
            reject(new Error(`Failed to parse Cloudinary response: ${parseError.message}`));
          }
        } else {
          // Try to parse error response
          let errorMessage = `Upload failed: ${xhr.statusText}`;
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            errorMessage = errorResponse.error?.message || errorResponse.message || errorMessage;
          } catch (e) {
            // If response isn't JSON, use status text
          }
          reject(new Error(errorMessage));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed: Network error'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload was aborted'));
      });
    });

    const cloudName = uploadParams?.cloud_name || config.cloudName;
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/video/upload`);
    xhr.send(formData);

    return await uploadPromise;
  } catch (error) {
    console.error('Error uploading video to Cloudinary:', error);
    throw error;
  }
};

/**
 * Upload image directly to Cloudinary
 * @param {File} file - Image file to upload
 * @param {string} folder - Cloudinary folder (optional)
 * @param {Function} onProgress - Progress callback (optional)
 * @returns {Promise<{url: string, public_id: string}>}
 */
export const uploadImageToCloudinary = async (file, folder = 'project-thumbnails', onProgress = null) => {
  const config = await getCloudinaryConfig();
  
  if (!config.cloudName) {
    throw new Error('Cloudinary cloud name is not configured. Please set VITE_CLOUDINARY_CLOUD_NAME in your .env file or configure it on the backend.');
  }

  // Get signed upload parameters from backend
  let uploadParams;
  try {
    const sigResponse = await fetch(`${API_BASE_URL}/cloudinary-signature`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        folder: folder,
        resource_type: 'image'
      })
    });
    
    if (sigResponse.ok) {
      const sigData = await sigResponse.json();
      uploadParams = sigData;
    }
  } catch (error) {
    console.warn('Failed to get signed upload params, trying unsigned:', error);
  }

  const formData = new FormData();
  formData.append('file', file);
  
  if (uploadParams && uploadParams.signature) {
    // Use signed upload (no preset needed)
    // IMPORTANT: Parameters in signature must match what we send
    // Note: resource_type is NOT in signature but MUST be in upload request
    formData.append('api_key', uploadParams.api_key);
    formData.append('timestamp', uploadParams.timestamp);
    formData.append('signature', uploadParams.signature);
    
    // Only append folder if it was in the signature (not empty)
    if (uploadParams.folder && uploadParams.folder.trim()) {
      formData.append('folder', uploadParams.folder.trim());
    }
    
    // ALWAYS append resource_type - it's required for upload but NOT in signature
    // Cloudinary excludes resource_type from signature generation
    if (uploadParams.resource_type && uploadParams.resource_type !== 'auto') {
      formData.append('resource_type', uploadParams.resource_type);
    }
  } else {
    // Fallback to unsigned upload with preset
    formData.append('upload_preset', config.uploadPreset || 'unsigned_image');
    formData.append('folder', folder);
    formData.append('resource_type', 'image');
  }

  try {
    const xhr = new XMLHttpRequest();

    // Set up progress tracking
    if (onProgress) {
      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percentComplete = (e.loaded / e.total) * 100;
          onProgress(percentComplete);
        }
      });
    }

    const uploadPromise = new Promise((resolve, reject) => {
      xhr.addEventListener('load', () => {
        if (xhr.status === 200) {
          try {
            const response = JSON.parse(xhr.responseText);
            resolve({
              url: response.secure_url,
              public_id: response.public_id
            });
          } catch (parseError) {
            reject(new Error(`Failed to parse Cloudinary response: ${parseError.message}`));
          }
        } else {
          // Try to parse error response
          let errorMessage = `Upload failed: ${xhr.statusText}`;
          try {
            const errorResponse = JSON.parse(xhr.responseText);
            errorMessage = errorResponse.error?.message || errorResponse.message || errorMessage;
          } catch (e) {
            // If response isn't JSON, use status text
          }
          reject(new Error(errorMessage));
        }
      });

      xhr.addEventListener('error', () => {
        reject(new Error('Upload failed: Network error'));
      });

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload was aborted'));
      });
    });

    const cloudName = uploadParams?.cloud_name || config.cloudName;
    xhr.open('POST', `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`);
    xhr.send(formData);

    return await uploadPromise;
  } catch (error) {
    console.error('Error uploading image to Cloudinary:', error);
    throw error;
  }
};

