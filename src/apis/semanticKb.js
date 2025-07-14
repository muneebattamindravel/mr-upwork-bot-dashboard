import axios from './axios';

const api = {
  getProfiles: () => axios.get('/kb/list'),
  listProjects: (profileId) => axios.get(`/projects/list?profileId=${profileId}`),
  createProject: (data) => axios.post('/projects/create', data),
  rewriteProject: (projectId) => axios.post('/projects/rewrite', { projectId }),
  approveProject: (projectId) => axios.post('/projects/approve', { projectId }),
  updateProject: (data) => axios.patch('/projects/update', data),
  deleteProject: (projectId) => axios.delete('/projects/delete', { data: { projectId } }),
  generateKB: (profileId) => axios.post('/semantic-knowledge-base/generate-semantic-md', { profileId }),
  generatePortfolio: (profileId) => axios.post('/semantic-knowledge-base/generate-portfolio', { profileId }),
  saveAssistantId: (profileId, assistantId) => axios.post('/semantic-knowledge-base/save-assistant-id', { profileId, assistantId }),
};

export default api;
