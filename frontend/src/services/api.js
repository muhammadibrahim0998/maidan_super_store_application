import axios from 'axios';

// In development, use Vite proxy (empty string = same origin via Vite dev server proxy)
// In production (Vercel), also use '' to force traffic through vercel.json rewrites.
// Both cases: cookies work correctly because requests are same-origin.
const API_BASE = '';

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  withCredentials: true, // Required for cookies
});

// Request interceptor for debugging
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('nexflow_token') || sessionStorage.getItem('nexflow_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  const savedUser = localStorage.getItem('nexflow_user') || sessionStorage.getItem('nexflow_user');
  if (savedUser) {
    try {
      const parsedUser = JSON.parse(savedUser);
      if (parsedUser?.role) {
        config.headers['x-user-role'] = parsedUser.role;
      }
    } catch (e) {}
  }
  console.log(`[Request] ${config.method.toUpperCase()} ${config.url}`);
  return config;
}, (error) => {
  return Promise.reject(error);
});

// Response interceptor for centralized error logging
api.interceptors.response.use((response) => {
  return response;
}, (error) => {
  const url = error.config?.url || '';
  const status = error.response?.status;
  // Suppress expected 401 on session check — not a real error
  const isSilent = status === 401 && url.includes('/auth/me');
  if (!isSilent) {
    const message = error.response?.data?.message || error.message;
    console.error(`[API Error ${status}]:`, message);
  }
  return Promise.reject(error);
});

// --- AUTH API ---
export const login = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  return response.data;
};

export const logout = async () => {
  const response = await api.post('/auth/logout');
  return response.data;
};

export const getMe = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

// --- ITEMS API ---
export const getItems = async () => {
  const response = await api.get('/items');
  return response.data;
};

export const getItem = async (id) => {
  const response = await api.get(`/items/${id}`);
  return response.data;
};

export const createItem = async (itemData) => {
  const response = await api.post('/items', itemData);
  return response.data;
};

export const updateItem = async (id, itemData, password, role) => {
  if (!id || id === 'undefined' || id === 'null') {
    throw new Error('Valid Product ID is required to update product');
  }
  const response = await api.put(`/items/${id}`, itemData, {
    headers: { 
      'x-owner-password': password,
      'x-user-role': role
    }
  });
  return response.data;
};

export const deleteItem = async (id, password, role) => {
  if (!id || id === 'undefined' || id === 'null') {
    throw new Error('Valid Product ID is required to delete product');
  }
  const response = await api.delete(`/items/${id}`, {
    headers: { 
      'x-owner-password': password,
      'x-user-role': role
    }
  });
  return response.data;
};export const settleSupplierCredit = async (id, paymentData) => {
  const method = String(paymentData.paymentMethod || 'Cash').toUpperCase();
  const endpoint = (method === 'BANK' || method === 'BANK_TRANSFER' || method === 'ONLINE')
    ? `/items/${id}/settle-bank`
    : `/items/${id}/settle-cash`;
  const response = await api.patch(endpoint, paymentData);
  return response.data;
};

export const settleSupplierCash = async (id, paymentData) => {
  const response = await api.patch(`/items/${id}/settle-cash`, paymentData);
  return response.data;
};

export const settleSupplierBank = async (id, paymentData) => {
  const response = await api.patch(`/items/${id}/settle-bank`, paymentData);
  return response.data;
};

// --- UPLOAD API ---
export const uploadImages = async (files) => {
  const formData = new FormData();
  for (const file of files) {
    formData.append('images', file);
  }
  
  const response = await api.post('/upload', formData);
  return response.data.images; 
};

// --- SALES API ---
export const getSales = async (shopId) => {
  const response = await api.get('/sales', { params: shopId ? { shopId } : {} });
  return response.data;
};

export const createSale = async (saleData) => {
  const method = String(saleData.paymentMethod || 'CASH').toUpperCase();
  let endpoint = '/sales';
  if (method === 'CASH') endpoint = '/sales/cash';
  else if (method === 'BANK_TRANSFER' || method === 'BANK' || method === 'ONLINE' || method === 'EASYPAISA') endpoint = '/sales/bank';
  else if (method === 'CREDIT' || method === 'DUE') endpoint = '/sales/credit';

  const response = await api.post(endpoint, saleData);
  return response.data;
};

export const createCashSale = async (saleData) => {
  const response = await api.post('/sales/cash', saleData);
  return response.data;
};

export const createBankSale = async (saleData) => {
  const response = await api.post('/sales/bank', saleData);
  return response.data;
};

export const createCreditSale = async (saleData) => {
  const response = await api.post('/sales/credit', saleData);
  return response.data;
};

export const getSalesBreakdown = async (shopId) => {
  const response = await api.get(`/sales/breakdown${shopId ? `/${shopId}` : ''}`);
  return response.data;
};

export const getSalesByType = async (type, shopId) => {
  const response = await api.get(`/sales/by-type/${type}`, { params: shopId ? { shopId } : {} });
  return response.data;
};

export const updateSale = async (id, saleData, password, role) => {
  const response = await api.put(`/sales/${id}`, saleData, {
    headers: { 
      'x-owner-password': password,
      'x-user-role': role
    }
  });
  return response.data;
};

export const deleteSale = async (id, password, role) => {
  const response = await api.delete(`/sales/${id}`, {
    headers: { 
      'x-owner-password': password,
      'x-user-role': role
    }
  });
  return response.data;
};

export const returnSale = async (id, returnData, password, role) => {
  const response = await api.put(`/sales/${id}/return`, returnData, {
    headers: { 
      'x-owner-password': password,
      'x-user-role': role
    }
  });
  return response.data;
};

export const settleCreditViaCash = async (id, data) => {
  const response = await api.patch(`/sales/${id}/settle-cash`, data);
  return response.data;
};

export const settleCreditViaBank = async (id, data) => {
  const response = await api.patch(`/sales/${id}/settle-bank`, data);
  return response.data;
};

export const settleCreditSale = async (id, paymentData) => {
  const method = String(paymentData.paymentMethod || 'CASH').toUpperCase();
  const endpoint = (method === 'BANK' || method === 'BANK_TRANSFER' || method === 'ONLINE')
    ? `/sales/${id}/settle-bank`
    : `/sales/${id}/settle-cash`;
  const response = await api.patch(endpoint, paymentData);
  return response.data;
};

// --- USER MANAGEMENT API ---
export const getUsers = async (role) => {
  const response = await api.get('/users', {
    headers: { 'x-user-role': role }
  });
  return response.data;
};

export const createUser = async (userData, role) => {
  const response = await api.post('/users', userData, {
    headers: { 'x-user-role': role }
  });
  return response.data;
};

export const updateUser = async (id, userData, role) => {
  const response = await api.put(`/users/${id}`, userData, {
    headers: { 'x-user-role': role }
  });
  return response.data;
};

export const deleteUser = async (id, role) => {
  const response = await api.delete(`/users/${id}`, {
    headers: { 'x-user-role': role }
  });
  return response.data;
};

export const getSystemUpdates = async () => {
  const response = await api.get('/updates');
  return response.data;
};

// --- ORDERS API (Shop Admin / Super Admin) ---
export const getShopOrders = async (params = {}) => {
  const response = await api.get('/checkout/orders', { params });
  return response.data;
};

export const getOrderById = async (orderId) => {
  const response = await api.get(`/checkout/order/${orderId}`);
  return response.data;
};

export const updateOrderStatus = async (orderId, { paymentStatus, orderStatus }) => {
  const response = await api.patch(`/checkout/order/${orderId}/status`, { paymentStatus, orderStatus });
  return response.data;
};

export const deleteOrder = async (orderId) => {
  const response = await api.delete(`/checkout/order/${orderId}`);
  return response.data;
};

export const deleteOrderProof = async (orderId) => {
  const response = await api.delete(`/checkout/order/${orderId}/proof`);
  return response.data;
};

// --- CUSTOMER CREDITS API ---
export const getCustomerCredits = async (shopId = 1, params = {}) => {
  const response = await api.get(`/customer-credits/shop/${shopId}`, { params });
  return response.data;
};

export const getCustomerCreditById = async (id) => {
  const response = await api.get(`/customer-credits/${id}`);
  return response.data;
};

export const createCustomerCredit = async (creditData) => {
  const response = await api.post('/customer-credits', creditData);
  return response.data;
};

export const recordCustomerCreditPayment = async (id, paymentData) => {
  const response = await api.post(`/customer-credits/${id}/payment`, paymentData);
  return response.data;
};

export const syncCustomerCredits = async (shopId = 1) => {
  const response = await api.post(`/customer-credits/sync/${shopId}`);
  return response.data;
};

export const deleteCustomerCredit = async (id) => {
  const response = await api.delete(`/customer-credits/${id}`);
  return response.data;
};

// --- PURCHASE CREDITS API ---
export const getPurchaseCredits = async (shopId = 1, params = {}) => {
  const response = await api.get(`/purchase-credits/shop/${shopId}`, { params });
  return response.data;
};

export const getPurchaseCreditById = async (id) => {
  const response = await api.get(`/purchase-credits/${id}`);
  return response.data;
};

export const createPurchaseCredit = async (creditData) => {
  const response = await api.post('/purchase-credits', creditData);
  return response.data;
};

export const recordPurchaseCreditPayment = async (id, paymentData) => {
  const response = await api.post(`/purchase-credits/${id}/payment`, paymentData);
  return response.data;
};

export const syncPurchaseCredits = async (shopId = 1) => {
  const response = await api.post(`/purchase-credits/sync/${shopId}`);
  return response.data;
};

export const deletePurchaseCredit = async (id) => {
  const response = await api.delete(`/purchase-credits/${id}`);
  return response.data;
};

export default api;