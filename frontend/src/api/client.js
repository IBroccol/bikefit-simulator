import axios from 'axios';

const client = axios.create({
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

client.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Don't redirect for auth endpoints — 401 there is an expected response
      // (wrong credentials or unauthenticated check), not a session expiry.
      const url = err.config?.url || '';
      const isAuthEndpoint = url.includes('/auth/');
      if (!isAuthEndpoint) {
        window.location.href = '/';
      }
    }
    return Promise.reject(err);
  }
);

export default client;
