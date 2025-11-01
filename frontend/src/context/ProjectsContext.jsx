import PropTypes from 'prop-types';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

const ProjectsContext = createContext();

// API base URL - defaults to localhost for development
// Set VITE_API_BASE_URL in .env file to override for production
// For local: VITE_API_BASE_URL=http://localhost:3000
// For production: VITE_API_BASE_URL=https://salimkhandev-portfolio-backend.vercel.app
// Helper to ensure HTTPS in production (auto-converts HTTP to HTTPS when frontend is HTTPS)
const ensureHttps = (url) => {
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('http://')) {
    return url.replace('http://', 'https://');
  }
  return url;
};

const BASE_URL = ensureHttps(import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000');
const API_BASE_URL = BASE_URL.endsWith('/api') ? BASE_URL : `${BASE_URL}/api`;

export const ProjectsProvider = ({ children }) => {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch projects from backend - memoized to prevent recreating on every render
  const fetchProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Try the main API endpoint
      let response;
      try {
        response = await fetch(`${API_BASE_URL}/projects`);
      } catch (fetchError) {
        // Handle connection errors (server not running, network issues)
        if (fetchError.message.includes('Failed to fetch') || fetchError.message.includes('Connection refused')) {
          const backendUrl = BASE_URL;
          throw new Error(
            `Cannot connect to backend server at ${backendUrl}. ` +
            `Please ensure the backend is running or check your VITE_API_BASE_URL environment variable.`
          );
        }
        throw fetchError;
      }
      
      // If 404, try without /api prefix (some deployments might not use it)
      if (!response.ok && response.status === 404) {
        const alternativeUrl = BASE_URL.endsWith('/api') 
          ? BASE_URL.replace('/api', '') 
          : BASE_URL;
        response = await fetch(`${alternativeUrl}/projects`);
      }
      
      if (!response.ok) {
        throw new Error(`Failed to fetch projects: ${response.status} ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.projects) {
        setProjects(data.projects);
      } else {
        throw new Error(data.message || 'Failed to fetch projects');
      }
    } catch (err) {
      console.error('Error fetching projects:', err);
      setError(err.message);
      // Set empty array on error so UI doesn't break
      setProjects([]);
    } finally {
      setLoading(false);
    }
  }, []); // Empty deps - API_BASE_URL and BASE_URL are constants

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Get single project by ID
  const getProjectById = async (id) => {
    try {
      const response = await fetch(`${API_BASE_URL}/projects/${id}`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch project: ${response.statusText}`);
      }
      
      const data = await response.json();
      
      if (data.success && data.project) {
        return data.project;
      } else {
        throw new Error(data.message || 'Project not found');
      }
    } catch (err) {
      console.error('Error fetching project:', err);
      throw err;
    }
  };

  // Refresh projects - memoized to prevent infinite loops
  const refreshProjects = useCallback(() => {
    fetchProjects();
  }, [fetchProjects]); // Depends on fetchProjects, which is now stable

  const value = {
    projects,
    loading,
    error,
    getProjectById,
    refreshProjects,
  };

  return (
    <ProjectsContext.Provider value={value}>
      {children}
    </ProjectsContext.Provider>
  );
};

ProjectsProvider.propTypes = {
  children: PropTypes.node.isRequired,
};

// Custom hook to use the projects context
export const useProjects = () => {
  const context = useContext(ProjectsContext);
  
  if (!context) {
    throw new Error('useProjects must be used within a ProjectsProvider');
  }
  
  return context;
};

export default ProjectsContext;

