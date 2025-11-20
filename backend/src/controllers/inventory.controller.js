const Inventory = require('../models/inventory.model');
const InventoryHistory = require('../models/inventoryHistory.model');
const { errorHandler } = require('../middleware/error.middleware');
const PRODUCT_CODES = require('../constants/productCodes');
const mongoose = require('mongoose');



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
    if (req.query.productName || req.query.name) {
      const nameQuery = req.query.name || req.query.productName;
      filter.name = { $regex: nameQuery, $options: 'i' };
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
    console.log('删除库存，ID参数:', req.params.id);
    
    // 尝试通过MongoDB的_id查找
    let inventory = null;
    
    // 检查ID是否为有效的MongoDB ObjectId
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(req.params.id);
    
    if (isValidObjectId) {
      // 如果是有效的ObjectId，使用findById
      inventory = await Inventory.findById(req.params.id);
    }
    
    // 如果通过_id没找到，尝试通过自定义id字段查找
    if (!inventory) {
      inventory = await Inventory.findOne({ id: Number(req.params.id) });
    }

    if (!inventory) {
      console.error('找不到库存记录，ID:', req.params.id);
      return res.status(404).json({
        success: false,
        message: '找不到该库存记录'
      });
    }

    // 检查是否有关联的库存历史记录
    const historyCount = await InventoryHistory.countDocuments({ inventoryId: inventory._id });
    console.log(`库存记录 ${inventory.id} 有 ${historyCount} 条历史记录`);

    // 删除关联的库存历史记录（无论有多少条）
    const deletedHistoryResult = await InventoryHistory.deleteMany({ inventoryId: inventory._id });
    console.log(`已删除 ${deletedHistoryResult.deletedCount} 条库存历史记录`);
    
    // 删除库存记录
    await inventory.deleteOne();

    res.status(200).json({
      success: true,
      message: '库存记录已成功删除',
      data: {}
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
    console.log('获取库存详情，ID参数:', req.params.id);
    
    // 尝试通过MongoDB的_id查找
    let inventory = null;
    
    // 检查ID是否为有效的MongoDB ObjectId
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(req.params.id);
    
    if (isValidObjectId) {
      // 如果是有效的ObjectId，使用findById
      inventory = await Inventory.findById(req.params.id);
    }
    
    // 如果通过_id没找到，尝试通过自定义id字段查找
    if (!inventory) {
      inventory = await Inventory.findOne({ id: Number(req.params.id) });
    }
    
    if (!inventory) {
      console.error('找不到库存记录，ID:', req.params.id);
      return res.status(404).json({
        success: false,
        message: '找不到该库存记录'
      });
    }
    
    console.log('找到库存记录:', inventory);

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
    const { name, productName, productCode, quantity, unit, location, status, lowThreshold, costPrice, sellingPrice, description } = req.body;

    // 支持两种字段名：name（新）和productName（旧），优先使用name
    const productNameValue = name || productName;
    
    if (!productNameValue) {
      return res.status(400).json({
        success: false,
        message: '商品名称是必填项'
      });
    }

    // 验证产品编码是否为有效的枚举值
    const validProductCodes = Object.values(PRODUCT_CODES);
    if (!validProductCodes.includes(productCode)) {
      return res.status(400).json({
        success: false,
        message: '无效的产品编码，有效值为：1(勺子)、2(瓶子)、3(贴纸)、4(唐肽燃)'
      });
    }

    // 获取当前最大id值
    const maxIdInventory = await Inventory.findOne().sort({ id: -1 });
    // 如果没有找到记录或id为undefined，则使用1作为初始id
    const nextId = (maxIdInventory && maxIdInventory.id) ? Number(maxIdInventory.id) + 1 : 1;
    
    // 创建库存记录
    const inventoryData = {
      id: nextId,
      name: productNameValue,
      productCode,
      quantity,
      unit,
      location,
      status,
      lowThreshold,
      costPrice,
      sellingPrice,
      description
    };
    
    const inventory = await Inventory.create(inventoryData);

    // 创建库存历史记录
    const historyData = {
      inventoryId: inventory._id,
      productCode,
      type: 'initial',
      quantity,
      previousQuantity: 0,
      newQuantity: quantity,
      notes: '初始库存'
    };
    
    await InventoryHistory.create(historyData);

    res.status(201).json({
      success: true,
      data: inventory
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    更新库存记录（统一接口，支持基本信息更新和数量调整）
 * @route   PUT /api/inventory/:id
 * @access  Private/Admin
 */
exports.updateInventory = async (req, res, next) => {
  try {
    console.log('更新库存，ID参数:', req.params.id);
    console.log('请求体数据:', req.body);
    
    // 解构请求体，支持前端传来的字段名和新增的调整字段
    const { 
      name, productName, productCode, 
      unit, location, status, lowThreshold, quantity,
      // 新增：数量调整相关字段
      adjustmentType, adjustmentQuantity, adjustmentReason, notes
    } = req.body;
    
    // 尝试通过MongoDB的_id查找
    let inventory = null;
    
    // 检查ID是否为有效的MongoDB ObjectId
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(req.params.id);
    
    if (isValidObjectId) {
      // 如果是有效的ObjectId，使用findById
      inventory = await Inventory.findById(req.params.id);
    }
    
    // 如果通过_id没找到，尝试通过自定义id字段查找
    if (!inventory) {
      inventory = await Inventory.findOne({ id: Number(req.params.id) });
    }
    
    if (!inventory) {
      console.error('找不到库存记录，ID:', req.params.id);
      return res.status(404).json({
        success: false,
        message: '找不到该库存记录'
      });
    }
    
    console.log('找到库存记录:', inventory);
    
    // 记录原始数量，用于历史记录
    const previousQuantity = inventory.quantity;
    let newQuantity = previousQuantity;
    let isQuantityChanged = false;
    
    // 准备更新数据
    const updateData = {};
    
    // 处理数量调整逻辑
    if (adjustmentType && adjustmentQuantity) {
      // 验证调整类型
      if (!['increase', 'decrease'].includes(adjustmentType)) {
        return res.status(400).json({
          success: false,
          message: '无效的调整类型，必须是 increase 或 decrease'
        });
      }
      
      // 验证调整数量
      if (!adjustmentQuantity || adjustmentQuantity <= 0) {
        return res.status(400).json({
          success: false,
          message: '调整数量必须大于0'
        });
      }
      
      // 计算新数量
      if (adjustmentType === 'increase') {
        newQuantity = previousQuantity + adjustmentQuantity;
      } else {
        // 检查库存是否足够
        if (previousQuantity < adjustmentQuantity) {
          return res.status(400).json({
            success: false,
            message: '库存不足，无法减少'
          });
        }
        newQuantity = previousQuantity - adjustmentQuantity;
      }
      
      updateData.quantity = newQuantity;
      isQuantityChanged = true;
      
      // 根据新数量自动更新状态
      if (newQuantity === 0) {
        updateData.status = 'out';
      } else if (newQuantity <= (inventory.lowThreshold || 0)) {
        updateData.status = 'low';
      } else {
        updateData.status = 'normal';
      }
    } else if (quantity !== undefined) {
      // 直接设置数量
      if (quantity !== previousQuantity) {
        newQuantity = quantity;
        updateData.quantity = quantity;
        isQuantityChanged = true;
        
        // 根据新数量自动更新状态
        if (newQuantity === 0) {
          updateData.status = 'out';
        } else if (newQuantity <= (inventory.lowThreshold || 0)) {
          updateData.status = 'low';
        } else {
          updateData.status = 'normal';
        }
      }
    }
    
    // 处理其他字段更新，支持前端传来的不同字段名
    if (name !== undefined) updateData.name = name;
    else if (productName !== undefined) updateData.name = productName;
    
    if (productCode !== undefined) updateData.productCode = productCode;
    if (unit !== undefined) updateData.unit = unit;
    if (location !== undefined) updateData.location = location;
    if (status !== undefined && !isQuantityChanged) updateData.status = status; // 如果没有数量变化，允许手动设置状态
    if (lowThreshold !== undefined) updateData.lowThreshold = lowThreshold;
    
    console.log('更新数据:', updateData);
    
    // 更新库存记录
    console.log('使用ID更新库存:', inventory._id);
    console.log('原始ID字段值:', inventory.id);
    
    // 确保返回的数据包含原始的id字段
    const originalId = inventory.id;
    
    // 在更新数据中保留原始id字段
    if (originalId) {
      updateData.id = originalId;
    }
    
    console.log('包含id字段的更新数据:', updateData);
    
    inventory = await Inventory.findByIdAndUpdate(
      inventory._id, // 使用找到的记录的_id
      updateData,
      { new: true, runValidators: true }
    );
    
    console.log('更新后的库存记录:', inventory);
    
    // 确保返回的数据包含原始的id字段
    if (inventory && originalId) {
      inventory.id = originalId;
      console.log('手动设置id字段后的库存记录:', inventory);
    }
    
    // 如果数量发生变化，创建库存历史记录
    if (isQuantityChanged) {
      const historyData = {
        inventoryId: inventory._id,
        productCode: inventory.productCode,
        type: adjustmentType || (newQuantity > previousQuantity ? 'increase' : 'decrease'),
        quantity: Math.abs(newQuantity - previousQuantity),
        previousQuantity,
        newQuantity,
        notes: adjustmentReason || notes || '库存更新',
        // createdBy: req.user ? req.user._id : null // 如果有用户信息则记录
      };
      
      try {
        await InventoryHistory.create(historyData);
        console.log('库存历史记录已创建:', historyData);
      } catch (historyError) {
        console.error('创建库存历史记录失败:', historyError);
        // 不影响主要更新操作，只记录错误
      }
    }

    res.status(200).json({
      success: true,
      data: inventory,
      quantityChanged: isQuantityChanged,
      previousQuantity: isQuantityChanged ? previousQuantity : undefined,
      newQuantity: isQuantityChanged ? newQuantity : undefined
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
    // 尝试通过MongoDB的_id查找
    let inventory = null;
    
    // 检查ID是否为有效的MongoDB ObjectId
    const isValidObjectId = /^[0-9a-fA-F]{24}$/.test(req.params.id);
    
    if (isValidObjectId) {
      // 如果是有效的ObjectId，使用findById
      inventory = await Inventory.findById(req.params.id);
    }
    
    // 如果通过_id没找到，尝试通过自定义id字段查找
    if (!inventory) {
      inventory = await Inventory.findOne({ id: Number(req.params.id) });
    }
    
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
    
    // 获取库存历史记录，使用inventory._id而不是req.params.id
    const history = await InventoryHistory.find({ inventoryId: inventory._id })
      .sort({ createdAt: -1 })
      .skip(startIndex)
      .limit(limit)
      .populate('createdBy', 'username');
    
    // 获取总记录数
    const total = await InventoryHistory.countDocuments({ inventoryId: inventory._id });
    
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
          totalCostValue: { $sum: { $multiply: ['$quantity', { $ifNull: ['$costPrice', 0] }] } },
          totalSellingValue: { $sum: { $multiply: ['$quantity', { $ifNull: ['$sellingPrice', 0] }] } },
          potentialProfit: { 
            $sum: { 
              $subtract: [
                { $multiply: ['$quantity', { $ifNull: ['$sellingPrice', 0] }] },
                { $multiply: ['$quantity', { $ifNull: ['$costPrice', 0] }] }
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
    const lowStockProducts = await Inventory.find({ status: 'low' })
      .sort({ quantity: 1 })
      .limit(5);
    
    // 缺货产品
    const outOfStockProducts = await Inventory.find({ status: 'out' })
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
          totalCostValue: valueStats[0].totalCostValue || 0,
          totalSellingValue: valueStats[0].totalSellingValue || 0,
          potentialProfit: valueStats[0].potentialProfit || 0
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
      name: item.name,
      productCode: item.productCode,
      quantity: item.quantity,
      unit: item.unit,
      costPrice: item.costPrice,
      sellingPrice: item.sellingPrice,
      location: item.location,
      status: item.status,
      lowThreshold: item.lowThreshold,
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