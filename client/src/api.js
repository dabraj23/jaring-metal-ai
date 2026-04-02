import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:3001/api'
});

// Add JWT token to all requests
api.interceptors.request.use(config => {
  const token = localStorage.getItem('jm_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 - redirect to login
api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('jm_token');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// Auth
export const login = (email, password) => api.post('/auth/login', { email, password });
export const getMe = () => api.get('/auth/me');

// Quotations
export const getQuotations = (params) => api.get('/quotations', { params });
export const createQuotation = (data) => api.post('/quotations', data);
export const getQuotation = (id) => api.get(`/quotations/${id}`);
export const updateQuotation = (id, data) => api.patch(`/quotations/${id}`, data);

// Documents
export const uploadDocument = (id, formData) => api.post(`/quotations/${id}/documents`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
export const getDocuments = (id) => api.get(`/quotations/${id}/documents`);
export const extractData = (id) => api.post(`/quotations/${id}/extract`);
export const getExtracted = (id) => api.get(`/quotations/${id}/extracted`);
export const updateExtractedField = (id, fieldId, data) => api.patch(`/quotations/${id}/extracted/${fieldId}`, data);

// Category & Pricing
export const getCategories = () => api.get('/categories');
export const confirmCategory = (id, categoryId) => api.post(`/quotations/${id}/category`, { category_id: categoryId });
export const calculatePricing = (id, data) => api.post(`/quotations/${id}/calculate`, data);
export const getBreakdown = (id) => api.get(`/quotations/${id}/breakdown`);

// Market Data
export const getMarketData = () => api.get('/market-data');
export const fetchMarketData = () => api.post('/market-data/fetch');
export const overrideMarketData = (data) => api.post('/market-data/override', data);

// Workflow
export const submitForApproval = (id) => api.post(`/quotations/${id}/submit`);
export const approveQuotation = (id, data) => api.post(`/quotations/${id}/approve`, data);
export const rejectQuotation = (id, data) => api.post(`/quotations/${id}/reject`, data);
export const releaseQuotation = (id) => api.post(`/quotations/${id}/release`);
export const generateOutput = (id) => api.post(`/quotations/${id}/generate`);

// Audit
export const getAuditTrail = (id) => api.get(`/quotations/${id}/audit`);
export const getGlobalAudit = (params) => api.get('/audit', { params });

// Reports
export const getReportsSummary = () => api.get('/reports/summary');

// Admin
export const getAdminCategories = () => api.get('/admin/categories');
export const createCategory = (data) => api.post('/admin/categories', data);
export const updateCategory = (id, data) => api.put(`/admin/categories/${id}`, data);
export const getAdminFormulas = () => api.get('/admin/formulas');
export const createFormula = (data) => api.post('/admin/formulas', data);
export const getAdminBenchmarks = () => api.get('/admin/benchmarks');
export const updateBenchmark = (id, data) => api.put(`/admin/benchmarks/${id}`, data);
export const getAdminUsers = () => api.get('/admin/users');
export const createUser = (data) => api.post('/admin/users', data);
export const updateUser = (id, data) => api.put(`/admin/users/${id}`, data);
export const getCustomers = () => api.get('/customers');

export default api;
