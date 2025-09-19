const Agent = require('../models/agent.model');
const { errorHandler } = require('../middleware/error.middleware');

/**
 * @desc    获取所有代理
 * @route   GET /api/agents
 * @access  Private/Admin
 */
exports.getAllAgents = async (req, res, next) => {
  try {
    const agents = await Agent.find().sort({ level: 1, name: 1 });
    res.status(200).json({
      success: true,
      count: agents.length,
      data: agents
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    获取单个代理
 * @route   GET /api/agents/:id
 * @access  Private/Admin or Agent(自己)
 */
exports.getAgentById = async (req, res, next) => {
  try {
    const agent = await Agent.findById(req.params.id);
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: '找不到该代理'
      });
    }

    // 检查权限：只有管理员或代理本人可以查看
    if (req.user.role !== 'admin' && req.user.agentId.toString() !== agent._id.toString()) {
      return res.status(403).json({
        success: false,
        message: '没有权限查看此代理信息'
      });
    }

    res.status(200).json({
      success: true,
      data: agent
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    创建代理
 * @route   POST /api/agents
 * @access  Private/Admin
 */
exports.createAgent = async (req, res, next) => {
  try {
    const { name, level, parentId, contactInfo, commission, area } = req.body;

    // 生成唯一ID
    const timestamp = new Date().getTime();
    const randomNum = Math.floor(Math.random() * 10000);
    const generatedId = `AG${timestamp}${randomNum}`;

    // 创建代理
    const agent = await Agent.create({
      id: generatedId,
      name,
      level,
      parentId,
      contactInfo,
      commission,
      area
    });

    res.status(201).json({
      success: true,
      data: agent
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    更新代理
 * @route   PUT /api/agents/:id
 * @access  Private/Admin
 */
exports.updateAgent = async (req, res, next) => {
  try {
    const { name, level, parentId, contactInfo, commission, area, status } = req.body;

    let agent = await Agent.findById(req.params.id);

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: '找不到该代理'
      });
    }

    // 更新代理信息
    agent = await Agent.findByIdAndUpdate(
      req.params.id,
      { name, level, parentId, contactInfo, commission, area, status },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: agent
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    删除代理
 * @route   DELETE /api/agents/:id
 * @access  Private/Admin
 */
exports.deleteAgent = async (req, res, next) => {
  try {
    const agent = await Agent.findById(req.params.id);

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: '找不到该代理'
      });
    }

    // 检查是否有下级代理
    const subAgents = await Agent.find({ parentId: req.params.id });
    if (subAgents.length > 0) {
      return res.status(400).json({
        success: false,
        message: '该代理下有下级代理，无法删除'
      });
    }

    await agent.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    获取代理层级结构
 * @route   GET /api/agents/hierarchy
 * @access  Private/Admin
 */
exports.getAgentHierarchy = async (req, res, next) => {
  try {
    // 获取所有顶级代理（没有父代理的）
    const topLevelAgents = await Agent.find({ parentId: null }).sort({ name: 1 });
    
    // 递归函数获取代理及其下级
    const getAgentWithChildren = async (agent) => {
      const children = await Agent.find({ parentId: agent._id }).sort({ name: 1 });
      
      const childrenWithSubChildren = await Promise.all(
        children.map(child => getAgentWithChildren(child))
      );
      
      return {
        _id: agent._id,
        name: agent.name,
        level: agent.level,
        status: agent.status,
        children: childrenWithSubChildren
      };
    };
    
    // 获取完整的层级结构
    const hierarchy = await Promise.all(
      topLevelAgents.map(agent => getAgentWithChildren(agent))
    );
    
    res.status(200).json({
      success: true,
      data: hierarchy
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    获取代理的下级代理
 * @route   GET /api/agents/:id/subordinates
 * @access  Private/Admin or Agent(自己)
 */
exports.getSubordinateAgents = async (req, res, next) => {
  try {
    const agent = await Agent.findById(req.params.id);
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: '找不到该代理'
      });
    }
    
    // 检查权限：只有管理员或代理本人可以查看
    if (req.user.role !== 'admin' && req.user.agentId.toString() !== agent._id.toString()) {
      return res.status(403).json({
        success: false,
        message: '没有权限查看此代理的下级'
      });
    }
    
    // 获取直接下级代理
    const subordinates = await Agent.find({ parentId: req.params.id }).sort({ name: 1 });
    
    res.status(200).json({
      success: true,
      count: subordinates.length,
      data: subordinates
    });
  } catch (error) {
    next(error);
  }
};