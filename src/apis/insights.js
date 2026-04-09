import axios from './axios';

export const getInsightCategories  = ()           => axios.get('/insights/categories');
export const generateInsightReport = (category, sampleSize = 500) =>
  axios.post(`/insights/generate/${encodeURIComponent(category)}`, { sampleSize });
export const getInsightStatus      = (category)   => axios.get(`/insights/status/${encodeURIComponent(category)}`);
export const getInsightReport      = (category)   => axios.get(`/insights/report/${encodeURIComponent(category)}`);
