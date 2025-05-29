// src/api/kb.js
import axios from './axios';

/**
 * Get list of all KB profiles
 */
export const getKBList = () => axios.get('/kb/list');

/**
 * Load file content for a given profile
 * @param {string} profile
 * @param {string} fileType
 */
export const loadFile = (profile, fileType) =>
  axios.get(`/kb/get/${profile}/${fileType}`);

/**
 * Save content to a file for a profile
 * @param {string} profile
 * @param {string} fileType
 * @param {string} content
 */
export const saveFile = (profile, fileType, content) =>
  axios.post(`/kb/save/${profile}/${fileType}`, { content });

/**
 * Create a new profile (folder with 2 files)
 * @param {{ profileName: string }} payload
 */
export const createProfile = (payload) =>
  axios.post('/kb/create-profile', payload);

/**
 * Delete an entire profile
 * @param {{ profileName: string }} payload
 */
export const deleteProfile = (payload) =>
  axios.post('/kb/delete-profile', payload);

/**
 * Reload the entire knowledge base (for future use)
 */
export const reloadKnowledgeBase = () =>
  axios.post('/kb/reload');
