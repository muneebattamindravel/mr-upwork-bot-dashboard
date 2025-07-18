// src/apis/jobs.js
import axios from './axios';

/**
 * Fetch filtered jobs based on provided filters
 * @param {Object} filters
 */
export const getFilteredJobs = (filters) =>
  axios.get('/jobs', { params: filters });

export const reprocessJobsStaticOnly = async () => {
  return await axios.post('/jobs/reprocess-all-static-only');
};

export const reprocessSingleJob = async (jobId) => {
  return await axios.post(`/jobs/reprocess/${jobId}`);
};

export const getTotalJobs = async () => {
  const response = await axios.get('/api/jobs/total');
  return response.data.total;
};

export const generateProposal = async (jobId, type) => {
  const res = await axios.post(`/jobs/generate-proposal/${jobId}`, { type });
  return res.data.data.proposal;
};

export const deleteAllJobs = async () => {
  return await axios.delete('/jobs');
};