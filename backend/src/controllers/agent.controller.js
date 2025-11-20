const Agent = require('../models/agent.model');
const { errorHandler } = require('../middleware/error.middleware');

/**
 * @desc    获取所有代理
 * @route   GET /api/agents
 * @access  Private/Admin/GeneralAgent/CityAgent
 */
exports.getAllAgents = async (req, res, next) => {
  try {
    let query = {};
    
    // 根据用户角色过滤数据
    if (req.user.role === 'admin') {
      // admin可以查看所有代理
      query = {};
    } else if (req.user.role === 'generalAgent') {
      // 总代理可以查看自己及其下级代理
      const userAgent = await Agent.findOne({ id: req.user.agentId });
      if (!userAgent) {
        return res.status(404).json({
          success: false,
          message: '找不到用户对应的代理信息'
        });
      }
      
      // 获取所有下级代理ID（包括自己）
      const subordinateIds = await getSubordinateAgentIds(userAgent.id);
      subordinateIds.push(userAgent.id); // 包括自己
      
      query = { id: { $in: subordinateIds } };
    } else if (req.user.role === 'cityAgent') {
      // 城市代理可以查看自己及其下级代理
      const userAgent = await Agent.findOne({ id: req.user.agentId });
      if (!userAgent) {
        return res.status(404).json({
          success: false,
          message: '找不到用户对应的代理信息'
        });
      }
      
      // 获取所有下级代理ID（包括自己）
      const subordinateIds = await getSubordinateAgentIds(userAgent.id);
      subordinateIds.push(userAgent.id); // 包括自己
      
      query = { id: { $in: subordinateIds } };
    } else {
      // 其他角色不能访问
      return res.status(403).json({
        success: false,
        message: '没有权限访问代理信息'
      });
    }
    
    const agents = await Agent.find(query).sort({ level: 1, name: 1 });
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
 * 递归获取所有下级代理ID
 * @param {String} parentId - 父代理ID
 * @returns {Array} 下级代理ID数组
 */
async function getSubordinateAgentIds(parentId) {
  const subordinates = await Agent.find({ parentId: parentId });
  let allSubordinateIds = [];
  
  for (const subordinate of subordinates) {
    allSubordinateIds.push(subordinate.id);
    // 递归获取下级的下级
    const subSubordinates = await getSubordinateAgentIds(subordinate.id);
    allSubordinateIds = allSubordinateIds.concat(subSubordinates);
  }
  
  return allSubordinateIds;
}

/**
 * @desc    获取单个代理
 * @route   GET /api/agents/:id
 * @access  Private/Admin or Agent(自己)
 */
exports.getAgentById = async (req, res, next) => {
  try {
    const agent = await Agent.findOne({ id: req.params.id });
    
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: '找不到该代理'
      });
    }

    // 检查权限：只有管理员或代理本人可以查看
    if (req.user.role !== 'admin' && req.user.agentId !== agent.id) {
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
    // 递归函数获取代理及其下级
    const getAgentWithChildren = async (agent) => {
      const children = await Agent.find({ parentId: agent.id }).sort({ name: 1 });
      
      const childrenWithSubChildren = await Promise.all(
        children.map(child => getAgentWithChildren(child))
      );
      
      return {
        _id: agent._id,
        id: agent.id,
        name: agent.name,
        level: agent.level,
        status: agent.status,
        parentId: agent.parentId,
        children: childrenWithSubChildren
      };
    };

    let hierarchy = [];

    if (req.user.role === 'admin') {
      // 管理员：返回所有顶级代理（没有父代理的）及其子代理
      const topLevelAgents = await Agent.find({ 
        $or: [
          { parentId: null }, 
          { parentId: '' },
          { parentId: { $exists: false } }
        ] 
      }).sort({ name: 1 });
      
      hierarchy = await Promise.all(
        topLevelAgents.map(agent => getAgentWithChildren(agent))
      );
    } else if (req.user.agentId) {
      // 代理：返回该代理及其所有子代理
      const currentAgent = await Agent.findOne({ id: req.user.agentId });
      
      if (!currentAgent) {
        return res.status(404).json({
          success: false,
          message: '找不到当前代理信息'
        });
      }
      
      hierarchy = [await getAgentWithChildren(currentAgent)];
    } else {
      // 没有代理权限的用户
      return res.status(403).json({
        success: false,
        message: '没有权限查看代理层级结构'
      });
    }
    
    res.status(200).json({
      success: true,
      data: hierarchy
    });
  } catch (error) {
    next(error);
  }
};