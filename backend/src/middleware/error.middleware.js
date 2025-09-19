/**
 * 全局错误处理中间件
 * 捕获并格式化应用程序中的错误响应
 */
exports.errorHandler = (err, req, res, next) => {
  console.error('错误:', err);

  // 默认错误状态码和消息
  let statusCode = err.statusCode || 500;
  let message = err.message || '服务器内部错误';

  // 处理Mongoose验证错误
  if (err.name === 'ValidationError') {
    statusCode = 400;
    const errors = Object.values(err.errors).map(val => val.message);
    message = `输入数据验证失败: ${errors.join(', ')}`;
  }

  // 处理Mongoose重复键错误
  if (err.code === 11000) {
    statusCode = 400;
    const field = Object.keys(err.keyValue)[0];
    message = `${field}已存在，请使用其他值`;
  }

  // 处理Mongoose转换错误
  if (err.name === 'CastError') {
    statusCode = 400;
    message = `无效的${err.path}: ${err.value}`;
  }

  // 处理JWT错误
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = '无效的认证令牌';
  }

  // 处理JWT过期错误
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = '认证令牌已过期';
  }

  // 发送错误响应
  res.status(statusCode).json({
    success: false,
    message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

/**
 * 404错误处理中间件
 * 处理未找到的路由
 */
exports.notFound = (req, res, next) => {
  res.status(404).json({
    success: false,
    message: `找不到路径: ${req.originalUrl}`
  });
};