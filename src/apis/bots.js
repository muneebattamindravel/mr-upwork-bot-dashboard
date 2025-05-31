import axios from './axios';

export const getBots = async () => {
  const res = await axios.get('/bots/list');
  return res.data.data;
};