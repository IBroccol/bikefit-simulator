import axios from 'axios';

const client = axios.create({
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Auth endpoints return 401 for wrong credentials — don't redirect there.
      const url = err.config?.url || '';
      if (!url.includes('/auth/')) {
        window.location.href = '/';
      }
    }
    return Promise.reject(err);
  }
);

export default client;
