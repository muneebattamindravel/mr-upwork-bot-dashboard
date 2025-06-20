import axios from './axios';

export const getBots = async () => {
  const res = await axios.get('/bots/list');
  return res.data.data;
};

export const getBotsSummary = async () => {
  const response = await axios.get('/bots/summary');
  return response.data;
};

export const startBotRemote = async (botId) => {
  const res = await axios.post(`/bots/${botId}/start`);
  return res.data;
};

export const stopBotRemote = async (botId) => {
  const res = await axios.post(`/bots/${botId}/stop`);
  return res.data;
};

export const checkBotStatus = async (botId) => {
  const res = await axios.get(`/bots/${botId}/status`, {
    timeout: 5000,
  });

  return res.data.data.status;
};