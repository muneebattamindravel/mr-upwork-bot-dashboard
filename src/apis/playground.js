import axios from './axios';

export const playgroundQuery = (data) => axios.post('/playground/query', data);
export const getPlaygroundProfiles = () => axios.get('/playground/profiles');
