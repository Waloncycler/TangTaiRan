# 唐肽燃管理系统 - 前后端分离设计方案

## 1. 架构概述

当前的唐肽燃管理系统是一个基于Vue 3的单页面应用，数据存储和业务逻辑都在前端实现。为了提高系统的可扩展性、安全性和性能，我们计划将系统重构为前后端分离架构。

### 1.1 分离后的架构

```
┌─────────────┐      ┌─────────────┐
│   前端应用   │ <──> │   后端API   │ <──> 数据库
└─────────────┘      └─────────────┘
```

- **前端**：保留Vue 3框架，专注于用户界面和数据展示
- **后端**：新建Node.js/Express API服务，处理业务逻辑和数据存储
- **数据库**：使用MongoDB存储结构化数据

## 2. 技术栈选择

### 2.1 前端技术栈（保留现有）

- Vue 3 - 前端框架
- Vite - 构建工具
- Pinia - 状态管理
- Element Plus - UI组件库
- Axios - HTTP客户端
- Chart.js - 数据可视化

### 2.2 后端技术栈（新增）

- **Node.js** - JavaScript运行时
- **Express** - Web框架
- **MongoDB** - NoSQL数据库
- **Mongoose** - MongoDB对象模型工具
- **JWT** - 用户认证
- **Joi** - 数据验证
- **Winston** - 日志记录
- **Jest** - 单元测试

## 3. 目录结构

### 3.1 项目整体结构

```
TangTaiRan/
├── frontend/           # 前端项目
└── backend/            # 后端项目
```

### 3.2 前端目录结构（修改现有）

```
frontend/
├── public/
├── src/
│   ├── api/            # API调用封装
│   ├── assets/
│   ├── components/
│   ├── layout/
│   ├── router/
│   ├── stores/         # 修改为使用API数据
│   ├── styles/
│   ├── utils/          # 工具函数
│   ├── views/
│   ├── App.vue
│   └── main.js
├── index.html
├── package.json
└── vite.config.js
```

### 3.3 后端目录结构（新建）

```
backend/
├── src/
│   ├── config/         # 配置文件
│   ├── controllers/    # 控制器
│   ├── middleware/     # 中间件
│   ├── models/         # 数据模型
│   ├── routes/         # 路由定义
│   ├── services/       # 业务逻辑
│   ├── utils/          # 工具函数
│   └── app.js          # 应用入口
├── tests/              # 测试文件
├── .env                # 环境变量
├── .gitignore
└── package.json
```

## 4. API设计

### 4.1 认证API

- `POST /api/auth/login` - 用户登录
- `POST /api/auth/logout` - 用户登出
- `GET /api/auth/profile` - 获取用户信息

### 4.2 代理管理API

- `GET /api/agents` - 获取代理列表
- `GET /api/agents/:id` - 获取代理详情
- `POST /api/agents` - 创建代理
- `PUT /api/agents/:id` - 更新代理
- `DELETE /api/agents/:id` - 删除代理

### 4.3 销售记录API

- `GET /api/sales` - 获取销售记录列表
- `GET /api/sales/:id` - 获取销售记录详情
- `POST /api/sales` - 创建销售记录
- `PUT /api/sales/:id` - 更新销售记录
- `DELETE /api/sales/:id` - 删除销售记录

### 4.4 交易API

- `GET /api/transactions` - 获取交易列表
- `GET /api/transactions/:id` - 获取交易详情
- `POST /api/transactions` - 创建交易
- `PUT /api/transactions/:id` - 更新交易
- `DELETE /api/transactions/:id` - 删除交易

### 4.5 库存API

- `GET /api/inventory` - 获取库存列表
- `GET /api/inventory/:id` - 获取库存详情
- `POST /api/inventory` - 创建库存
- `PUT /api/inventory/:id` - 更新库存
- `DELETE /api/inventory/:id` - 删除库存

### 4.6 物流API

- `GET /api/logistics` - 获取物流列表
- `GET /api/logistics/:id` - 获取物流详情
- `POST /api/logistics` - 创建物流
- `PUT /api/logistics/:id` - 更新物流
- `DELETE /api/logistics/:id` - 删除物流

## 5. 数据模型设计

### 5.1 用户模型

```javascript
const UserSchema = new Schema({
  username: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ['admin', 'generalAgent', 'cityAgent', 'teamLeader', 'salesPerson'], default: 'admin' },
  agentId: { type: String, default: null },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
```

### 5.2 代理模型

```javascript
const AgentSchema = new Schema({
  id: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  level: { type: Number, required: true }, // 1:州总代理, 2:城市代理, 3:团队长, 4:销售员
  parentId: { type: String, default: null },
  phone: { type: String },
  email: { type: String },
  joinDate: { type: Date },
  status: { type: String, enum: ['active', 'inactive'], default: 'active' },
  region: { type: String },
  city: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
```

### 5.3 销售记录模型

```javascript
const SaleSchema = new Schema({
  id: { type: String, required: true, unique: true },
  agentId: { type: String, required: true },
  customerName: { type: String, required: true },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true },
  unitPrice: { type: Number, required: true },
  totalAmount: { type: Number, required: true },
  saleDate: { type: Date, required: true },
  paymentMethod: { type: String },
  status: { type: String, enum: ['pending', 'completed', 'cancelled'], default: 'completed' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
```

### 5.4 交易模型

```javascript
const TransactionSchema = new Schema({
  id: { type: Number, required: true, unique: true },
  type: { type: String, enum: ['income', 'expense'], required: true },
  amount: { type: Number, required: true },
  category: { type: String, required: true },
  date: { type: Date, required: true },
  note: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
```

### 5.5 库存模型

```javascript
const InventorySchema = new Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  quantity: { type: Number, required: true, default: 0 },
  unit: { type: String, required: true },
  location: { type: String },
  status: { type: String, enum: ['normal', 'low', 'out'], default: 'normal' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
```

### 5.6 物流模型

```javascript
const LogisticsSchema = new Schema({
  id: { type: Number, required: true, unique: true },
  company: { type: String, required: true },
  orderNumber: { type: String, required: true, unique: true },
  product: { type: String, required: true },
  quantity: { type: Number, required: true },
  recipient: { type: String, required: true },
  contact: { type: String, required: true },
  status: { type: String, enum: ['pending', 'transit', 'delivered', 'cancelled'], default: 'pending' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});
```

## 6. 前端改造方案

### 6.1 API模块

创建API调用模块，替代直接在store中管理数据：

```javascript
// src/api/index.js
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器 - 添加token
api.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// 响应拦截器 - 处理错误
api.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response && error.response.status === 401) {
      // 未授权，清除token并跳转到登录页
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export default api
```

### 6.2 Store改造

修改Pinia store，从API获取数据而非本地存储：

```javascript
// src/stores/auth.js 示例
import { defineStore } from 'pinia'
import { ref } from 'vue'
import api from '@/api'

export const useAuthStore = defineStore('auth', () => {
  const isLoggedIn = ref(false)
  const userInfo = ref({})
  
  // 登录
  const login = async (username, password) => {
    try {
      const response = await api.post('/auth/login', { username, password })
      localStorage.setItem('token', response.token)
      userInfo.value = response.user
      isLoggedIn.value = true
      return true
    } catch (error) {
      console.error('登录失败:', error)
      return false
    }
  }
  
  // 登出
  const logout = async () => {
    try {
      await api.post('/auth/logout')
    } catch (error) {
      console.error('登出请求失败:', error)
    } finally {
      localStorage.removeItem('token')
      userInfo.value = {}
      isLoggedIn.value = false
    }
  }
  
  // 检查登录状态
  const checkLoginStatus = async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      isLoggedIn.value = false
      return false
    }
    
    try {
      const response = await api.get('/auth/profile')
      userInfo.value = response
      isLoggedIn.value = true
      return true
    } catch (error) {
      console.error('获取用户信息失败:', error)
      localStorage.removeItem('token')
      isLoggedIn.value = false
      return false
    }
  }
  
  return { isLoggedIn, userInfo, login, logout, checkLoginStatus }
})
```

## 7. 数据迁移方案

1. **创建数据库和集合**：在MongoDB中创建数据库和相应的集合
2. **导出前端数据**：将前端store中的数据导出为JSON格式
3. **数据转换**：根据后端模型结构转换数据格式
4. **导入数据**：将转换后的数据导入MongoDB
5. **数据验证**：验证导入的数据是否完整和正确

## 8. 部署方案

### 8.1 开发环境

- 前端：`npm run dev` (Vite开发服务器，端口8080)
- 后端：`npm run dev` (Nodemon监视文件变化，端口3000)

### 8.2 生产环境

- 前端：静态文件部署到Nginx或CDN
- 后端：使用PM2管理Node.js进程
- 数据库：MongoDB Atlas或自托管MongoDB服务器

## 9. 安全考虑

1. **认证与授权**：使用JWT进行用户认证，基于角色的访问控制
2. **数据验证**：使用Joi验证所有API输入
3. **HTTPS**：所有通信使用HTTPS加密
4. **密码加密**：使用bcrypt加密存储密码
5. **CORS**：配置适当的跨域资源共享策略
6. **速率限制**：防止暴力攻击
7. **日志记录**：记录关键操作和错误

## 10. 实施计划

1. **阶段一：后端开发**
   - 搭建基础框架
   - 实现数据模型
   - 开发API端点
   - 实现认证系统

2. **阶段二：前端改造**
   - 创建API调用模块
   - 修改store使用API
   - 更新组件获取数据的方式
   - 实现错误处理和加载状态

3. **阶段三：数据迁移**
   - 导出现有数据
   - 导入到MongoDB
   - 验证数据完整性

4. **阶段四：测试与部署**
   - 单元测试和集成测试
   - 性能测试
   - 部署到生产环境