import axios from 'axios';
import { ElMessage } from 'element-plus';

// API基础URL，从环境变量获取或使用默认值
const API_URL = import.meta.env.DEV
  ? (import.meta.env.VITE_API_URL || '/api')
  : (import.meta.env.VITE_API_URL || 'http://localhost:3000');

// 创建axios实例
const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

let currentToken = null;

// 设置认证令牌
const setAuthToken = (token) => {
  currentToken = token;
};

// 清除认证令牌
const clearAuthToken = () => {
  currentToken = null;
};



// 请求拦截器 - 添加token、去重和智能缓存控制
api.interceptors.request.use(config => {
  // 优先使用内存中的token，其次从sessionStorage获取
  const token = currentToken || sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  // 对于GET请求，默认添加缓存破坏参数
  if (config.method === 'get') {
    // 为所有GET请求添加时间戳以防止缓存
    config.params = {
      ...config.params,
      _t: new Date().getTime()
    };
    
    // 移除内部标识参数
    if (config.params?._force) {
      delete config.params._force;
    }
    if (config.params?.forceRefresh) {
      delete config.params.forceRefresh;
    }
  }
  
  return config;
}, error => {
  console.error('请求错误:', error);
  return Promise.reject(error);
});

// 响应拦截器 - 处理错误和清理请求缓存
api.interceptors.response.use(
  response => {
    return response.data;
  },
  error => {
    // 处理错误响应
    const errorMessage = error.response?.data?.message || '请求失败，请稍后重试';
    
    // 对于429错误，给出更友好的提示
    if (error.response && error.response.status === 429) {
      ElMessage.warning('请求过于频繁，请稍后再试');
      return Promise.reject(error);
    }
    
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
    login: (credentials) => api.post('/auth/login', credentials),
    logout: () => api.post('/auth/logout'),
    verify: () => api.get('/auth/verify'),
    getProfile: () => api.get('/auth/profile'),
    changePassword: (currentPassword, newPassword) => api.put('/auth/change-password', { currentPassword, newPassword })
  },
  
  // 代理相关
  agents: {
    getAll: (params) => api.get('/agents', { params }),
    getById: (id) => api.get(`/agents/${id}`),
    getHierarchy: () => api.get('/agents/hierarchy'),
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
    delete: (id) => api.delete(`/sales/${id}`),
    // 销售统计接口
    getStats: (params) => api.get('/sales/stats', { params }),
    // 代理销售记录接口
    getAgentSales: (agentId, params) => api.get(`/sales/agent/${agentId}`, { params }),
    // 代理销售统计接口
    getAgentStats: (agentId, params) => api.get(`/sales/agent/${agentId}/stats`, { params })
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