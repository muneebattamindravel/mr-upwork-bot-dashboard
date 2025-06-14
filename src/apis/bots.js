import axios from './axios';

export const getBots = async () => {
  const res = await axios.get('/bots/list');
  return res.data.data;
};

export const getBotsSummary = async () => {
  const response = await axios.get('/bots/summary'); // No headers needed
  return response.data;
};

export const startBotRemote = async (agentUrl) => {
  const res = await axios.post(`${agentUrl}/start-bot`);
  return res.data;
};

export const stopBotRemote = async (agentUrl) => {
  const res = await axios.post(`${agentUrl}/stop-bot`);
  return res.data;
};

export const checkBotStatus = async (agentUrl) => {
  const res = await axios.get(`${agentUrl}/status`);
  return res.data;
};