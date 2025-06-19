// src/apis/jobs.js
import axios from './axios';

/**
 * Fetch filtered jobs based on provided filters
 * @param {Object} filters
 */
export const getFilteredJobs = (filters) =>
  axios.get('/jobs', { params: filters });

export const reprocessJobs = async () => {
  return await axios.post('/jobs/reprocess');
};

export const getTotalJobs = async () => {
  const response = await axios.get('/api/jobs/total');
  return response.data.total;
};

export const deleteAllJobs = async () => {
  return await axios.delete('/jobs');
};