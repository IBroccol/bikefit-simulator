import client from './client';

export const authApi = {
  login: async (credentials) => {
    const res = await client.post('/auth/login', credentials);
    return res.data;
  },

  register: async (data) => {
    const res = await client.post('/auth/register', data);
    return res.data;
  },

  logout: async () => {
    const res = await client.post('/auth/logout');
    return res.data;
  },

  me: async () => {
    const res = await client.get('/auth/me');
    return res.data;
  },
};

export default authApi;
