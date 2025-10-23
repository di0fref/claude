import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5001/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add token to requests if it exists
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle authentication errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  getCurrentUser: () => api.get('/auth/me')
};

// Users API
export const usersAPI = {
  getAll: () => api.get('/users'),
  create: (userData) => api.post('/users', userData),
  update: (id, userData) => api.put(`/users/${id}`, userData),
  delete: (id) => api.delete(`/users/${id}`)
};

// Deliveries API
export const deliveriesAPI = {
  getAll: () => api.get('/deliveries'),
  getById: (id) => api.get(`/deliveries/${id}`),
  create: (deliveryData) => api.post('/deliveries', deliveryData),
  update: (id, deliveryData) => api.put(`/deliveries/${id}`, deliveryData),
  delete: (id) => api.delete(`/deliveries/${id}`)
};

// Bales API
export const balesAPI = {
  getAll: () => api.get('/bales'),
  getByDelivery: (deliveryId) => api.get(`/bales/delivery/${deliveryId}`),
  updateStatus: (id, statusData) => api.put(`/bales/${id}/status`, statusData),
  updateDates: (id, datesData) => api.put(`/bales/${id}/dates`, datesData),
  predictWarmDate: (id) => api.get(`/bales/${id}/predict-warm`),
  updateAllPredictions: () => api.post('/bales/update-all-predictions'),
  getSettings: () => api.get('/bales/settings'),
  updateSettings: (settings) => api.put('/bales/settings', settings)
};

export default api;
