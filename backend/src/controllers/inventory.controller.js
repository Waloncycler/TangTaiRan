const Inventory = require('../models/inventory.model');
const InventoryHistory = require('../models/inventoryHistory.model');
const { errorHandler } = require('../middleware/error.middleware');

/**
 * @desc    获取所有库存记录
 * @route   GET /api/inventory
 * @access  Private/Admin
 */
exports.getAllInventory = async (req, res, next) => {
  try {
    // 分页参数
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    // 过滤参数
    const filter = {};
    
    // 产品名称过滤
    if (req.query.productName) {
      filter.productName = { $regex: req.query.productName, $options: 'i' };
    }
    
    // 产品编码过滤
    if (req.query.productCode) {
      filter.productCode = { $regex: req.query.productCode, $options: 'i' };
    }
    
    // 库存状态过滤
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    // 库存数量过滤
    if (req.query.minQuantity) {
      filter.quantity = { $gte: parseInt(req.query.minQuantity, 10) };
    }
    if (req.query.maxQuantity) {
      if (filter.quantity) {
        filter.quantity.$lte = parseInt(req.query.maxQuantity, 10);
      } else {
        filter.quantity = { $lte: parseInt(req.query.maxQuantity, 10) };
      }
    }

    // 执行查询
    const inventory = await Inventory.find(filter)
      .sort({ updatedAt: -1 })
      .skip(startIndex)
      .limit(limit);

    // 获取总记录数
    const total = await Inventory.countDocuments(filter);

    res.status(200).json({
      success: true,
      count: inventory.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: inventory
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    获取单个库存记录
 * @route   GET /api/inventory/:id
 * @access  Private/Admin
 */
exports.getInventoryById = async (req, res, next) => {
  try {
    const inventory = await Inventory.findById(req.params.id);
    
    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: '找不到该库存记录'
      });
    }

    res.status(200).json({
      success: true,
      data: inventory
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    创建库存记录
 * @route   POST /api/inventory
 * @access  Private/Admin
 */
exports.createInventory = async (req, res, next) => {
  try {
    const { productName, productCode, quantity, unit, costPrice, sellingPrice, location, status, description } = req.body;

    // 检查产品编码是否已存在
    const existingInventory = await Inventory.findOne({ productCode });
    if (existingInventory) {
      return res.status(400).json({
        success: false,
        message: '产品编码已存在'
      });
    }

    // 创建库存记录
    const inventory = await Inventory.create({
      productName,
      productCode,
      quantity,
      unit,
      costPrice,
      sellingPrice,
      location,
      status,
      description,
      createdBy: req.user._id
    });

    // 创建库存历史记录
    await InventoryHistory.create({
      inventoryId: inventory._id,
      productCode,
      type: 'initial',
      quantity,
      previousQuantity: 0,
      newQuantity: quantity,
      notes: '初始库存',
      createdBy: req.user._id
    });

    res.status(201).json({
      success: true,
      data: inventory
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    更新库存记录
 * @route   PUT /api/inventory/:id
 * @access  Private/Admin
 */
exports.updateInventory = async (req, res, next) => {
  try {
    const { productName, unit, costPrice, sellingPrice, location, status, description } = req.body;

    let inventory = await Inventory.findById(req.params.id);

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: '找不到该库存记录'
      });
    }

    // 更新库存记录（不允许直接更新数量和产品编码）
    inventory = await Inventory.findByIdAndUpdate(
      req.params.id,
      { productName, unit, costPrice, sellingPrice, location, status, description },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: inventory
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    删除库存记录
 * @route   DELETE /api/inventory/:id
 * @access  Private/Admin
 */
exports.deleteInventory = async (req, res, next) => {
  try {
    const inventory = await Inventory.findById(req.params.id);

    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: '找不到该库存记录'
      });
    }

    // 检查是否有关联的库存历史记录
    const historyCount = await InventoryHistory.countDocuments({ inventoryId: req.params.id });
    if (historyCount > 1) { // 初始记录之外还有其他记录
      return res.status(400).json({
        success: false,
        message: '该库存记录已有变动历史，无法删除'
      });
    }

    // 删除关联的库存历史记录
    await InventoryHistory.deleteMany({ inventoryId: req.params.id });
    
    // 删除库存记录
    await inventory.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    调整库存数量
 * @route   POST /api/inventory/:id/adjust
 * @access  Private/Admin
 */
exports.adjustInventory = async (req, res, next) => {
  try {
    const { type, quantity, notes } = req.body;
    
    if (!['increase', 'decrease'].includes(type)) {
      return res.status(400).json({
        success: false,
        message: '无效的调整类型，必须是 increase 或 decrease'
      });
    }
    
    if (!quantity || quantity <= 0) {
      return res.status(400).json({
        success: false,
        message: '调整数量必须大于0'
      });
    }
    
    const inventory = await Inventory.findById(req.params.id);
    
    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: '找不到该库存记录'
      });
    }
    
    // 当前库存数量
    const previousQuantity = inventory.quantity;
    let newQuantity;
    
    // 计算新库存数量
    if (type === 'increase') {
      newQuantity = previousQuantity + quantity;
    } else {
      // 检查库存是否足够
      if (previousQuantity < quantity) {
        return res.status(400).json({
          success: false,
          message: '库存不足，无法减少'
        });
      }
      newQuantity = previousQuantity - quantity;
    }
    
    // 更新库存数量
    inventory.quantity = newQuantity;
    if (newQuantity === 0) {
      inventory.status = 'out_of_stock';
    } else if (newQuantity <= inventory.alertThreshold) {
      inventory.status = 'low_stock';
    } else {
      inventory.status = 'in_stock';
    }
    
    await inventory.save();
    
    // 创建库存历史记录
    await InventoryHistory.create({
      inventoryId: inventory._id,
      productCode: inventory.productCode,
      type,
      quantity,
      previousQuantity,
      newQuantity,
      notes,
      createdBy: req.user._id
    });
    
    res.status(200).json({
      success: true,
      data: inventory
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    获取库存历史记录
 * @route   GET /api/inventory/:id/history
 * @access  Private/Admin
 */
exports.getInventoryHistory = async (req, res, next) => {
  try {
    // 检查库存记录是否存在
    const inventory = await Inventory.findById(req.params.id);
    
    if (!inventory) {
      return res.status(404).json({
        success: false,
        message: '找不到该库存记录'
      });
    }
    
    // 分页参数
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;
    
    // 获取库存历史记录
    const history = await InventoryHistory.find({ inventoryId: req.params.id })
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit)
      .populate('createdBy', 'username');
    
    // 获取总记录数
    const total = await InventoryHistory.countDocuments({ inventoryId: req.params.id });
    
    res.status(200).json({
      success: true,
      count: history.length,
      total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: history
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    获取库存统计数据
 * @route   GET /api/inventory/stats
 * @access  Private/Admin
 */
exports.getInventoryStats = async (req, res, next) => {
  try {
    // 总库存产品数
    const totalProducts = await Inventory.countDocuments();
    
    // 库存状态统计
    const statusStats = await Inventory.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    // 库存总价值
    const valueStats = await Inventory.aggregate([
      {
        $group: {
          _id: null,
          totalCostValue: { $sum: { $multiply: ['$quantity', '$costPrice'] } },
          totalSellingValue: { $sum: { $multiply: ['$quantity', '$sellingPrice'] } },
          potentialProfit: { 
            $sum: { 
              $subtract: [
                { $multiply: ['$quantity', '$sellingPrice'] },
                { $multiply: ['$quantity', '$costPrice'] }
              ] 
            } 
          }
        }
      }
    ]);
    
    // 库存位置统计
    const locationStats = await Inventory.aggregate([
      { $group: { _id: '$location', count: { $sum: 1 }, totalQuantity: { $sum: '$quantity' } } },
      { $sort: { count: -1 } }
    ]);
    
    // 低库存产品
    const lowStockProducts = await Inventory.find({ status: 'low_stock' })
      .sort({ quantity: 1 })
      .limit(5);
    
    // 缺货产品
    const outOfStockProducts = await Inventory.find({ status: 'out_of_stock' })
      .sort({ updatedAt: -1 })
      .limit(5);
    
    // 最近库存变动
    const recentMovements = await InventoryHistory.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('inventoryId', 'productName productCode')
      .populate('createdBy', 'username');
    
    res.status(200).json({
      success: true,
      data: {
        totalProducts,
        statusStats: statusStats.reduce((acc, curr) => {
          acc[curr._id] = curr.count;
          return acc;
        }, {}),
        inventoryValue: valueStats.length > 0 ? {
          totalCostValue: valueStats[0].totalCostValue,
          totalSellingValue: valueStats[0].totalSellingValue,
          potentialProfit: valueStats[0].potentialProfit
        } : {
          totalCostValue: 0,
          totalSellingValue: 0,
          potentialProfit: 0
        },
        locationStats,
        lowStockProducts,
        outOfStockProducts,
        recentMovements
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    批量导入库存
 * @route   POST /api/inventory/import
 * @access  Private/Admin
 */
exports.importInventory = async (req, res, next) => {
  try {
    const { inventoryItems } = req.body;
    
    if (!Array.isArray(inventoryItems) || inventoryItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: '无效的库存数据格式'
      });
    }
    
    const results = {
      success: [],
      failed: []
    };
    
    // 逐个处理库存项
    for (const item of inventoryItems) {
      try {
        // 检查产品编码是否已存在
        const existingInventory = await Inventory.findOne({ productCode: item.productCode });
        
        if (existingInventory) {
          // 如果存在，则更新库存信息（可选择性更新）
          if (item.updateIfExists) {
            const previousQuantity = existingInventory.quantity;
            const newQuantity = item.quantity;
            
            // 更新库存记录
            const updatedInventory = await Inventory.findOneAndUpdate(
              { productCode: item.productCode },
              {
                productName: item.productName || existingInventory.productName,
                quantity: newQuantity,
                unit: item.unit || existingInventory.unit,
                costPrice: item.costPrice || existingInventory.costPrice,
                sellingPrice: item.sellingPrice || existingInventory.sellingPrice,
                location: item.location || existingInventory.location,
                status: newQuantity === 0 ? 'out_of_stock' : 
                        newQuantity <= existingInventory.alertThreshold ? 'low_stock' : 'in_stock',
                description: item.description || existingInventory.description
              },
              { new: true }
            );
            
            // 创建库存历史记录
            await InventoryHistory.create({
              inventoryId: updatedInventory._id,
              productCode: updatedInventory.productCode,
              type: 'import',
              quantity: Math.abs(newQuantity - previousQuantity),
              previousQuantity,
              newQuantity,
              notes: '批量导入更新',
              createdBy: req.user._id
            });
            
            results.success.push({
              productCode: item.productCode,
              message: '库存记录已更新'
            });
          } else {
            // 如果不允许更新，则添加到失败列表
            results.failed.push({
              productCode: item.productCode,
              message: '产品编码已存在'
            });
          }
        } else {
          // 如果不存在，则创建新库存记录
          const newInventory = await Inventory.create({
            productName: item.productName,
            productCode: item.productCode,
            quantity: item.quantity,
            unit: item.unit,
            costPrice: item.costPrice,
            sellingPrice: item.sellingPrice,
            location: item.location,
            status: item.quantity === 0 ? 'out_of_stock' : 
                    item.quantity <= (item.alertThreshold || 10) ? 'low_stock' : 'in_stock',
            alertThreshold: item.alertThreshold || 10,
            description: item.description,
            createdBy: req.user._id
          });
          
          // 创建库存历史记录
          await InventoryHistory.create({
            inventoryId: newInventory._id,
            productCode: newInventory.productCode,
            type: 'initial',
            quantity: newInventory.quantity,
            previousQuantity: 0,
            newQuantity: newInventory.quantity,
            notes: '批量导入初始库存',
            createdBy: req.user._id
          });
          
          results.success.push({
            productCode: item.productCode,
            message: '库存记录已创建'
          });
        }
      } catch (error) {
        // 记录单个项目的错误
        results.failed.push({
          productCode: item.productCode,
          message: error.message || '处理失败'
        });
      }
    }
    
    res.status(200).json({
      success: true,
      message: `成功导入 ${results.success.length} 条库存记录，失败 ${results.failed.length} 条`,
      data: results
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    导出库存数据
 * @route   GET /api/inventory/export
 * @access  Private/Admin
 */
exports.exportInventory = async (req, res, next) => {
  try {
    // 过滤参数
    const filter = {};
    
    // 产品名称过滤
    if (req.query.productName) {
      filter.productName = { $regex: req.query.productName, $options: 'i' };
    }
    
    // 产品编码过滤
    if (req.query.productCode) {
      filter.productCode = { $regex: req.query.productCode, $options: 'i' };
    }
    
    // 库存状态过滤
    if (req.query.status) {
      filter.status = req.query.status;
    }
    
    // 执行查询
    const inventory = await Inventory.find(filter).sort({ productCode: 1 });
    
    // 格式化数据用于导出
    const formattedInventory = inventory.map(item => ({
      id: item._id,
      productName: item.productName,
      productCode: item.productCode,
      quantity: item.quantity,
      unit: item.unit,
      costPrice: item.costPrice,
      sellingPrice: item.sellingPrice,
      location: item.location,
      status: item.status,
      alertThreshold: item.alertThreshold,
      description: item.description,
      createdAt: item.createdAt.toISOString(),
      updatedAt: item.updatedAt.toISOString()
    }));
    
    res.status(200).json({
      success: true,
      count: formattedInventory.length,
      data: formattedInventory
    });
  } catch (error) {
    next(error);
  }
};