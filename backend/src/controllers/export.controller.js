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
const moment = require('moment');

/**
 * @desc    导出代理数据
 * @route   GET /api/export/agents
 * @access  Private/Admin
 */
exports.exportAgents = async (req, res, next) => {
  try {
    // 查询所有代理
    const agents = await Agent.find()
      .populate('parent', 'username name')
      .populate('createdBy', 'username');

    // 格式化数据
    const formattedAgents = agents.map(agent => ({
      id: agent._id,
      username: agent.username,
      name: agent.name,
      email: agent.email,
      phone: agent.phone,
      address: agent.address,
      level: agent.level,
      parent: agent.parent ? agent.parent.name : '无',
      status: agent.status,
      commissionRate: agent.commissionRate,
      createdBy: agent.createdBy ? agent.createdBy.username : '系统',
      createdAt: moment(agent.createdAt).format('YYYY-MM-DD HH:mm:ss')
    }));

    // 根据请求的格式返回数据
    const format = req.query.format || 'json';
    
    if (format === 'json') {
      return res.status(200).json({
        success: true,
        count: formattedAgents.length,
        data: formattedAgents
      });
    } else if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="agents.csv"');
      
      const csvStream = csv.format({ headers: true });
      csvStream.pipe(res);
      
      formattedAgents.forEach(agent => csvStream.write(agent));
      csvStream.end();
    } else if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('代理列表');
      
      // 设置表头
      worksheet.columns = [
        { header: 'ID', key: 'id', width: 30 },
        { header: '用户名', key: 'username', width: 15 },
        { header: '姓名', key: 'name', width: 15 },
        { header: '邮箱', key: 'email', width: 20 },
        { header: '电话', key: 'phone', width: 15 },
        { header: '地址', key: 'address', width: 30 },
        { header: '级别', key: 'level', width: 10 },
        { header: '上级代理', key: 'parent', width: 15 },
        { header: '状态', key: 'status', width: 10 },
        { header: '佣金比例', key: 'commissionRate', width: 10 },
        { header: '创建者', key: 'createdBy', width: 15 },
        { header: '创建时间', key: 'createdAt', width: 20 }
      ];
      
      // 添加数据
      formattedAgents.forEach(agent => worksheet.addRow(agent));
      
      // 设置响应头
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="agents.xlsx"');
      
      // 写入响应
      await workbook.xlsx.write(res);
      res.end();
    } else {
      return res.status(400).json({
        success: false,
        message: '不支持的导出格式'
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    导出销售记录
 * @route   GET /api/export/sales
 * @access  Private/Admin
 */
exports.exportSales = async (req, res, next) => {
  try {
    // 过滤参数
    const filter = {};
    
    // 日期范围过滤
    if (req.query.startDate && req.query.endDate) {
      filter.date = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    } else if (req.query.startDate) {
      filter.date = { $gte: new Date(req.query.startDate) };
    } else if (req.query.endDate) {
      filter.date = { $lte: new Date(req.query.endDate) };
    }
    
    // 代理过滤
    if (req.query.agentId) {
      filter.agent = req.query.agentId;
    }
    
    // 查询销售记录
    const sales = await Sale.find(filter)
      .populate('agent', 'username name')
      .populate('createdBy', 'username');

    // 格式化数据
    const formattedSales = sales.map(sale => ({
      id: sale._id,
      date: moment(sale.date).format('YYYY-MM-DD'),
      agent: sale.agent ? `${sale.agent.name} (${sale.agent.username})` : '无',
      customer: sale.customer,
      product: sale.product,
      quantity: sale.quantity,
      unitPrice: sale.unitPrice,
      totalAmount: sale.totalAmount,
      commission: sale.commission,
      paymentMethod: sale.paymentMethod,
      status: sale.status,
      notes: sale.notes,
      createdBy: sale.createdBy ? sale.createdBy.username : '系统',
      createdAt: moment(sale.createdAt).format('YYYY-MM-DD HH:mm:ss')
    }));

    // 根据请求的格式返回数据
    const format = req.query.format || 'json';
    
    if (format === 'json') {
      return res.status(200).json({
        success: true,
        count: formattedSales.length,
        data: formattedSales
      });
    } else if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="sales.csv"');
      
      const csvStream = csv.format({ headers: true });
      csvStream.pipe(res);
      
      formattedSales.forEach(sale => csvStream.write(sale));
      csvStream.end();
    } else if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('销售记录');
      
      // 设置表头
      worksheet.columns = [
        { header: 'ID', key: 'id', width: 30 },
        { header: '日期', key: 'date', width: 15 },
        { header: '代理', key: 'agent', width: 20 },
        { header: '客户', key: 'customer', width: 20 },
        { header: '产品', key: 'product', width: 20 },
        { header: '数量', key: 'quantity', width: 10 },
        { header: '单价', key: 'unitPrice', width: 10 },
        { header: '总金额', key: 'totalAmount', width: 10 },
        { header: '佣金', key: 'commission', width: 10 },
        { header: '支付方式', key: 'paymentMethod', width: 15 },
        { header: '状态', key: 'status', width: 10 },
        { header: '备注', key: 'notes', width: 30 },
        { header: '创建者', key: 'createdBy', width: 15 },
        { header: '创建时间', key: 'createdAt', width: 20 }
      ];
      
      // 添加数据
      formattedSales.forEach(sale => worksheet.addRow(sale));
      
      // 设置响应头
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="sales.xlsx"');
      
      // 写入响应
      await workbook.xlsx.write(res);
      res.end();
    } else {
      return res.status(400).json({
        success: false,
        message: '不支持的导出格式'
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    导出交易记录
 * @route   GET /api/export/transactions
 * @access  Private/Admin
 */
exports.exportTransactions = async (req, res, next) => {
  try {
    // 过滤参数
    const filter = {};
    
    // 交易类型过滤
    if (req.query.type) {
      filter.type = req.query.type;
    }
    
    // 日期范围过滤
    if (req.query.startDate && req.query.endDate) {
      filter.date = {
        $gte: new Date(req.query.startDate),
        $lte: new Date(req.query.endDate)
      };
    } else if (req.query.startDate) {
      filter.date = { $gte: new Date(req.query.startDate) };
    } else if (req.query.endDate) {
      filter.date = { $lte: new Date(req.query.endDate) };
    }
    
    // 执行查询
    const transactions = await Transaction.find(filter)
      .sort({ date: -1 })
      .populate('createdBy', 'username');
    
    // 格式化数据
    const formattedTransactions = transactions.map(transaction => ({
      id: transaction._id,
      type: transaction.type,
      category: transaction.category,
      amount: transaction.amount,
      date: moment(transaction.date).format('YYYY-MM-DD'),
      description: transaction.description,
      paymentMethod: transaction.paymentMethod,
      relatedTo: transaction.relatedTo,
      createdBy: transaction.createdBy ? transaction.createdBy.username : '系统',
      createdAt: moment(transaction.createdAt).format('YYYY-MM-DD HH:mm:ss')
    }));

    // 根据请求的格式返回数据
    const format = req.query.format || 'json';
    
    if (format === 'json') {
      return res.status(200).json({
        success: true,
        count: formattedTransactions.length,
        data: formattedTransactions
      });
    } else if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="transactions.csv"');
      
      const csvStream = csv.format({ headers: true });
      csvStream.pipe(res);
      
      formattedTransactions.forEach(transaction => csvStream.write(transaction));
      csvStream.end();
    } else if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('交易记录');
      
      // 设置表头
      worksheet.columns = [
        { header: 'ID', key: 'id', width: 30 },
        { header: '类型', key: 'type', width: 10 },
        { header: '类别', key: 'category', width: 15 },
        { header: '金额', key: 'amount', width: 10 },
        { header: '日期', key: 'date', width: 15 },
        { header: '描述', key: 'description', width: 30 },
        { header: '支付方式', key: 'paymentMethod', width: 15 },
        { header: '关联对象', key: 'relatedTo', width: 20 },
        { header: '创建者', key: 'createdBy', width: 15 },
        { header: '创建时间', key: 'createdAt', width: 20 }
      ];
      
      // 添加数据
      formattedTransactions.forEach(transaction => worksheet.addRow(transaction));
      
      // 设置响应头
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="transactions.xlsx"');
      
      // 写入响应
      await workbook.xlsx.write(res);
      res.end();
    } else {
      return res.status(400).json({
        success: false,
        message: '不支持的导出格式'
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    导出库存数据
 * @route   GET /api/export/inventory
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
    
    // 格式化数据
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
      createdAt: moment(item.createdAt).format('YYYY-MM-DD HH:mm:ss'),
      updatedAt: moment(item.updatedAt).format('YYYY-MM-DD HH:mm:ss')
    }));

    // 根据请求的格式返回数据
    const format = req.query.format || 'json';
    
    if (format === 'json') {
      return res.status(200).json({
        success: true,
        count: formattedInventory.length,
        data: formattedInventory
      });
    } else if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="inventory.csv"');
      
      const csvStream = csv.format({ headers: true });
      csvStream.pipe(res);
      
      formattedInventory.forEach(item => csvStream.write(item));
      csvStream.end();
    } else if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('库存列表');
      
      // 设置表头
      worksheet.columns = [
        { header: 'ID', key: 'id', width: 30 },
        { header: '产品名称', key: 'productName', width: 20 },
        { header: '产品编码', key: 'productCode', width: 15 },
        { header: '数量', key: 'quantity', width: 10 },
        { header: '单位', key: 'unit', width: 10 },
        { header: '成本价', key: 'costPrice', width: 10 },
        { header: '销售价', key: 'sellingPrice', width: 10 },
        { header: '库存位置', key: 'location', width: 15 },
        { header: '状态', key: 'status', width: 15 },
        { header: '警戒阈值', key: 'alertThreshold', width: 10 },
        { header: '描述', key: 'description', width: 30 },
        { header: '创建时间', key: 'createdAt', width: 20 },
        { header: '更新时间', key: 'updatedAt', width: 20 }
      ];
      
      // 添加数据
      formattedInventory.forEach(item => worksheet.addRow(item));
      
      // 设置响应头
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="inventory.xlsx"');
      
      // 写入响应
      await workbook.xlsx.write(res);
      res.end();
    } else {
      return res.status(400).json({
        success: false,
        message: '不支持的导出格式'
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    导出物流数据
 * @route   GET /api/export/logistics
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
    
    // 格式化数据
    const formattedLogistics = logistics.map(item => ({
      id: item._id,
      trackingNumber: item.trackingNumber,
      carrier: item.carrier,
      senderName: item.senderInfo.name,
      senderAddress: item.senderInfo.address,
      receiverName: item.receiverInfo.name,
      receiverAddress: item.receiverInfo.address,
      packageWeight: item.packageInfo.weight,
      shippingCost: item.shippingCost,
      currentStatus: item.currentStatus,
      estimatedDelivery: item.estimatedDelivery ? moment(item.estimatedDelivery).format('YYYY-MM-DD') : '',
      deliveredAt: item.deliveredAt ? moment(item.deliveredAt).format('YYYY-MM-DD HH:mm:ss') : '',
      notes: item.notes,
      createdBy: item.createdBy ? item.createdBy.username : '系统',
      createdAt: moment(item.createdAt).format('YYYY-MM-DD HH:mm:ss')
    }));

    // 根据请求的格式返回数据
    const format = req.query.format || 'json';
    
    if (format === 'json') {
      return res.status(200).json({
        success: true,
        count: formattedLogistics.length,
        data: formattedLogistics
      });
    } else if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename="logistics.csv"');
      
      const csvStream = csv.format({ headers: true });
      csvStream.pipe(res);
      
      formattedLogistics.forEach(item => csvStream.write(item));
      csvStream.end();
    } else if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('物流订单');
      
      // 设置表头
      worksheet.columns = [
        { header: 'ID', key: 'id', width: 30 },
        { header: '跟踪号', key: 'trackingNumber', width: 20 },
        { header: '承运商', key: 'carrier', width: 15 },
        { header: '发件人', key: 'senderName', width: 15 },
        { header: '发件地址', key: 'senderAddress', width: 30 },
        { header: '收件人', key: 'receiverName', width: 15 },
        { header: '收件地址', key: 'receiverAddress', width: 30 },
        { header: '包裹重量', key: 'packageWeight', width: 10 },
        { header: '运费', key: 'shippingCost', width: 10 },
        { header: '当前状态', key: 'currentStatus', width: 15 },
        { header: '预计送达', key: 'estimatedDelivery', width: 15 },
        { header: '实际送达', key: 'deliveredAt', width: 20 },
        { header: '备注', key: 'notes', width: 30 },
        { header: '创建者', key: 'createdBy', width: 15 },
        { header: '创建时间', key: 'createdAt', width: 20 }
      ];
      
      // 添加数据
      formattedLogistics.forEach(item => worksheet.addRow(item));
      
      // 设置响应头
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename="logistics.xlsx"');
      
      // 写入响应
      await workbook.xlsx.write(res);
      res.end();
    } else {
      return res.status(400).json({
        success: false,
        message: '不支持的导出格式'
      });
    }
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    导入数据模板
 * @route   GET /api/export/templates/:type
 * @access  Private/Admin
 */
exports.getImportTemplate = async (req, res, next) => {
  try {
    const { type } = req.params;
    const format = req.query.format || 'excel';
    
    let templateData = [];
    let filename = '';
    let worksheetName = '';
    let columns = [];
    
    // 根据类型设置模板数据
    switch (type) {
      case 'agents':
        templateData = [{
          username: 'agent001',
          password: 'password123',
          name: '张三',
          email: 'agent001@example.com',
          phone: '13800138000',
          address: '北京市朝阳区',
          level: 1,
          parentUsername: '',
          commissionRate: 0.1
        }];
        filename = 'agent_import_template';
        worksheetName = '代理导入模板';
        columns = [
          { header: '用户名*', key: 'username', width: 15 },
          { header: '密码*', key: 'password', width: 15 },
          { header: '姓名*', key: 'name', width: 15 },
          { header: '邮箱', key: 'email', width: 20 },
          { header: '电话*', key: 'phone', width: 15 },
          { header: '地址', key: 'address', width: 30 },
          { header: '级别*', key: 'level', width: 10 },
          { header: '上级代理用户名', key: 'parentUsername', width: 20 },
          { header: '佣金比例*', key: 'commissionRate', width: 10 }
        ];
        break;
      case 'sales':
        templateData = [{
          date: '2023-01-01',
          agentUsername: 'agent001',
          customer: '李四',
          product: '唐肽燃减肥产品',
          quantity: 2,
          unitPrice: 199,
          paymentMethod: 'wechat',
          status: 'completed',
          notes: '首次购买'
        }];
        filename = 'sale_import_template';
        worksheetName = '销售记录导入模板';
        columns = [
          { header: '日期* (YYYY-MM-DD)', key: 'date', width: 20 },
          { header: '代理用户名*', key: 'agentUsername', width: 15 },
          { header: '客户*', key: 'customer', width: 15 },
          { header: '产品*', key: 'product', width: 20 },
          { header: '数量*', key: 'quantity', width: 10 },
          { header: '单价*', key: 'unitPrice', width: 10 },
          { header: '支付方式*', key: 'paymentMethod', width: 15 },
          { header: '状态*', key: 'status', width: 10 },
          { header: '备注', key: 'notes', width: 30 }
        ];
        break;
      case 'inventory':
        templateData = [{
          productName: '唐肽燃减肥产品',
          productCode: 'TTR001',
          quantity: 100,
          unit: '盒',
          costPrice: 99,
          sellingPrice: 199,
          location: '北京仓库',
          alertThreshold: 10,
          description: '30天装',
          updateIfExists: 'true'
        }];
        filename = 'inventory_import_template';
        worksheetName = '库存导入模板';
        columns = [
          { header: '产品名称*', key: 'productName', width: 20 },
          { header: '产品编码*', key: 'productCode', width: 15 },
          { header: '数量*', key: 'quantity', width: 10 },
          { header: '单位*', key: 'unit', width: 10 },
          { header: '成本价*', key: 'costPrice', width: 10 },
          { header: '销售价*', key: 'sellingPrice', width: 10 },
          { header: '库存位置*', key: 'location', width: 15 },
          { header: '警戒阈值', key: 'alertThreshold', width: 10 },
          { header: '描述', key: 'description', width: 30 },
          { header: '存在时更新 (true/false)', key: 'updateIfExists', width: 20 }
        ];
        break;
      case 'logistics':
        templateData = [{
          trackingNumber: 'SF1234567890',
          carrier: '顺丰速运',
          senderName: '唐肽燃公司',
          senderPhone: '010-12345678',
          senderAddress: '北京市朝阳区',
          senderCity: '北京市',
          senderProvince: '北京',
          senderPostalCode: '100000',
          receiverName: '王五',
          receiverPhone: '13900139000',
          receiverAddress: '上海市浦东新区',
          receiverCity: '上海市',
          receiverProvince: '上海',
          receiverPostalCode: '200000',
          weight: 1.5,
          length: 30,
          width: 20,
          height: 10,
          declaredValue: 199,
          shippingCost: 20,
          estimatedDelivery: '2023-01-05',
          notes: '轻拿轻放'
        }];
        filename = 'logistics_import_template';
        worksheetName = '物流导入模板';
        columns = [
          { header: '跟踪号*', key: 'trackingNumber', width: 20 },
          { header: '承运商*', key: 'carrier', width: 15 },
          { header: '发件人姓名*', key: 'senderName', width: 15 },
          { header: '发件人电话*', key: 'senderPhone', width: 15 },
          { header: '发件人地址*', key: 'senderAddress', width: 30 },
          { header: '发件人城市*', key: 'senderCity', width: 15 },
          { header: '发件人省份*', key: 'senderProvince', width: 15 },
          { header: '发件人邮编', key: 'senderPostalCode', width: 10 },
          { header: '收件人姓名*', key: 'receiverName', width: 15 },
          { header: '收件人电话*', key: 'receiverPhone', width: 15 },
          { header: '收件人地址*', key: 'receiverAddress', width: 30 },
          { header: '收件人城市*', key: 'receiverCity', width: 15 },
          { header: '收件人省份*', key: 'receiverProvince', width: 15 },
          { header: '收件人邮编', key: 'receiverPostalCode', width: 10 },
          { header: '重量* (kg)', key: 'weight', width: 10 },
          { header: '长度* (cm)', key: 'length', width: 10 },
          { header: '宽度* (cm)', key: 'width', width: 10 },
          { header: '高度* (cm)', key: 'height', width: 10 },
          { header: '申报价值', key: 'declaredValue', width: 10 },
          { header: '运费*', key: 'shippingCost', width: 10 },
          { header: '预计送达 (YYYY-MM-DD)', key: 'estimatedDelivery', width: 20 },
          { header: '备注', key: 'notes', width: 30 }
        ];
        break;
      case 'transactions':
        templateData = [{
          type: 'income',
          category: '销售收入',
          amount: 398,
          date: '2023-01-01',
          description: '产品销售',
          paymentMethod: 'wechat',
          relatedTo: '销售订单123'
        }];
        filename = 'transaction_import_template';
        worksheetName = '交易记录导入模板';
        columns = [
          { header: '类型* (income/expense)', key: 'type', width: 20 },
          { header: '类别*', key: 'category', width: 15 },
          { header: '金额*', key: 'amount', width: 10 },
          { header: '日期* (YYYY-MM-DD)', key: 'date', width: 20 },
          { header: '描述', key: 'description', width: 30 },
          { header: '支付方式*', key: 'paymentMethod', width: 15 },
          { header: '关联对象', key: 'relatedTo', width: 20 }
        ];
        break;
      default:
        return res.status(400).json({
          success: false,
          message: '不支持的模板类型'
        });
    }
    
    // 根据请求的格式返回模板
    if (format === 'json') {
      return res.status(200).json({
        success: true,
        data: templateData
      });
    } else if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.csv"`);
      
      const csvStream = csv.format({ headers: true });
      csvStream.pipe(res);
      
      templateData.forEach(item => csvStream.write(item));
      csvStream.end();
    } else if (format === 'excel') {
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(worksheetName);
      
      // 设置表头
      worksheet.columns = columns;
      
      // 添加数据
      templateData.forEach(item => worksheet.addRow(item));
      
      // 添加说明
      const infoSheet = workbook.addWorksheet('说明');
      infoSheet.columns = [
        { header: '字段', key: 'field', width: 20 },
        { header: '说明', key: 'description', width: 50 },
        { header: '是否必填', key: 'required', width: 10 },
        { header: '格式/示例', key: 'format', width: 30 }
      ];
      
      // 添加字段说明
      columns.forEach(col => {
        const fieldName = col.header.replace('*', '');
        const isRequired = col.header.includes('*');
        let description = '';
        let format = '';
        
        // 根据字段名设置说明
        switch (fieldName.trim()) {
          case '用户名':
            description = '代理的登录用户名，必须唯一';
            format = 'agent001';
            break;
          case '密码':
            description = '代理的登录密码，建议使用强密码';
            format = '至少6个字符';
            break;
          case '日期 (YYYY-MM-DD)':
            description = '销售日期';
            format = '2023-01-01';
            break;
          case '产品编码':
            description = '产品的唯一编码';
            format = 'TTR001';
            break;
          case '跟踪号':
            description = '物流订单的跟踪号，必须唯一';
            format = 'SF1234567890';
            break;
          case '类型 (income/expense)':
            description = '交易类型，收入或支出';
            format = 'income 或 expense';
            break;
          // 其他字段说明...
        }
        
        infoSheet.addRow({
          field: fieldName,
          description,
          required: isRequired ? '是' : '否',
          format
        });
      });
      
      // 设置响应头
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}.xlsx"`);
      
      // 写入响应
      await workbook.xlsx.write(res);
      res.end();
    } else {
      return res.status(400).json({
        success: false,
        message: '不支持的导出格式'
      });
    }
  } catch (error) {
    next(error);
  }
};