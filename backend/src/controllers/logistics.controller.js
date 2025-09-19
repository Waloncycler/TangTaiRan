const Logistics = require('../models/logistics.model');
const LogisticsStatus = require('../models/logisticsStatus.model');
const { errorHandler } = require('../middleware/error.middleware');

/**
 * @desc    创建物流订单
 * @route   POST /api/logistics
 * @access  Private/Admin
 */
exports.createLogistics = async (req, res, next) => {
  try {
    const { 
      trackingNumber, 
      carrier, 
      senderInfo, 
      receiverInfo, 
      packageInfo, 
      shippingCost, 
      estimatedDelivery,
      notes
    } = req.body;

    // 检查跟踪号是否已存在
    const existingLogistics = await Logistics.findOne({ trackingNumber });
    if (existingLogistics) {
      return res.status(400).json({
        success: false,
        message: '该跟踪号已存在'
      });
    }

    // 创建物流订单
    const logistics = await Logistics.create({
      trackingNumber,
      carrier,
      senderInfo,
      receiverInfo,
      packageInfo,
      shippingCost,
      estimatedDelivery,
      notes,
      createdBy: req.user._id
    });

    // 创建初始状态记录
    await LogisticsStatus.create({
      logisticsId: logistics._id,
      status: 'created',
      location: senderInfo.address,
      description: '物流订单已创建',
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      data: logistics
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    获取所有物流订单
 * @route   GET /api/logistics
 * @access  Private/Admin
 */
exports.getAllLogistics = async (req, res, next) => {
  try {
    // 分页参数
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    // 过滤参数
    const filter = {};
    
    // 跟踪号过滤
    if (req.query.trackingNumber) {
      filter.trackingNumber = { $regex: req.query.trackingNumber, $options: 'i' };
    }
    
    // 承运商过滤
    if (req.query.carrier) {
      filter.carrier = { $regex: req.query.carrier, $options: 'i' };
    }
    
    // 状态过滤
    if (req.query.currentStatus) {
      filter.currentStatus = req.query.currentStatus;
    }
    
    // 创建日期范围过滤
    if (req.query.startDate && req.query.endDate) {
      filter.createdAt = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    } else if (req.query.startDate) {
      filter.createdAt = { $gte: new Date(req.query.startDate) };
    } else if (req.query.endDate) {
      filter.createdAt = { $lte: new Date(req.query.endDate) };
    }

    // 执行查询
    const logistics = await Logistics.find(filter)
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit)
      .populate('createdBy', 'username');

    // 获取总记录数
    const total = await Logistics.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: logistics.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: logistics
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    获取单个物流订单
 * @route   GET /api/logistics/:id
 * @access  Private/Admin
 */
exports.getLogisticsById = async (req, res, next) => {
  try {
    const logistics = await Logistics.findById(req.params.id)
      .populate('createdBy', 'username');
    
    if (!logistics) {
      return res.status(404).json({
        success: false,
        message: '找不到该物流订单'
      });
    }

    // 获取物流状态记录
    const statusHistory = await LogisticsStatus.find({ logisticsId: req.params.id })
      .sort({ createdAt: 1 })
      .populate('createdBy', 'username');

    res.status(200).json({
      success: true,
      data: {
        logistics,
        statusHistory
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    通过跟踪号获取物流订单
 * @route   GET /api/logistics/tracking/:trackingNumber
 * @access  Public
 */
exports.getLogisticsByTrackingNumber = async (req, res, next) => {
  try {
    const logistics = await Logistics.findOne({ trackingNumber: req.params.trackingNumber })
      .select('-createdBy -__v');
    
    if (!logistics) {
      return res.status(404).json({
        success: false,
        message: '找不到该物流订单'
      });
    }

    // 获取物流状态记录
    const statusHistory = await LogisticsStatus.find({ logisticsId: logistics._id })
      .sort({ createdAt: 1 })
      .select('-createdBy -__v');

    res.status(200).json({
      success: true,
      data: {
        logistics,
        statusHistory
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    更新物流订单
 * @route   PUT /api/logistics/:id
 * @access  Private/Admin
 */
exports.updateLogistics = async (req, res, next) => {
  try {
    const { 
      carrier, 
      senderInfo, 
      receiverInfo, 
      packageInfo, 
      shippingCost, 
      estimatedDelivery,
      notes
    } = req.body;

    let logistics = await Logistics.findById(req.params.id);

    if (!logistics) {
      return res.status(404).json({
        success: false,
        message: '找不到该物流订单'
      });
    }

    // 更新物流订单（不允许更新跟踪号和当前状态）
    logistics = await Logistics.findByIdAndUpdate(
      req.params.id,
      { 
        carrier, 
        senderInfo, 
        receiverInfo, 
        packageInfo, 
        shippingCost, 
        estimatedDelivery,
        notes
      },
      { new: true, runValidators: true }
    ).populate('createdBy', 'username');

    res.status(200).json({
      success: true,
      data: logistics
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    删除物流订单
 * @route   DELETE /api/logistics/:id
 * @access  Private/Admin
 */
exports.deleteLogistics = async (req, res, next) => {
  try {
    const logistics = await Logistics.findById(req.params.id);

    if (!logistics) {
      return res.status(404).json({
        success: false,
        message: '找不到该物流订单'
      });
    }

    // 检查物流状态，只有在created状态下才能删除
    if (logistics.currentStatus !== 'created') {
      return res.status(400).json({
        success: false,
        message: '物流订单已经开始处理，无法删除'
      });
    }

    // 删除关联的状态记录
    await LogisticsStatus.deleteMany({ logisticsId: req.params.id });
    
    // 删除物流订单
    await logistics.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    更新物流状态
 * @route   POST /api/logistics/:id/status
 * @access  Private/Admin
 */
exports.updateLogisticsStatus = async (req, res, next) => {
  try {
    const { status, location, description } = req.body;
    
    const logistics = await Logistics.findById(req.params.id);
    
    if (!logistics) {
      return res.status(404).json({
        success: false,
        message: '找不到该物流订单'
      });
    }
    
    // 创建新的状态记录
    const statusRecord = await LogisticsStatus.create({
      logisticsId: logistics._id,
      status,
      location,
      description,
      createdBy: req.user._id
    });
    
    // 更新物流订单的当前状态
    logistics.currentStatus = status;
    if (status === 'delivered') {
      logistics.deliveredAt = new Date();
    }
    await logistics.save();
    
    res.status(200).json({
      success: true,
      data: {
        logistics,
        statusRecord
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    获取物流状态历史
 * @route   GET /api/logistics/:id/status
 * @access  Private/Admin
 */
exports.getLogisticsStatusHistory = async (req, res, next) => {
  try {
    const logistics = await Logistics.findById(req.params.id);
    
    if (!logistics) {
      return res.status(404).json({
        success: false,
        message: '找不到该物流订单'
      });
    }
    
    // 获取物流状态记录
    const statusHistory = await LogisticsStatus.find({ logisticsId: req.params.id })
      .sort({ createdAt: 1 })
      .populate('createdBy', 'username');
    
    res.status(200).json({
      success: true,
      count: statusHistory.length,
      data: statusHistory
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    获取物流统计数据
 * @route   GET /api/logistics/stats
 * @access  Private/Admin
 */
exports.getLogisticsStats = async (req, res, next) => {
  try {
    // 总物流订单数
    const totalOrders = await Logistics.countDocuments();
    
    // 按状态分组的订单数
    const statusStats = await Logistics.aggregate([
      { $group: { _id: '$currentStatus', count: { $sum: 1 } } }
    ]);
    
    // 按承运商分组的订单数
    const carrierStats = await Logistics.aggregate([
      { $group: { _id: '$carrier', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    // 每月物流订单数
    const monthlyStats = await Logistics.aggregate([
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // 平均配送时间（已送达的订单）
    const deliveryTimeStats = await Logistics.aggregate([
      {
        $match: {
          currentStatus: 'delivered',
          deliveredAt: { $exists: true }
        }
      },
      {
        $project: {
          deliveryTime: { $subtract: ['$deliveredAt', '$createdAt'] }
        }
      },
      {
        $group: {
          _id: null,
          avgDeliveryTime: { $avg: '$deliveryTime' },
          minDeliveryTime: { $min: '$deliveryTime' },
          maxDeliveryTime: { $max: '$deliveryTime' },
          count: { $sum: 1 }
        }
      }
    ]);
    
    // 最近创建的物流订单
    const recentOrders = await Logistics.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('createdBy', 'username');
    
    res.status(200).json({
      success: true,
      data: {
        totalOrders,
        statusStats: statusStats.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        carrierStats,
        monthlyStats,
        deliveryTimeStats: deliveryTimeStats.length > 0 ? {
          avgDeliveryTime: Math.round(deliveryTimeStats[0].avgDeliveryTime / (1000 * 60 * 60 * 24)), // 转换为天
          minDeliveryTime: Math.round(deliveryTimeStats[0].minDeliveryTime / (1000 * 60 * 60 * 24)),
          maxDeliveryTime: Math.round(deliveryTimeStats[0].maxDeliveryTime / (1000 * 60 * 60 * 24)),
          count: deliveryTimeStats[0].count
        } : null,
        recentOrders
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    批量导入物流订单
 * @route   POST /api/logistics/import
 * @access  Private/Admin
 */
exports.importLogistics = async (req, res, next) => {
  try {
    const { logisticsItems } = req.body;
    
    if (!Array.isArray(logisticsItems) || logisticsItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: '无效的物流数据格式'
      });
    }
    
    const results = {
      success: [],
      failed: []
    };
    
    // 逐个处理物流项
    for (const item of logisticsItems) {
      try {
        // 检查跟踪号是否已存在
        const existingLogistics = await Logistics.findOne({ trackingNumber: item.trackingNumber });
        
        if (existingLogistics) {
          // 如果存在，则添加到失败列表
          results.failed.push({
            trackingNumber: item.trackingNumber,
            message: '跟踪号已存在'
          });
        } else {
          // 如果不存在，则创建新物流订单
          const newLogistics = await Logistics.create({
            trackingNumber: item.trackingNumber,
            carrier: item.carrier,
            senderInfo: item.senderInfo,
            receiverInfo: item.receiverInfo,
            packageInfo: item.packageInfo,
            shippingCost: item.shippingCost,
            estimatedDelivery: item.estimatedDelivery,
            notes: item.notes,
            createdBy: req.user._id
          });
          
          // 创建初始状态记录
          await LogisticsStatus.create({
            logisticsId: newLogistics._id,
            status: 'created',
            location: item.senderInfo.address,
            description: '物流订单已创建',
            createdBy: req.user._id
          });
          
          results.success.push({
            trackingNumber: item.trackingNumber,
            message: '物流订单已创建'
          });
        }
      } catch (error) {
        // 记录单个项目的错误
        results.failed.push({
          trackingNumber: item.trackingNumber || '未知',
          message: error.message || '处理失败'
        });
      }
    }
    
    res.status(200).json({
      success: true,
      message: `成功导入 ${results.success.length} 条物流订单，失败 ${results.failed.length} 条`,
      data: results
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    导出物流订单
 * @route   GET /api/logistics/export
 * @access  Private/Admin
 */
exports.exportLogistics = async (req, res, next) => {
  try {
    // 过滤参数
    const filter = {};
    
    // 状态过滤
    if (req.query.currentStatus) {
      filter.currentStatus = req.query.currentStatus;
    }
    
    // 承运商过滤
    if (req.query.carrier) {
      filter.carrier = { $regex: req.query.carrier, $options: 'i' };
    }
    
    // 日期范围过滤
    if (req.query.startDate && req.query.endDate) {
      filter.createdAt = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    } else if (req.query.startDate) {
      filter.createdAt = { $gte: new Date(req.query.startDate) };
    } else if (req.query.endDate) {
      filter.createdAt = { $lte: new Date(req.query.endDate) };
    }
    
    // 执行查询
    const logistics = await Logistics.find(filter)
      .sort({ createdAt: -1 })
      .populate('createdBy', 'username');
    
    // 格式化数据用于导出
    const formattedLogistics = await Promise.all(logistics.map(async (item) => {
      // 获取最新的状态记录
      const latestStatus = await LogisticsStatus.findOne({ logisticsId: item._id })
        .sort({ createdAt: -1 });
      
      return {
        id: item._id,
        trackingNumber: item.trackingNumber,
        carrier: item.carrier,
        sender: `${item.senderInfo.name}, ${item.senderInfo.address}`,
        receiver: `${item.receiverInfo.name}, ${item.receiverInfo.address}`,
        packageInfo: item.packageInfo,
        shippingCost: item.shippingCost,
        currentStatus: item.currentStatus,
        latestLocation: latestStatus ? latestStatus.location : '',
        latestUpdate: latestStatus ? latestStatus.createdAt.toISOString() : '',
        estimatedDelivery: item.estimatedDelivery ? item.estimatedDelivery.toISOString().split('T')[0] : '',
        deliveredAt: item.deliveredAt ? item.deliveredAt.toISOString() : '',
        createdBy: item.createdBy ? item.createdBy.username : '系统',
        createdAt: item.createdAt.toISOString()
      };
    }));
    
    res.status(200).json({
      success: true,
      count: formattedLogistics.length,
      data: formattedLogistics
    });
  } catch (error) {
    next(error);
  }
};