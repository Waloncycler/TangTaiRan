import axios from 'axios';
import { ElMessage } from 'element-plus';

// API基础URL，从环境变量获取或使用默认值
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// 创建axios实例
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// 存储当前token
let currentToken = null;

// 设置认证令牌
const setAuthToken = (token) => {
  currentToken = token;
};

// 清除认证令牌
const clearAuthToken = () => {
  currentToken = null;
};

// 请求拦截器 - 添加token和时间戳
api.interceptors.request.use(config => {
  // 优先使用内存中的token，其次从sessionStorage获取
  const token = currentToken || sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // 添加时间戳参数，防止缓存
  const timestamp = new Date().getTime();
  
  // 处理GET请求，添加时间戳参数
  if (config.method === 'get') {
    config.params = {
      ...config.params,
      _t: timestamp
    };
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
  // 设置和清除认证令牌
  setAuthToken,
  clearAuthToken,
  
  // 认证相关
  auth: {
    login: (credentials) => api.post('/api/auth/login', credentials),
    logout: () => api.post('/api/auth/logout'),
    verify: () => api.get('/api/auth/verify'),
    getProfile: () => api.get('/api/auth/profile'),
    changePassword: (currentPassword, newPassword) => api.put('/api/auth/change-password', { currentPassword, newPassword })
  },
  
  // 代理相关
  agents: {
    getAll: (params) => api.get('/api/agents', { params }),
    getById: (id) => api.get(`/api/agents/${id}`),
    getHierarchy: () => api.get('/api/agents/hierarchy'),
    create: (data) => api.post('/api/agents', data),
    update: (id, data) => api.put(`/api/agents/${id}`, data),
    delete: (id) => api.delete(`/api/agents/${id}`)
  },
  
  // 销售记录相关
  sales: {
    getAll: (params) => api.get('/api/sales', { params }),
    getById: (id) => api.get(`/api/sales/${id}`),
    create: (data) => api.post('/api/sales', data),
    update: (id, data) => api.put(`/api/sales/${id}`, data),
    delete: (id) => api.delete(`/api/sales/${id}`),
    // 销售统计接口
    getStats: (params) => api.get('/api/sales/stats', { params }),
    // 代理销售记录接口
    getAgentSales: (agentId, params) => api.get(`/api/sales/agent/${agentId}`, { params }),
    // 代理销售统计接口
    getAgentStats: (agentId, params) => api.get(`/api/sales/agent/${agentId}/stats`, { params })
  },
  
  // 交易相关
  transactions: {
    getAll: (params) => api.get('/api/transactions', { params }),
    getById: (id) => api.get(`/api/transactions/${id}`),
    create: (data) => api.post('/api/transactions', data),
    update: (id, data) => api.put(`/api/transactions/${id}`, data),
    delete: (id) => api.delete(`/api/transactions/${id}`)
  },
  
  // 库存相关
  inventory: {
    getAll: (params) => api.get('/api/inventory', { params }),
    getById: (id) => api.get(`/api/inventory/${id}`),
    create: (data) => api.post('/api/inventory', data),
    update: (id, data) => api.put(`/api/inventory/${id}`, data),
    delete: (id) => api.delete(`/api/inventory/${id}`)
  },
  
  // 物流相关
  logistics: {
    getAll: (params) => api.get('/api/logistics', { params }),
    getById: (id) => api.get(`/api/logistics/${id}`),
    create: (data) => api.post('/api/logistics', data),
    update: (id, data) => api.put(`/api/logistics/${id}`, data),
    delete: (id) => api.delete(`/api/logistics/${id}`)
  }
};