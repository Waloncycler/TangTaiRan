const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerSpecs = require('./config/swagger');
require('dotenv').config();

// 导入路由
const authRoutes = require('./routes/auth.routes');
const agentRoutes = require('./routes/agent.routes');
const saleRoutes = require('./routes/sale.routes');
const transactionRoutes = require('./routes/transaction.routes');
const inventoryRoutes = require('./routes/inventory.routes');
const logisticsRoutes = require('./routes/logistics.routes');
const importExportRoutes = require('./routes/import-export.routes');

// 导入中间件
const { errorHandler } = require('./middleware/error.middleware');
const { authMiddleware } = require('./middleware/auth.middleware');

// 初始化Express应用
const app = express();

// 基本中间件
app.use(helmet()); // 安全HTTP头
app.use(cors()); // 跨域资源共享
app.use(express.json()); // 解析JSON请求体
app.use(morgan('dev')); // 请求日志

// 速率限制
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分钟
  max: 100, // 每个IP限制100个请求
  standardHeaders: true,
  legacyHeaders: false,
});
app.use('/api', apiLimiter);

// 路由
app.use('/api/auth', authRoutes);
app.use('/api/agents', authMiddleware, agentRoutes);
app.use('/api/sales', authMiddleware, saleRoutes);
app.use('/api/transactions', authMiddleware, transactionRoutes);
app.use('/api/inventory', authMiddleware, inventoryRoutes);
app.use('/api/logistics', authMiddleware, logisticsRoutes);
app.use('/api', authMiddleware, importExportRoutes);

// Swagger API文档
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpecs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: '唐肽燃管理系统 API 文档'
}));

// 健康检查路由
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', message: '唐肽燃管理系统API服务正常运行' });
});

// 错误处理中间件
app.use(errorHandler);

// 连接数据库
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('成功连接到MongoDB数据库');
  })
  .catch((err) => {
    console.error('数据库连接失败:', err.message);
    process.exit(1);
  });

// 启动服务器
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`服务器运行在端口 ${PORT}`);
  console.log(`环境: ${process.env.NODE_ENV}`);
});

module.exports = app; // 导出供测试使用