const Agent = require('../models/agent.model');
const Sale = require('../models/sale.model');
const Transaction = require('../models/transaction.model');
const Inventory = require('../models/inventory.model');
const Logistics = require('../models/logistics.model');
const { errorHandler } = require('../middleware/error.middleware');
const fs = require('fs');
const path = require('path');
const csv = require('fast-csv');
const ExcelJS = require('exceljs');
const bcrypt = require('bcryptjs');
const multer = require('multer');
const mongoose = require('mongoose');

// 配置文件上传
const storage = multer.diskStorage({
  destination: function(req, file, cb) {
    const uploadDir = path.join(__dirname, '../../uploads/temp');
    // 确保目录存在
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function(req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + ext);
  }
});

// 文件过滤器
const fileFilter = (req, file, cb) => {
  // 接受csv和excel文件
  if (file.mimetype === 'text/csv' || 
      file.mimetype === 'application/vnd.ms-excel' ||
      file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet') {
    cb(null, true);
  } else {
    cb(new Error('不支持的文件类型，请上传CSV或Excel文件'), false);
  }
};

exports.upload = multer({ 
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 } // 限制10MB
});

/**
 * 解析上传的文件
 * @param {Object} req - 请求对象
 * @returns {Promise<Array>} - 解析后的数据数组
 */
const parseUploadedFile = async (req) => {
  if (!req.file) {
    throw new Error('未上传文件');
  }

  const filePath = req.file.path;
  const fileExt = path.extname(filePath).toLowerCase();
  let data = [];

  try {
    if (fileExt === '.csv') {
      // 解析CSV文件
      return new Promise((resolve, reject) => {
        fs.createReadStream(filePath)
          .pipe(csv.parse({ headers: true, ignoreEmpty: true }))
          .on('error', error => reject(error))
          .on('data', row => data.push(row))
          .on('end', () => {
            // 删除临时文件
            fs.unlink(filePath, err => {
              if (err) console.error('删除临时文件失败:', err);
            });
            resolve(data);
          });
      });
    } else if (fileExt === '.xlsx' || fileExt === '.xls') {
      // 解析Excel文件
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.readFile(filePath);
      
      const worksheet = workbook.getWorksheet(1); // 获取第一个工作表
      const headers = [];
      
      // 获取表头
      worksheet.getRow(1).eachCell((cell, colNumber) => {
        headers[colNumber - 1] = cell.value ? cell.value.replace('*', '').trim() : '';
      });
      
      // 获取数据行
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) { // 跳过表头行
          const rowData = {};
          row.eachCell((cell, colNumber) => {
            if (headers[colNumber - 1]) {
              rowData[headers[colNumber - 1]] = cell.value;
            }
          });
          data.push(rowData);
        }
      });
      
      // 删除临时文件
      fs.unlink(filePath, err => {
        if (err) console.error('删除临时文件失败:', err);
      });
      
      return data;
    } else {
      throw new Error('不支持的文件类型');
    }
  } catch (error) {
    // 确保删除临时文件
    fs.unlink(filePath, err => {
      if (err) console.error('删除临时文件失败:', err);
    });
    throw error;
  }
};

/**
 * @desc    导入代理数据
 * @route   POST /api/import/agents
 * @access  Private/Admin
 */
exports.importAgents = async (req, res, next) => {
  try {
    const data = await parseUploadedFile(req);
    
    if (!data || data.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有可导入的数据'
      });
    }
    
    const results = {
      total: data.length,
      success: 0,
      failed: 0,
      errors: []
    };
    
    // 开始事务
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        
        // 验证必填字段
        if (!item.username || !item.password || !item.name || !item.phone) {
          results.failed++;
          results.errors.push({
            row: i + 2, // Excel行号从2开始（1是表头）
            message: '缺少必填字段',
            data: item
          });
          continue;
        }
        
        // 检查用户名是否已存在
        const existingAgent = await Agent.findOne({ username: item.username });
        if (existingAgent) {
          results.failed++;
          results.errors.push({
            row: i + 2,
            message: '用户名已存在',
            data: item
          });
          continue;
        }
        
        // 处理上级代理
        let parent = null;
        if (item.parentUsername) {
          parent = await Agent.findOne({ username: item.parentUsername });
          if (!parent) {
            results.failed++;
            results.errors.push({
              row: i + 2,
              message: '上级代理不存在',
              data: item
            });
            continue;
          }
        }
        
        // 创建新代理
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(item.password, salt);
        
        // 生成唯一ID
        const timestamp = new Date().getTime();
        const randomNum = Math.floor(Math.random() * 10000);
        const generatedId = `AG${timestamp}${randomNum}`;
        
        const newAgent = new Agent({
          id: generatedId,
          username: item.username,
          password: hashedPassword,
          name: item.name,
          email: item.email || '',
          phone: item.phone,
          address: item.address || '',
          level: parseInt(item.level) || 1,
          parent: parent ? parent._id : null,
          commissionRate: parseFloat(item.commissionRate) || 0,
          createdBy: req.user._id
        });
        
        await newAgent.save({ session });
        results.success++;
      }
      
      // 提交事务
      await session.commitTransaction();
      session.endSession();
      
      return res.status(200).json({
        success: true,
        message: `成功导入 ${results.success} 条记录，失败 ${results.failed} 条`,
        results
      });
    } catch (error) {
      // 回滚事务
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    导入销售记录
 * @route   POST /api/import/sales
 * @access  Private/Admin
 */
exports.importSales = async (req, res, next) => {
  try {
    const data = await parseUploadedFile(req);
    
    if (!data || data.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有可导入的数据'
      });
    }
    
    const results = {
      total: data.length,
      success: 0,
      failed: 0,
      errors: []
    };
    
    // 开始事务
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        
        // 验证必填字段
        if (!item.date || !item.agentUsername || !item.customer || 
            !item.product || !item.quantity || !item.unitPrice || 
            !item.paymentMethod || !item.status) {
          results.failed++;
          results.errors.push({
            row: i + 2,
            message: '缺少必填字段',
            data: item
          });
          continue;
        }
        
        // 查找代理
        const agent = await Agent.findOne({ username: item.agentUsername });
        if (!agent) {
          results.failed++;
          results.errors.push({
            row: i + 2,
            message: '代理不存在',
            data: item
          });
          continue;
        }
        
        // 计算总金额和佣金
        const quantity = parseFloat(item.quantity);
        const unitPrice = parseFloat(item.unitPrice);
        const totalAmount = quantity * unitPrice;
        const commission = totalAmount * agent.commissionRate;
        
        // 创建销售记录
        const newSale = new Sale({
          date: new Date(item.date),
          agent: agent._id,
          customer: item.customer,
          product: item.product,
          quantity,
          unitPrice,
          totalAmount,
          commission,
          paymentMethod: item.paymentMethod,
          status: item.status,
          notes: item.notes || '',
          createdBy: req.user._id
        });
        
        await newSale.save({ session });
        results.success++;
      }
      
      // 提交事务
      await session.commitTransaction();
      session.endSession();
      
      return res.status(200).json({
        success: true,
        message: `成功导入 ${results.success} 条记录，失败 ${results.failed} 条`,
        results
      });
    } catch (error) {
      // 回滚事务
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    导入库存数据
 * @route   POST /api/import/inventory
 * @access  Private/Admin
 */
exports.importInventory = async (req, res, next) => {
  try {
    const data = await parseUploadedFile(req);
    
    if (!data || data.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有可导入的数据'
      });
    }
    
    const results = {
      total: data.length,
      success: 0,
      failed: 0,
      created: 0,
      updated: 0,
      errors: []
    };
    
    // 开始事务
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        
        // 验证必填字段
        if (!item.productName || !item.productCode || !item.quantity || 
            !item.unit || !item.costPrice || !item.sellingPrice || !item.location) {
          results.failed++;
          results.errors.push({
            row: i + 2,
            message: '缺少必填字段',
            data: item
          });
          continue;
        }
        
        // 检查产品编码是否已存在
        const existingInventory = await Inventory.findOne({ productCode: item.productCode });
        
        // 确定是否更新现有记录
        const updateIfExists = item.updateIfExists === 'true' || item.updateIfExists === true;
        
        if (existingInventory && !updateIfExists) {
          results.failed++;
          results.errors.push({
            row: i + 2,
            message: '产品编码已存在且未设置更新',
            data: item
          });
          continue;
        }
        
        if (existingInventory && updateIfExists) {
          // 更新现有库存
          existingInventory.productName = item.productName;
          existingInventory.quantity = parseFloat(item.quantity);
          existingInventory.unit = item.unit;
          existingInventory.costPrice = parseFloat(item.costPrice);
          existingInventory.sellingPrice = parseFloat(item.sellingPrice);
          existingInventory.location = item.location;
          existingInventory.alertThreshold = parseFloat(item.alertThreshold) || 0;
          existingInventory.description = item.description || '';
          existingInventory.updatedBy = req.user._id;
          
          await existingInventory.save({ session });
          results.success++;
          results.updated++;
        } else {
          // 创建新库存
          const newInventory = new Inventory({
            productName: item.productName,
            productCode: item.productCode,
            quantity: parseFloat(item.quantity),
            unit: item.unit,
            costPrice: parseFloat(item.costPrice),
            sellingPrice: parseFloat(item.sellingPrice),
            location: item.location,
            alertThreshold: parseFloat(item.alertThreshold) || 0,
            description: item.description || '',
            createdBy: req.user._id
          });
          
          await newInventory.save({ session });
          results.success++;
          results.created++;
        }
      }
      
      // 提交事务
      await session.commitTransaction();
      session.endSession();
      
      return res.status(200).json({
        success: true,
        message: `成功导入 ${results.success} 条记录（新建 ${results.created} 条，更新 ${results.updated} 条），失败 ${results.failed} 条`,
        results
      });
    } catch (error) {
      // 回滚事务
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    导入物流数据
 * @route   POST /api/import/logistics
 * @access  Private/Admin
 */
exports.importLogistics = async (req, res, next) => {
  try {
    const data = await parseUploadedFile(req);
    
    if (!data || data.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有可导入的数据'
      });
    }
    
    const results = {
      total: data.length,
      success: 0,
      failed: 0,
      errors: []
    };
    
    // 开始事务
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        
        // 验证必填字段
        if (!item.trackingNumber || !item.carrier || 
            !item.senderName || !item.senderPhone || !item.senderAddress || 
            !item.senderCity || !item.senderProvince || 
            !item.receiverName || !item.receiverPhone || !item.receiverAddress || 
            !item.receiverCity || !item.receiverProvince || 
            !item.weight || !item.length || !item.width || !item.height || 
            !item.shippingCost) {
          results.failed++;
          results.errors.push({
            row: i + 2,
            message: '缺少必填字段',
            data: item
          });
          continue;
        }
        
        // 检查跟踪号是否已存在
        const existingLogistics = await Logistics.findOne({ trackingNumber: item.trackingNumber });
        if (existingLogistics) {
          results.failed++;
          results.errors.push({
            row: i + 2,
            message: '跟踪号已存在',
            data: item
          });
          continue;
        }
        
        // 创建物流记录
        const newLogistics = new Logistics({
          trackingNumber: item.trackingNumber,
          carrier: item.carrier,
          senderInfo: {
            name: item.senderName,
            phone: item.senderPhone,
            address: item.senderAddress,
            city: item.senderCity,
            province: item.senderProvince,
            postalCode: item.senderPostalCode || ''
          },
          receiverInfo: {
            name: item.receiverName,
            phone: item.receiverPhone,
            address: item.receiverAddress,
            city: item.receiverCity,
            province: item.receiverProvince,
            postalCode: item.receiverPostalCode || ''
          },
          packageInfo: {
            weight: parseFloat(item.weight),
            dimensions: {
              length: parseFloat(item.length),
              width: parseFloat(item.width),
              height: parseFloat(item.height)
            },
            declaredValue: parseFloat(item.declaredValue) || 0
          },
          shippingCost: parseFloat(item.shippingCost),
          currentStatus: 'pending',
          estimatedDelivery: item.estimatedDelivery ? new Date(item.estimatedDelivery) : null,
          notes: item.notes || '',
          createdBy: req.user._id
        });
        
        await newLogistics.save({ session });
        results.success++;
      }
      
      // 提交事务
      await session.commitTransaction();
      session.endSession();
      
      return res.status(200).json({
        success: true,
        message: `成功导入 ${results.success} 条记录，失败 ${results.failed} 条`,
        results
      });
    } catch (error) {
      // 回滚事务
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    导入交易记录
 * @route   POST /api/import/transactions
 * @access  Private/Admin
 */
exports.importTransactions = async (req, res, next) => {
  try {
    const data = await parseUploadedFile(req);
    
    if (!data || data.length === 0) {
      return res.status(400).json({
        success: false,
        message: '没有可导入的数据'
      });
    }
    
    const results = {
      total: data.length,
      success: 0,
      failed: 0,
      errors: []
    };
    
    // 开始事务
    const session = await mongoose.startSession();
    session.startTransaction();
    
    try {
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        
        // 验证必填字段
        if (!item.type || !item.category || !item.amount || 
            !item.date || !item.paymentMethod) {
          results.failed++;
          results.errors.push({
            row: i + 2,
            message: '缺少必填字段',
            data: item
          });
          continue;
        }
        
        // 验证交易类型
        if (item.type !== 'income' && item.type !== 'expense') {
          results.failed++;
          results.errors.push({
            row: i + 2,
            message: '交易类型必须是 income 或 expense',
            data: item
          });
          continue;
        }
        
        // 创建交易记录
        const newTransaction = new Transaction({
          type: item.type,
          category: item.category,
          amount: parseFloat(item.amount),
          date: new Date(item.date),
          description: item.description || '',
          paymentMethod: item.paymentMethod,
          relatedTo: item.relatedTo || '',
          createdBy: req.user._id
        });
        
        await newTransaction.save({ session });
        results.success++;
      }
      
      // 提交事务
      await session.commitTransaction();
      session.endSession();
      
      return res.status(200).json({
        success: true,
        message: `成功导入 ${results.success} 条记录，失败 ${results.failed} 条`,
        results
      });
    } catch (error) {
      // 回滚事务
      await session.abortTransaction();
      session.endSession();
      throw error;
    }
  } catch (error) {
    next(error);
  }
};