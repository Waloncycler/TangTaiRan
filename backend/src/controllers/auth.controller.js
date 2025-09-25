const jwt = require('jsonwebtoken');
const User = require('../models/user.model');

/**
 * 验证令牌
 * @route GET /api/auth/verify
 * @access Public
 */
exports.verifyToken = async (req, res) => {
  try {
    // 从请求头获取令牌
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({
        success: false,
        message: '未提供令牌'
      });
    }
    
    // 验证令牌
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 查找用户
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: '用户不存在'
      });
    }
    
    return res.status(200).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        agentId: user.agentId
      }
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      message: '令牌无效或已过期'
    });
  }
};

/**
 * 用户登录
 * @route POST /api/auth/login
 * @access Public
 */
exports.login = async (req, res, next) => {
  try {
    const { username, password } = req.body;

    // 验证用户名和密码是否提供
    if (!username || !password) {
      return res.status(400).json({ 
        success: false, 
        message: '请提供用户名和密码' 
      });
    }

    // 查找用户
    const user = await User.findOne({ username });
    if (!user) {
      return res.status(401).json({ 
        success: false, 
        message: '用户名或密码不正确' 
      });
    }

    // 验证密码
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: '用户名或密码不正确' 
      });
    }

    // 更新最后登录时间
    user.lastLogin = new Date();
    await user.save();

    // 生成JWT令牌
    const token = jwt.sign(
      { id: user._id, role: user.role, agentId: user.agentId },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    // 返回用户信息和令牌
    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        agentId: user.agentId
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 获取当前用户信息
 * @route GET /api/auth/profile
 * @access Private
 */
exports.getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: '用户不存在' 
      });
    }

    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        agentId: user.agentId,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * 用户登出
 * @route POST /api/auth/logout
 * @access Private
 */
exports.logout = (req, res) => {
  // JWT是无状态的，客户端需要删除令牌
  // 这个端点主要是为了保持API一致性
  res.status(200).json({
    success: true,
    message: '成功登出'
  });
};

/**
 * 修改密码
 * @route PUT /api/auth/change-password
 * @access Private
 */
exports.changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // 验证是否提供了当前密码和新密码
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        success: false, 
        message: '请提供当前密码和新密码' 
      });
    }

    // 查找用户
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ 
        success: false, 
        message: '用户不存在' 
      });
    }

    // 验证当前密码
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({ 
        success: false, 
        message: '当前密码不正确' 
      });
    }

    // 更新密码
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: '密码已成功更新'
    });
  } catch (error) {
    next(error);
  }
};