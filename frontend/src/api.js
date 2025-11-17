import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

export const api = {
  // Filters
  getGrades: () => axios.get(`${API_URL}/grades`),
  getSubjects: () => axios.get(`${API_URL}/subjects`),
  getCategories: () => axios.get(`${API_URL}/categories`),
  
  // Products
  getProducts: (params) => axios.get(`${API_URL}/products`, { params }),
  getProduct: (id) => axios.get(`${API_URL}/products/${id}`),
  createProduct: (data) => axios.post(`${API_URL}/products`, data),
  updateProduct: (id, data) => axios.put(`${API_URL}/products/${id}`, data),
  
  // Checkout
  mpesaCheckout: (data) => axios.post(`${API_URL}/checkout/mpesa`, data),
  
  // Orders
  getOrders: () => axios.get(`${API_URL}/orders`),
};