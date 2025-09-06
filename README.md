# 唐肽燃管理系统

一个基于 Vue.js 3 的现代化企业管理系统，专为唐肽燃公司设计，提供财务、库存、物流等一体化管理功能。

## 🚀 项目特性

- **现代化技术栈**: Vue 3 + Vite + Element Plus
- **响应式设计**: 支持桌面端和移动端
- **模块化架构**: 清晰的代码组织和可维护性
- **状态管理**: 使用 Pinia 进行状态管理
- **图表可视化**: 集成 Chart.js 提供数据可视化
- **组件化开发**: 可复用的 Vue 组件

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

### 📊 预算管理
- 预算制定和跟踪
- 预算执行情况分析
- 预算超支提醒
- 预算报表生成

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

## 🛠️ 技术栈

### 前端框架
- **Vue.js 3.3.4** - 渐进式 JavaScript 框架
- **Vue Router 4.2.4** - 官方路由管理器
- **Pinia 2.1.6** - 状态管理库

### UI 组件库
- **Element Plus 2.3.9** - 企业级 UI 组件库
- **Element Plus Icons** - 图标组件

### 数据可视化
- **Chart.js 4.4.0** - 图表库
- **Vue-ChartJS 5.2.0** - Vue Chart.js 包装器

### 构建工具
- **Vite 4.4.9** - 下一代前端构建工具
- **Sass 1.66.1** - CSS 预处理器

### 其他工具
- **Axios 1.5.0** - HTTP 客户端
- **Day.js 1.11.9** - 日期处理库

## 📦 安装和运行

### 环境要求
- Node.js >= 16.0.0
- npm >= 8.0.0

### 安装依赖
```bash
# 克隆项目
git clone <repository-url>
cd TangTaiRan

# 安装依赖
npm install
```

### 开发环境
```bash
# 启动开发服务器
npm run dev

# 访问地址: http://localhost:8080
```

### 生产构建
```bash
# 构建生产版本
npm run build

# 预览构建结果
npm run preview
```

## 🔐 登录信息

### 默认管理员账号
- **用户名**: admin
- **密码**: admin123

> 注意：首次使用请及时修改默认密码

## 📁 项目结构

```
TangTaiRan/
├── public/                 # 静态资源
├── resources/              # 项目资源文件
│   ├── FBQR.png           # Facebook 二维码
│   ├── WechatQR.png       # 微信二维码
│   ├── WhatsAppQR.png     # WhatsApp 二维码
│   ├── productImg.png     # 产品图片
│   ├── productIntro.jpg   # 产品介绍图
│   ├── productimg2.png    # 产品图片2
│   └── wechat.jpg         # 微信图片
├── src/                    # 源代码
│   ├── components/         # 可复用组件
│   │   └── AddTransactionDialog.vue
│   ├── layout/            # 布局组件
│   │   └── index.vue      # 主布局
│   ├── router/            # 路由配置
│   │   └── index.js       # 路由定义
│   ├── stores/            # 状态管理
│   │   ├── auth.js        # 认证状态
│   │   └── data.js        # 数据状态
│   ├── styles/            # 样式文件
│   │   ├── main.scss      # 全局样式
│   │   └── variables.scss # SCSS 变量
│   ├── views/             # 页面组件
│   │   ├── Dashboard.vue  # 财务概览
│   │   ├── Transactions.vue # 账单管理
│   │   ├── Budget.vue     # 预算管理
│   │   ├── Inventory.vue  # 库存管理
│   │   ├── Logistics.vue  # 物流管理
│   │   ├── Login.vue      # 登录页面
│   │   └── 404.vue        # 404 页面
│   ├── App.vue            # 根组件
│   └── main.js            # 入口文件
├── .gitignore             # Git 忽略文件
├── index.html             # HTML 模板
├── package.json           # 项目配置
├── vite.config.js         # Vite 配置
├── LICENSE                # 许可证
└── README.md              # 项目说明
```

## 🎯 核心功能说明

### 认证系统
- 基于 JWT 的用户认证
- 路由权限控制
- 自动登录状态保持

### 数据管理
- 本地存储数据持久化
- 响应式数据更新
- 数据验证和错误处理

### 用户界面
- 现代化的 Material Design 风格
- 响应式布局适配各种设备
- 流畅的动画和交互效果
- 智能卡片导航（点击系统概览中的库存状态和物流订单卡片可直接跳转到对应管理页面）

## 🔧 开发指南

### 代码规范
- 使用 ES6+ 语法
- 组件采用 Composition API
- 遵循 Vue.js 官方风格指南

### 组件开发
```vue
<template>
  <!-- 模板内容 -->
</template>

<script setup>
// 使用 Composition API
import { ref, computed, onMounted } from 'vue'

// 组件逻辑
</script>

<style lang="scss" scoped>
// 组件样式
</style>
```

### 状态管理
```javascript
// stores/example.js
import { defineStore } from 'pinia'

export const useExampleStore = defineStore('example', {
  state: () => ({
    // 状态定义
  }),
  getters: {
    // 计算属性
  },
  actions: {
    // 方法定义
  }
})
```

## 🚀 部署说明

### 构建生产版本
```bash
npm run build
```

### 部署到服务器
1. 将 `dist` 目录上传到服务器
2. 配置 Web 服务器（Nginx/Apache）
3. 设置路由重定向到 `index.html`

### Nginx 配置示例
```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /path/to/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

## 📝 更新日志

### v2.1.0 (2024-07-06)
- ✨ 新增智能卡片导航功能
- 🔄 优化系统概览页面周期选择功能
- 🐛 修复总收入计算重复问题
- 📊 改进财务数据统计逻辑
- 🚀 提升用户界面交互体验

### v2.0.0 (2024-01-06)
- 🎉 完全重构为 Vue.js 3 应用
- ✨ 新增现代化 UI 设计
- 🚀 性能优化和代码重构
- 📱 完善的响应式设计
- 🔧 改进的开发体验

### v1.0.0 (2023-12-01)
- 🎉 初始版本发布
- 📊 基础管理功能实现
- 💾 数据存储和管理

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 打开 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情

## 👥 开发团队

- **TTR Team** - 项目开发和维护

## 📞 联系我们

如有问题或建议，请通过以下方式联系我们：

- 📧 Email: support@tangtairan.com
- 💬 微信: 扫描项目中的微信二维码
- 📱 WhatsApp: 扫描项目中的 WhatsApp 二维码

---

**唐肽燃管理系统** - 让企业管理更简单、更高效！