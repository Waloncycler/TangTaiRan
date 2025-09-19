const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

/**
 * 认证中间件
 * 验证请求中的JWT令牌，并将用户信息添加到req对象
 */
exports.authMiddleware = async (req, res, next) => {
  try {
    // 从请求头获取令牌
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        message: '未提供认证令牌' 
      });
    }

    const token = authHeader.split(' ')[1];

    // 验证令牌
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 查找用户
    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: '无效的认证令牌' 
      });
    }

    // 将用户信息添加到请求对象
    req.user = {
      id: user._id,
      username: user.username,
      role: user.role,
      agentId: user.agentId
    };

    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ 
        success: false, 
        message: '无效的认证令牌' 
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false, 
        message: '认证令牌已过期' 
      });
    }
    next(error);
  }
};

/**
 * 角色授权中间件
 * 检查用户是否具有指定的角色
 * @param {Array} roles - 允许访问的角色数组
 */
exports.authorizeRoles = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        success: false, 
        message: '需要认证' 
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: '没有权限执行此操作' 
      });
    }

    next();
  };
};

/**
 * 代理数据访问控制中间件
 * 确保代理只能访问自己及其下级的数据
 * @param {String} paramName - 请求参数中代理ID的字段名
 */
exports.agentDataAccess = (paramName = 'agentId') => {
  return async (req, res, next) => {
    try {
      // 管理员可以访问所有数据
      if (req.user.role === 'admin') {
        return next();
      }

      // 如果用户不是代理，则拒绝访问
      if (!req.user.agentId) {
        return res.status(403).json({ 
          success: false, 
          message: '没有权限访问此数据' 
        });
      }

      // 获取请求中的代理ID
      const targetAgentId = req.params[paramName] || req.body[paramName];

      // 如果没有指定代理ID，则假设用户正在访问自己的数据
      if (!targetAgentId) {
        return next();
      }

      // 如果用户正在访问自己的数据，则允许
      if (targetAgentId === req.user.agentId) {
        return next();
      }

      // 检查目标代理是否是当前用户的下级
      const Agent = require('../models/agent.model');
      const targetAgent = await Agent.findOne({ id: targetAgentId });
      
      if (!targetAgent) {
        return res.status(404).json({ 
          success: false, 
          message: '代理不存在' 
        });
      }

      // 检查目标代理是否是当前用户的下级
      let isSubordinate = false;
      let currentParentId = targetAgent.parentId;

      while (currentParentId) {
        if (currentParentId === req.user.agentId) {
          isSubordinate = true;
          break;
        }

        // 获取父代理
        const parentAgent = await Agent.findOne({ id: currentParentId });
        if (!parentAgent) break;

        currentParentId = parentAgent.parentId;
      }

      if (!isSubordinate) {
        return res.status(403).json({ 
          success: false, 
          message: '没有权限访问此数据' 
        });
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};