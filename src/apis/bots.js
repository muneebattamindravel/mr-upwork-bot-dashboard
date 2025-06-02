import axios from './axios';

export const getBots = async () => {
  const res = await axios.get('/bots/list');
  return res.data.data;
};

export const getBotsSummary = async () => {
  const response = await axios.get('/bots/summary'); // No headers needed
  return response.data;
};