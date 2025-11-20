/**
 * 缓存控制中间件
 * 用于禁用API响应的缓存
 */

/**
 * 禁用缓存中间件
 * 设置响应头以防止浏览器和代理服务器缓存API响应
 */
exports.disableCache = (req, res, next) => {
  // 设置缓存控制头
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');
  res.setHeader('ETag', ''); // 禁用ETag
  
  next();
};

/**
 * 为特定路由禁用缓存
 * 主要用于数据API路由
 */
exports.disableCacheForDataRoutes = (req, res, next) => {
  // 检查是否为数据获取路由
  const dataRoutes = ['/agents', '/sales', '/transactions', '/inventory', '/logistics'];
  const isDataRoute = dataRoutes.some(route => req.path.startsWith(route));
  
  if (isDataRoute) {
    // 设置强制不缓存的响应头
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate, private');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Last-Modified', new Date().toUTCString());
    
    // 移除可能导致304的ETag头
    res.removeHeader('ETag');
  }
  
  next();
};