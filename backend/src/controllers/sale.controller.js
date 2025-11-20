const Sale = require('../models/sale.model');
const Agent = require('../models/agent.model');
const { errorHandler } = require('../middleware/error.middleware');

// 递归获取所有下级代理ID（包括自己）
const getAllSubordinateAgentIds = async (agentId) => {
  const agent = await Agent.findOne({ id: agentId });
  if (!agent) {
    return [];
  }

  const subordinates = await Agent.find({ parentId: agentId });
  let allIds = [agent.id];

  for (const subordinate of subordinates) {
    const subIds = await getAllSubordinateAgentIds(subordinate.id);
    allIds = allIds.concat(subIds);
  }

  return allIds;
};

/**
 * @desc    创建销售记录
 * @route   POST /api/sales
 * @access  Private/Admin or Agent
 */
exports.createSale = async (req, res, next) => {
  try {
    const { agent: agentId, customer, products, totalAmount, saleDate, paymentMethod, paymentStatus, notes } = req.body;

    // 验证代理是否存在（支持字符串ID和ObjectId）
    let agent = await Agent.findById(agentId);
    if (!agent) {
      // 如果通过ObjectId没找到，尝试通过字符串ID查找
      agent = await Agent.findOne({ id: agentId });
    }
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: '找不到该代理'
      });
    }

    // 验证权限：管理员、代理本人或上级代理可以创建销售记录
    if (req.user.role !== 'admin') {
      // 获取当前用户的代理信息（支持字符串ID和ObjectId）
      let currentAgent;
      if (req.user.agentId) {
        // 先尝试通过字符串ID查找
        currentAgent = await Agent.findOne({ id: req.user.agentId });
        // 如果没找到，再尝试通过ObjectId查找
        if (!currentAgent) {
          currentAgent = await Agent.findById(req.user.agentId);
        }
      }
      
      if (!currentAgent) {
        return res.status(404).json({
          success: false,
          message: '找不到当前用户的代理信息'
        });
      }

      // 检查是否为代理本人或下级代理
       const accessibleAgentIds = await getAllSubordinateAgentIds(currentAgent.id);
      
      // 使用代理的字符串ID进行比较
      if (!accessibleAgentIds.includes(agent.id)) {
        return res.status(403).json({
          success: false,
          message: '没有权限为此代理创建销售记录'
        });
      }
    }

    // 创建销售记录
    const sale = await Sale.create({
      agentId: agent.id,
      customerName: customer.name,
      customerPhone: customer.phone,
      customerAddress: customer.address,
      products: products.map(p => ({
        productId: p.product,
        name: p.product,
        quantity: p.quantity,
        unitPrice: p.price,
        subtotal: p.subtotal
      })),
      totalAmount,
      saleDate,
      paymentMethod,
      paymentStatus,
      notes
    });

    res.status(201).json({
      success: true,
      data: sale
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    获取所有销售记录
 * @route   GET /api/sales
 * @access  Private/Admin or Agent with hierarchy
 */
exports.getAllSales = async (req, res, next) => {
  try {
    // 分页参数
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    // 过滤参数
    const filter = {};
    
    // 权限控制：根据用户角色和代理层级限制数据访问
    if (req.user.role !== 'admin') {
      // 获取当前用户的代理信息（支持字符串ID和ObjectId）
      let currentAgent;
      if (req.user.agentId) {
        // 先尝试通过字符串ID查找
        currentAgent = await Agent.findOne({ id: req.user.agentId });
        // 如果没找到，再尝试通过ObjectId查找
        if (!currentAgent) {
          currentAgent = await Agent.findById(req.user.agentId);
        }
      }
      
      if (!currentAgent) {
        return res.status(404).json({
          success: false,
          message: '找不到当前用户的代理信息'
        });
      }

      // 获取所有下级代理ID（包括自己）
      const accessibleAgentIds = await getAllSubordinateAgentIds(currentAgent.id);
      filter.agentId = { $in: accessibleAgentIds };
    }
    
    // 日期范围过滤
    if (req.query.startDate && req.query.endDate) {
      filter.saleDate = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    } else if (req.query.startDate) {
      filter.saleDate = { $gte: new Date(req.query.startDate) };
    } else if (req.query.endDate) {
      filter.saleDate = { $lte: new Date(req.query.endDate) };
    }

    // 代理过滤（需要检查权限）
    if (req.query.agentId) {
      if (req.user.role === 'admin') {
        filter.agentId = req.query.agentId;
      } else {
        // 检查请求的代理ID是否在用户可访问的范围内
        const accessibleAgentIds = filter.agentId.$in || [];
        if (accessibleAgentIds.includes(req.query.agentId)) {
          filter.agentId = req.query.agentId;
        } else {
          return res.status(403).json({
            success: false,
            message: '没有权限查看该代理的销售记录'
          });
        }
      }
    }

    // 支付方式过滤
    if (req.query.paymentMethod) {
      filter.paymentMethod = req.query.paymentMethod;
    }

    // 最小金额过滤
    if (req.query.minAmount) {
      filter.totalAmount = { $gte: parseFloat(req.query.minAmount) };
    }

    // 最大金额过滤
    if (req.query.maxAmount) {
      if (filter.totalAmount) {
        filter.totalAmount.$lte = parseFloat(req.query.maxAmount);
      } else {
        filter.totalAmount = { $lte: parseFloat(req.query.maxAmount) };
      }
    }

    // 执行查询
    const sales = await Sale.find(filter)
      .sort({ saleDate: -1 })
      .skip(startIndex)
      .limit(limit)
      .populate('agentId', 'name level');

    // 获取总记录数
    const total = await Sale.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: sales.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: sales
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    获取单个销售记录
 * @route   GET /api/sales/:id
 * @access  Private/Admin or Agent(自己)
 */
exports.getSaleById = async (req, res, next) => {
  try {
    const sale = await Sale.findById(req.params.id).populate('agentId', 'name level');
    
    if (!sale) {
      return res.status(404).json({
        success: false,
        message: '找不到该销售记录'
      });
    }

    // 权限验证：管理员、代理本人或上级代理可以创建销售记录
    if (req.user.role !== 'admin') {
      // 获取当前用户的代理信息（支持字符串ID和ObjectId）
      let currentAgent;
      if (req.user.agentId) {
        // 先尝试通过字符串ID查找
        currentAgent = await Agent.findOne({ id: req.user.agentId });
        // 如果没找到，再尝试通过ObjectId查找
        if (!currentAgent) {
          currentAgent = await Agent.findById(req.user.agentId);
        }
      }
      
      if (!currentAgent) {
        return res.status(404).json({
          success: false,
          message: '找不到当前用户的代理信息'
        });
      }

      // 获取所有下级代理ID（包括自己）
      const accessibleAgentIds = await getAllSubordinateAgentIds(currentAgent._id.toString());
      
      if (!accessibleAgentIds.includes(sale.agentId._id.toString())) {
        return res.status(403).json({
          success: false,
          message: '没有权限查看此销售记录'
        });
      }
    }

    res.status(200).json({
      success: true,
      data: sale
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    更新销售记录
 * @route   PUT /api/sales/:id
 * @access  Private/Admin
 */
exports.updateSale = async (req, res, next) => {
  try {
    const { customerName, products, totalAmount, saleDate, paymentMethod, notes } = req.body;

    let sale = await Sale.findById(req.params.id);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: '找不到该销售记录'
      });
    }

    // 更新销售记录
    sale = await Sale.findByIdAndUpdate(
      req.params.id,
      { customerName, products, totalAmount, saleDate, paymentMethod, notes },
      { new: true, runValidators: true }
    ).populate('agentId', 'name level');

    res.status(200).json({
      success: true,
      data: sale
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    删除销售记录
 * @route   DELETE /api/sales/:id
 * @access  Private/Admin
 */
exports.deleteSale = async (req, res, next) => {
  try {
    const sale = await Sale.findById(req.params.id);

    if (!sale) {
      return res.status(404).json({
        success: false,
        message: '找不到该销售记录'
      });
    }

    await sale.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    获取代理的销售记录
 * @route   GET /api/sales/agent/:agentId
 * @access  Private/Admin or Agent(自己)
 */
exports.getAgentSales = async (req, res, next) => {
  try {
    const agentId = req.params.agentId;
    
    // 验证代理是否存在
    const agent = await Agent.findById(agentId);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: '找不到该代理'
      });
    }
    
    // 检查权限：管理员、代理本人或上级代理可以查看
    if (req.user.role !== 'admin') {
      // 获取当前用户的代理信息（支持字符串ID和ObjectId）
      let currentAgent;
      if (req.user.agentId) {
        // 先尝试通过字符串ID查找
        currentAgent = await Agent.findOne({ id: req.user.agentId });
        // 如果没找到，再尝试通过ObjectId查找
        if (!currentAgent) {
          currentAgent = await Agent.findById(req.user.agentId);
        }
      }
      
      if (!currentAgent) {
        return res.status(404).json({
          success: false,
          message: '找不到当前用户的代理信息'
        });
      }

      // 获取所有下级代理ID（包括自己）
       const accessibleAgentIds = await getAllSubordinateAgentIds(currentAgent._id.toString());
      
      if (!accessibleAgentIds.includes(agentId)) {
        return res.status(403).json({
          success: false,
          message: '没有权限查看此代理的销售记录'
        });
      }
    }
    
    // 分页参数
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    
    // 过滤参数
    const filter = { agentId };
    
    // 日期范围过滤
    if (req.query.startDate && req.query.endDate) {
      filter.saleDate = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    } else if (req.query.startDate) {
      filter.saleDate = { $gte: new Date(req.query.startDate) };
    } else if (req.query.endDate) {
      filter.saleDate = { $lte: new Date(req.query.endDate) };
    }
    
    // 执行查询
    const sales = await Sale.find(filter)
      .sort({ saleDate: -1 })
      .skip(startIndex)
      .limit(limit);
    
    // 获取总记录数
    const total = await Sale.countDocuments(filter);
    
    res.status(200).json({
      success: true,
      count: sales.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: sales
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    获取销售统计数据
 * @route   GET /api/sales/stats
 * @access  Private/Admin
 */
exports.getSalesStats = async (req, res, next) => {
  try {
    // 日期范围过滤
    const filter = {};
    if (req.query.startDate && req.query.endDate) {
      filter.saleDate = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    } else if (req.query.startDate) {
      filter.saleDate = { $gte: new Date(req.query.startDate) };
    } else if (req.query.endDate) {
      filter.saleDate = { $lte: new Date(req.query.endDate) };
    }

    // 权限控制：根据用户角色和代理层级限制数据访问
    if (req.user.role !== 'admin') {
      // 获取当前用户的代理信息（支持字符串ID和ObjectId）
      let currentAgent;
      if (req.user.agentId) {
        // 先尝试通过字符串ID查找
        currentAgent = await Agent.findOne({ id: req.user.agentId });
        // 如果没找到，再尝试通过ObjectId查找
        if (!currentAgent) {
          currentAgent = await Agent.findById(req.user.agentId);
        }
      }
      
      if (!currentAgent) {
        return res.status(404).json({
          success: false,
          message: '找不到当前用户的代理信息'
        });
      }

      // 获取所有下级代理ID（包括自己）
      const accessibleAgentIds = await getAllSubordinateAgentIds(currentAgent.id);
      filter.agentId = { $in: accessibleAgentIds };
      console.log('Stats filter for agent:', currentAgent.id, 'accessibleAgentIds:', accessibleAgentIds);
    }
    
    // 总销售额
    const totalSales = await Sale.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$totalAmount' } } }
    ]);
    
    // 按代理分组的销售额
    const salesByAgent = await Sale.aggregate([
      { $match: filter },
      { $group: { _id: '$agentId', total: { $sum: '$totalAmount' } } },
      { $sort: { total: -1 } },
      { $limit: 10 }
    ]);
    
    // 填充代理信息
    const populatedSalesByAgent = await Agent.populate(salesByAgent, {
      path: '_id',
      select: 'name level'
    });
    
    // 按月份分组的销售额
    const salesByMonth = await Sale.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$saleDate' } },
          total: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // 按支付方式分组的销售额
    const salesByPaymentMethod = await Sale.aggregate([
      { $match: filter },
      { $group: { _id: '$paymentMethod', total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        totalSales: totalSales.length > 0 ? totalSales[0].total : 0,
        salesByAgent: populatedSalesByAgent,
        salesByMonth,
        salesByPaymentMethod
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    获取代理的销售统计数据
 * @route   GET /api/sales/agent/:agentId/stats
 * @access  Private/Admin or Agent(自己)
 */
exports.getAgentSalesStats = async (req, res, next) => {
  try {
    const agentId = req.params.agentId;
    
    // 验证代理是否存在
    const agent = await Agent.findById(agentId);
    if (!agent) {
      return res.status(404).json({
        success: false,
        message: '找不到该代理'
      });
    }
    
    // 检查权限：管理员、代理本人或上级代理可以查看
    if (req.user.role !== 'admin') {
      // 获取当前用户的代理信息（支持字符串ID和ObjectId）
      let currentAgent;
      if (req.user.agentId) {
        // 先尝试通过字符串ID查找
        currentAgent = await Agent.findOne({ id: req.user.agentId });
        // 如果没找到，再尝试通过ObjectId查找
        if (!currentAgent) {
          currentAgent = await Agent.findById(req.user.agentId);
        }
      }
      
      if (!currentAgent) {
        return res.status(404).json({
          success: false,
          message: '找不到当前用户的代理信息'
        });
      }

      // 获取所有下级代理ID（包括自己）
       const accessibleAgentIds = await getAllSubordinateAgentIds(currentAgent._id.toString());
      
      if (!accessibleAgentIds.includes(agentId)) {
        return res.status(403).json({
          success: false,
          message: '没有权限查看此代理的销售统计'
        });
      }
    }
    
    // 日期范围过滤
    const filter = { agentId };
    if (req.query.startDate && req.query.endDate) {
      filter.saleDate = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    } else if (req.query.startDate) {
      filter.saleDate = { $gte: new Date(req.query.startDate) };
    } else if (req.query.endDate) {
      filter.saleDate = { $lte: new Date(req.query.endDate) };
    }
    
    // 总销售额
    const totalSales = await Sale.aggregate([
      { $match: filter },
      { $group: { _id: null, total: { $sum: '$totalAmount' }, count: { $sum: 1 } } }
    ]);
    
    // 按月份分组的销售额
    const salesByMonth = await Sale.aggregate([
      { $match: filter },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$saleDate' } },
          total: { $sum: '$totalAmount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // 按产品分组的销售额
    const salesByProduct = await Sale.aggregate([
      { $match: filter },
      { $unwind: '$products' },
      {
        $group: {
          _id: '$products.name',
          total: { $sum: { $multiply: ['$products.price', '$products.quantity'] } },
          quantity: { $sum: '$products.quantity' }
        }
      },
      { $sort: { total: -1 } },
      { $limit: 10 }
    ]);
    
    // 按客户分组的销售额
    const salesByCustomer = await Sale.aggregate([
      { $match: filter },
      { $group: { _id: '$customerName', total: { $sum: '$totalAmount' }, count: { $sum: 1 } } },
      { $sort: { total: -1 } },
      { $limit: 10 }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        totalSales: totalSales.length > 0 ? totalSales[0].total : 0,
        totalCount: totalSales.length > 0 ? totalSales[0].count : 0,
        salesByMonth,
        salesByProduct,
        salesByCustomer
      }
    });
  } catch (error) {
    next(error);
  }
};