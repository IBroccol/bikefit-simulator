import client from './client';

// Flask fits endpoints return { success: true, data: ... } wrappers.
// These helpers unwrap .data automatically where applicable.

export const fitsApi = {
  saveFit: async (data) => {
    const res = await client.post('/fits/save', data);
    return res.data;
  },

  getFit: async (fitName, sizeId) => {
    const res = await client.post('/fits/get', { fit_name: fitName, size_id: sizeId });
    return res.data.data ?? res.data;
  },

  listFits: async (sizeId) => {
    const res = await client.post('/fits/list', { size_id: sizeId });
    return res.data.data ?? res.data;
  },

  getBasicFit: async (sizeId) => {
    const res = await client.post('/fits/basic', { size_id: sizeId });
    return res.data.data ?? res.data;
  },

  deleteFit: async (fitName, sizeId) => {
    const res = await client.post('/fits/delete', { fit_name: fitName, size_id: sizeId });
    return res.data;
  },

  addAnthropometry: async (data) => {
    const res = await client.post('/fits/add_anthropometry', data);
    return res.data;
  },

  getAnthropometry: async () => {
    const res = await client.get('/fits/get_anthropometry');
    // Returns { success: true, data: { height, hip, ... } } or 404
    return res.data.data ?? res.data;
  },
};

export default fitsApi;
