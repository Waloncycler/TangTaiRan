# 唐肽燃管理系统

一个基于前后端分离架构的现代化企业管理系统，专为唐肽燃公司设计，提供财务、库存、物流等一体化管理功能。

## 🚀 项目特性

- **前后端分离架构**: 前端Vue 3 + 后端Node.js/Express
- **现代化技术栈**: Vue 3 + Vite + Element Plus + MongoDB
- **响应式设计**: 支持桌面端和移动端
- **模块化架构**: 清晰的代码组织和可维护性
- **状态管理**: 使用 Pinia 进行状态管理
- **图表可视化**: 集成 Chart.js 提供数据可视化
- **组件化开发**: 可复用的 Vue 组件
- **RESTful API**: 标准化的API设计
- **JWT认证**: 安全的用户认证机制

## 📋 功能模块

### 🏠 系统概览
- 收支统计和趋势分析（支持按月、季度、年度、全周期查看）
- 财务数据可视化图表
- 快速操作面板
- 最近交易记录
- 智能卡片导航（点击库存状态和物流订单卡片可直接跳转到对应管理页面）

### 💰 账单管理
- 收入和支出记录管理
- 交易分类和筛选
- 批量操作功能
- 数据导入导出

### 📊 销售统计
- 销售记录管理
- 代理层级销售数据
- 销售趋势分析
- 销售报表生成

### 📦 库存管理
- 商品库存实时监控
- 库存变动记录
- 低库存预警
- 库存统计分析

### 🚚 物流管理
- 物流订单跟踪
- 配送状态管理
- 物流成本统计
- 配送路线优化

## 🏗️ 项目架构

### 项目结构
```
TangTaiRan/
├── frontend/           # 前端项目
│   ├── public/
│   ├── src/
│   │   ├── api/        # API调用封装
│   │   ├── assets/
│   │   ├── components/
│   │   ├── layout/
│   │   ├── router/
│   │   ├── stores/
│   │   ├── styles/
│   │   ├── utils/
│   │   ├── views/
│   │   ├── App.vue
│   │   └── main.js
│   ├── index.html
│   ├── package.json
│   └── vite.config.js
└── backend/            # 后端项目
    ├── src/
    │   ├── config/     # 配置文件
    │   ├── controllers/# 控制器
    │   ├── middleware/ # 中间件
    │   ├── models/     # 数据模型
    │   ├── routes/     # 路由定义
    │   ├── services/   # 业务逻辑
    │   ├── utils/      # 工具函数
    │   └── app.js      # 应用入口
    ├── tests/          # 测试文件
    ├── .env            # 环境变量
    └── package.json
```

### 技术栈

#### 前端技术栈
- **Vue.js 3.3.4** - 渐进式 JavaScript 框架
- **Vue Router 4.2.4** - 官方路由管理器
- **Pinia 2.1.6** - 状态管理库
- **Element Plus 2.3.9** - 企业级 UI 组件库
- **Axios 1.5.0** - HTTP 客户端
- **Chart.js 4.4.0** - 图表库
- **Vite 4.4.9** - 构建工具
- **Sass 1.66.1** - CSS 预处理器

#### 后端技术栈
- **Node.js** - JavaScript 运行时
- **Express** - Web 框架
- **MongoDB** - NoSQL 数据库
- **Mongoose** - MongoDB 对象模型工具
- **JWT** - 用户认证
- **Joi** - 数据验证
- **Winston** - 日志记录
- **Jest** - 单元测试

## 📦 安装和运行

### 环境要求
- Node.js >= 16.0.0
- npm >= 8.0.0
- MongoDB >= 5.0.0

### 前端项目
```bash
# 进入前端目录
cd TangTaiRan

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# 访问地址: http://localhost:8080
```

### 后端项目
```bash
# 进入后端目录
cd TangTaiRan/backend

# 安装依赖
npm install

# 启动开发服务器
npm run dev

# API地址: http://localhost:3000
```

### 生产构建
```bash
# 前端构建
cd TangTaiRan
npm run build

# 后端部署
cd TangTaiRan/backend
npm start
```

## 🔄 数据流

1. **前端请求**: 前端通过API模块发送HTTP请求到后端
2. **后端处理**: 后端接收请求，进行认证、授权和业务逻辑处理
3. **数据库操作**: 后端与MongoDB数据库交互，执行CRUD操作
4. **响应返回**: 后端将处理结果返回给前端
5. **前端更新**: 前端接收响应，更新状态和UI

## 🔐 安全特性

- **JWT认证**: 使用JSON Web Token进行用户认证
- **密码加密**: 使用bcrypt加密存储用户密码
- **CORS保护**: 配置跨域资源共享策略
- **请求限流**: 防止暴力攻击
- **输入验证**: 使用Joi验证所有API输入
- **错误处理**: 统一的错误处理机制

## 📝 开发指南

### API文档

详细的API文档请参考 [backend-design.md](./backend-design.md) 文件。

### 前端开发

1. 所有API调用应使用 `src/api/index.js` 中定义的方法
2. 使用Pinia进行状态管理，从API获取数据
3. 遵循组件化开发原则，保持组件的可复用性

### 后端开发

1. 遵循MVC架构模式
2. 使用中间件进行认证和授权
3. 实现RESTful API设计原则
4. 编写单元测试确保代码质量

## 📄 许可证

[MIT](./LICENSE)