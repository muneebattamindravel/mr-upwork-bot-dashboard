import axios from './axios';

export const getAnalyticsSummary       = ()                    => axios.get('/analytics/summary');
export const getJobsOverTime           = (days = 30)           => axios.get('/analytics/jobs-over-time',     { params: { days } });
export const getScoreDistribution      = ()                    => axios.get('/analytics/score-distribution');
export const getTopCountries           = (limit = 10)          => axios.get('/analytics/top-countries',      { params: { limit } });
export const getTopCategories          = (limit = 10)          => axios.get('/analytics/top-categories',     { params: { limit } });
export const getProfileBreakdown       = ()                    => axios.get('/analytics/profile-breakdown');
export const getPricingSplit           = ()                    => axios.get('/analytics/pricing-split');
export const getEmergingKeywords       = (days = 7, limit = 20) => axios.get('/analytics/emerging-keywords', { params: { days, limit } });
export const getPostingHeatmap         = (days = 30)           => axios.get('/analytics/posting-heatmap',    { params: { days } });
export const getHourlyDistribution     = (days = 30)           => axios.get('/analytics/hourly-distribution',{ params: { days } });
export const getSemanticVerdictBreakdown = ()                  => axios.get('/analytics/semantic-verdict');
export const getBudgetDistribution     = ()                    => axios.get('/analytics/budget-distribution');
export const getExperienceBreakdown    = ()                    => axios.get('/analytics/experience-breakdown');
