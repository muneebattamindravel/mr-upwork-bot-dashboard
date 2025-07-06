import axios from './axios';

export const getKBList = () => axios.get('/kb/list');
export const getProfile = (id) => axios.get('/kb/${id}');
export const createProfile = (data) => axios.post('/kb', data);
export const updateProfile = (id, data) => axios.patch('/kb/${id}', data);
export const deleteProfile = (id) => axios.delete('/kb/${id}');
export const toggleProfileEnabled = (id, enabled) =>
  axios.post('/kb/${id}/toggle-enabled', { enabled });
