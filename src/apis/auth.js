import axios from './axios';

export const getMe = () => axios.get('/auth/me');

export const logout = () => axios.post('/auth/logout');

export const registerUser = (data) => axios.post('/auth/register', data);

// User management (superAdmin only)
export const listUsers          = ()               => axios.get('/auth/users');
export const deleteUser         = (id)             => axios.delete(`/auth/users/${id}`);
export const updateUserRole     = (id, role)       => axios.patch(`/auth/users/${id}/role`, { role });
export const toggleUserActive   = (id)             => axios.patch(`/auth/users/${id}/toggle-active`);
export const updateUserPassword = (id, password)   => axios.patch(`/auth/users/${id}/password`, { password });
