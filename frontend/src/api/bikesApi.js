import client from './client';

// All Flask bike endpoints return { success: true, data: ... }
// These helpers unwrap the .data field automatically.

export const bikesApi = {
  getVisibleBikes: async () => {
    const res = await client.get('/bikes/list');
    return res.data.data ?? res.data;
  },

  getUserBikes: async () => {
    const res = await client.get('/bikes/user_bikes');
    return res.data.data ?? res.data;
  },

  addBike: async (data) => {
    const res = await client.post('/bikes/add', data);
    return res.data;
  },

  deleteBike: async (bikeId) => {
    const res = await client.post('/bikes/delete', { bike_id: bikeId });
    return res.data;
  },

  setBikePending: async (bikeId) => {
    const res = await client.post('/bikes/set_pending', { bike_id: bikeId });
    return res.data;
  },

  getSizes: async (bikeModelId) => {
    const res = await client.post('/bikes/sizes', { bike_model_id: bikeModelId });
    return res.data.data ?? res.data;
  },

  getGeometry: async (sizeId) => {
    const res = await client.post('/bikes/geometry', { size_id: sizeId });
    return res.data.data ?? res.data;
  },

  getBikeSizeId: async (bikeModel, size) => {
    const res = await client.post('/bikes/id', { bike_model: bikeModel, size });
    return res.data.data ?? res.data;
  },

  getPendingBikes: async () => {
    const res = await client.get('/bikes/pending');
    return res.data.data ?? res.data;
  },

  setVisibility: async (bikeId, isPublic) => {
    const res = await client.post('/bikes/set_visibility', { bike_id: bikeId, is_public: isPublic });
    return res.data;
  },

  parseUrl: async (url) => {
    const res = await client.post('/bikes/parse_url', { url });
    return res.data;
  },
};

export default bikesApi;
