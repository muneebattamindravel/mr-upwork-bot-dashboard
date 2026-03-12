import axios from './axios';

export const getAnalyticsSummary = () => axios.get('/analytics/summary');
export const getJobsOverTime = (days = 30) => axios.get('/analytics/jobs-over-time', { params: { days } });
export const getScoreDistribution = () => axios.get('/analytics/score-distribution');
export const getTopCountries = () => axios.get('/analytics/top-countries');
export const getTopCategories = () => axios.get('/analytics/top-categories');
export const getProfileBreakdown = () => axios.get('/analytics/profile-breakdown');
export const getPricingSplit = () => axios.get('/analytics/pricing-split');
export const getEmergingKeywords = (days = 7) => axios.get('/analytics/emerging-keywords', { params: { days } });
