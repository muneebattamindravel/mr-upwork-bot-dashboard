import axios from './axios';

export const getSraaSettings = () => axios.get('/sraa-settings');
export const updateSraaSettings = (data) => axios.put('/sraa-settings', data);
