import axios from './axios';

// ✅ GET bot settings (calls: GET /bots/settings/:botId)
export const getBotSettings = async (botId) => {
  const res = await axios.get(`/bots/settings/${botId}`);
  return res.data.data; // this matches your `respond` wrapper
};

// ✅ UPDATE bot settings + agentUrl (calls: PATCH /bots/settings/:botId)
export const updateBotSettings = async (botId, data) => {
  const res = await axios.patch(`/bots/settings/${botId}`, data);
  return res.data.data;
};
