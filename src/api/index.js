import axios from 'axios';
import { ElMessage } from 'element-plus';

// API基础URL，从环境变量获取或使用默认值
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

// 创建axios实例
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 请求拦截器 - 添加token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
}, error => {
  console.error('请求错误:', error);
  return Promise.reject(error);
});

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  response => response.data,
  error => {
    // 处理错误响应
    const errorMessage = error.response?.data?.message || '请求失败，请稍后重试';
    
    // 显示错误消息
    ElMessage.error(errorMessage);
    
    // 处理401未授权错误
    if (error.response && error.response.status === 401) {
      // 清除token并跳转到登录页
      localStorage.removeItem('token');
      localStorage.removeItem('userInfo');
      window.location.href = '/login';
    }
    
    return Promise.reject(error);
  }
);

// API模块
export default {
  // 认证相关
  auth: {
    login: (username, password) => api.post('/auth/login', { username, password }),
    logout: () => api.post('/auth/logout'),
    getProfile: () => api.get('/auth/profile'),
    changePassword: (currentPassword, newPassword) => api.put('/auth/change-password', { currentPassword, newPassword })
  },
  
  // 代理相关
  agents: {
    getAll: (params) => api.get('/agents', { params }),
    getById: (id) => api.get(`/agents/${id}`),
    create: (data) => api.post('/agents', data),
    update: (id, data) => api.put(`/agents/${id}`, data),
    delete: (id) => api.delete(`/agents/${id}`)
  },
  
  // 销售记录相关
  sales: {
    getAll: (params) => api.get('/sales', { params }),
    getById: (id) => api.get(`/sales/${id}`),
    create: (data) => api.post('/sales', data),
    update: (id, data) => api.put(`/sales/${id}`, data),
    delete: (id) => api.delete(`/sales/${id}`)
  },
  
  // 交易相关
  transactions: {
    getAll: (params) => api.get('/transactions', { params }),
    getById: (id) => api.get(`/transactions/${id}`),
    create: (data) => api.post('/transactions', data),
    update: (id, data) => api.put(`/transactions/${id}`, data),
    delete: (id) => api.delete(`/transactions/${id}`)
  },
  
  // 库存相关
  inventory: {
    getAll: (params) => api.get('/inventory', { params }),
    getById: (id) => api.get(`/inventory/${id}`),
    create: (data) => api.post('/inventory', data),
    update: (id, data) => api.put(`/inventory/${id}`, data),
    delete: (id) => api.delete(`/inventory/${id}`)
  },
  
  // 物流相关
  logistics: {
    getAll: (params) => api.get('/logistics', { params }),
    getById: (id) => api.get(`/logistics/${id}`),
    create: (data) => api.post('/logistics', data),
    update: (id, data) => api.put(`/logistics/${id}`, data),
    delete: (id) => api.delete(`/logistics/${id}`)
  }
};