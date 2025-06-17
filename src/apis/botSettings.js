// src/apis/botSettings.js

import axios from './axios';

// GET bot settings for a specific botId
export const getBotSettings = async (botId) => {
  const res = await axios.get(`/bot-settings/${botId}`);
  return res.data.data;
};

// POST (create/update) bot settings for a specific botId
export const updateBotSettings = async (botId, data) => {
  const res = await axios.post(`/bot-settings/${botId}`, data);
  return res.data.data;
};
