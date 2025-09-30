import axios from 'axios';

// Prefer environment variable (Vercel) and fall back to same-host dev pattern
const API_BASE =
  process.env.REACT_APP_API_URL ||
  (typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:8000`
    : 'http://localhost:8000');

// Projects API
export const getProjects = async () => {
  try {
    const response = await axios.get(`${API_BASE}/projects/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching projects:', error);
    throw error;
  }
};

export const createProject = async (projectData) => {
  try {
    const response = await axios.post(`${API_BASE}/projects/`, projectData);
    return response.data;
  } catch (error) {
    console.error('Error creating project:', error);
    throw error;
  }
};

export const updateProject = async (projectId, projectData) => {
  try {
    const response = await axios.patch(`${API_BASE}/projects/${projectId}/`, projectData);
    return response.data;
  } catch (error) {
    console.error('Error updating project:', error);
    throw error;
  }
};

export const deleteProject = async (projectId) => {
  try {
    const response = await axios.delete(`${API_BASE}/projects/${projectId}/`);
    return response.data;
  } catch (error) {
    console.error('Error deleting project:', error);
    throw error;
  }
};

// Safety Functions API
export const getSafetyFunctions = async (projectId) => {
  try {
    const response = await axios.get(`${API_BASE}/safety-functions/?project=${projectId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching safety functions:', error);
    throw error;
  }
};

export const createSafetyFunction = async (safetyFunctionData) => {
  try {
    const response = await axios.post(`${API_BASE}/safety-functions/`, safetyFunctionData);
    return response.data;
  } catch (error) {
    console.error('Error creating safety function:', error);
    throw error;
  }
};

export const updateSafetyFunction = async (safetyFunctionId, safetyFunctionData) => {
  try {
    const response = await axios.patch(`${API_BASE}/safety-functions/${safetyFunctionId}/`, safetyFunctionData);
    return response.data;
  } catch (error) {
    console.error('Error updating safety function:', error);
    throw error;
  }
};

export const deleteSafetyFunction = async (safetyFunctionId) => {
  try {
    const response = await axios.delete(`${API_BASE}/safety-functions/${safetyFunctionId}/`);
    return response.data;
  } catch (error) {
    console.error('Error deleting safety function:', error);
    throw error;
  }
};

// Components API
export const getComponents = async (projectId) => {
  try {
    const response = await axios.get(`${API_BASE}/components/?project=${projectId}`);
    return response.data;
  } catch (error) {
    console.error('Error fetching components:', error);
    throw error;
  }
};

export const createComponent = async (componentData) => {
  try {
    const response = await axios.post(`${API_BASE}/components/`, componentData);
    return response.data;
  } catch (error) {
    console.error('Error creating component:', error);
    throw error;
  }
};

export const updateComponent = async (componentId, componentData) => {
  try {
    const response = await axios.patch(`${API_BASE}/components/${componentId}/`, componentData);
    return response.data;
  } catch (error) {
    console.error('Error updating component:', error);
    throw error;
  }
};

export const deleteComponent = async (componentId) => {
  try {
    const response = await axios.delete(`${API_BASE}/components/${componentId}/`);
    return response.data;
  } catch (error) {
    console.error('Error deleting component:', error);
    throw error;
  }
};

// Failure Modes API
export const getFailureModes = async (componentId) => {
  try {
    const response = await axios.get(`${API_BASE}/failure-modes/by-component/${componentId}/`);
    return response.data;
  } catch (error) {
    console.error('Error fetching failure modes:', error);
    throw error;
  }
};

export const createFailureMode = async (failureModeData) => {
  try {
    const response = await axios.post(`${API_BASE}/failure-modes/`, failureModeData);
    return response.data;
  } catch (error) {
    console.error('Error creating failure mode:', error);
    throw error;
  }
};

export const updateFailureMode = async (failureModeId, failureModeData) => {
  try {
    const response = await axios.patch(`${API_BASE}/failure-modes/${failureModeId}/`, failureModeData);
    return response.data;
  } catch (error) {
    console.error('Error updating failure mode:', error);
    throw error;
  }
};

export const deleteFailureMode = async (failureModeId) => {
  try {
    const response = await axios.delete(`${API_BASE}/failure-modes/${failureModeId}/`);
    return response.data;
  } catch (error) {
    console.error('Error deleting failure mode:', error);
    throw error;
  }
};

// FMEDA Analysis API
export const calculateFMEDA = async (projectId) => {
  try {
    const response = await axios.post(`${API_BASE}/fmeda/calculate/`, {
      project: projectId
    });
    return response.data;
  } catch (error) {
    console.error('Error calculating FMEDA:', error);
    throw error;
  }
};

export const getProjectResults = async (projectId) => {
  try {
    const response = await axios.get(`${API_BASE}/fmeda/results/${projectId}/`);
    return response.data;
  } catch (error) {
    console.error('Error getting project results:', error);
    throw error;
  }
};

// CSV Import/Export API
export const importProject = async (formData) => {
  try {
    const response = await axios.post(`${API_BASE}/projects/import-csv/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  } catch (error) {
    console.error('Error importing project:', error);
    throw error;
  }
};

// Export project to CSV
export const exportProject = async (project) => {
  try {
    const response = await axios.get(`${API_BASE}/projects/${project.id}/export-csv/`, {
      responseType: 'blob'
    });
    // Create and download the file
    const blob = new Blob([response.data], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    // Use project.name if available, fallback to id
    const safeName = (project.name || `project_${project.id}`).replace(/[^a-zA-Z0-9_-]/g, '_');
    a.href = url;
    a.download = `${safeName}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    return response.data;
  } catch (error) {
    throw error;
  }
};

// Clear all data
export const clearAllData = async () => {
  try {
    const response = await axios.get(`${API_BASE}/projects/clear-all/`);
    return response.data;
  } catch (error) {
    throw error;
  }
};
