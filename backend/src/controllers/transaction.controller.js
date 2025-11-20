const Transaction = require('../models/transaction.model');
const Sale = require('../models/sale.model');
const Agent = require('../models/agent.model');
const { getAccessibleAgentIds } = require('../utils/agentUtils');
const { errorHandler } = require('../middleware/error.middleware');

/**
 * @desc    创建交易记录
 * @route   POST /api/transactions
 * @access  Private/Admin
 */
exports.createTransaction = async (req, res, next) => {
  try {
    const { type, category, amount, date, note, paymentMethod } = req.body;

    // 生成唯一ID
    const id = Date.now();

    // 创建交易记录
    const transaction = await Transaction.create({
      id,
      type,
      category,
      amount,
      date: date || new Date(),
      note: note || '',
      paymentMethod,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    获取所有交易记录
 * @route   GET /api/transactions
 * @access  Private/Admin
 */
exports.getAllTransactions = async (req, res, next) => {
  try {
    // 分页参数
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const startIndex = (page - 1) * limit;

    // 过滤参数
    const filter = {};
    
    // 交易类型过滤
    if (req.query.type) {
      filter.type = req.query.type;
    }
    
    // 交易类别过滤
    if (req.query.category) {
      filter.category = req.query.category;
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

    // 支付方式过滤
    if (req.query.paymentMethod) {
      filter.paymentMethod = req.query.paymentMethod;
    }

    // 最小金额过滤
    if (req.query.minAmount) {
      filter.amount = { $gte: parseFloat(req.query.minAmount) };
    }

    // 最大金额过滤
    if (req.query.maxAmount) {
      if (filter.amount) {
        filter.amount.$lte = parseFloat(req.query.maxAmount);
      } else {
        filter.amount = { $lte: parseFloat(req.query.maxAmount) };
      }
    }

    // 执行查询
    const transactions = await Transaction.find(filter)
      .sort({ date: -1 })
      .skip(startIndex)
      .limit(limit);

    // 获取总记录数
    const total = await Transaction.countDocuments(filter);

    res.status(200).json({
      success: true,
      data: transactions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    获取单个交易记录
 * @route   GET /api/transactions/:id
 * @access  Private/Admin
 */
exports.getTransactionById = async (req, res, next) => {
  try {
    const transaction = await Transaction.findOne({ id: req.params.id });
    
    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: '找不到该交易记录'
      });
    }

    res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    更新交易记录
 * @route   PUT /api/transactions/:id
 * @access  Private/Admin
 */
exports.updateTransaction = async (req, res, next) => {
  try {
    const { type, category, amount, date, note, paymentMethod } = req.body;

    let transaction = await Transaction.findOne({ id: req.params.id });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: '找不到该交易记录'
      });
    }

    // 更新交易记录
    transaction = await Transaction.findOneAndUpdate(
      { id: req.params.id },
      { type, category, amount, date, note, paymentMethod },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      data: transaction
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    删除交易记录
 * @route   DELETE /api/transactions/:id
 * @access  Private/Admin
 */
exports.deleteTransaction = async (req, res, next) => {
  try {
    // 使用id字段查找，而不是_id
    const transaction = await Transaction.findOne({ id: req.params.id });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: '找不到该交易记录'
      });
    }

    await transaction.deleteOne();

    res.status(200).json({
      success: true,
      data: {}
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    获取交易统计数据
 * @route   GET /api/transactions/stats
 * @access  Private/Admin
 */
exports.getTransactionStats = async (req, res, next) => {
  try {
    // 日期范围过滤
    const filter = {};
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
    
    // 总收入
    const totalIncome = await Transaction.aggregate([
      { $match: { ...filter, type: 'income' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    // 总支出
    const totalExpense = await Transaction.aggregate([
      { $match: { ...filter, type: 'expense' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    // 按类别分组的收入
    const incomeByCategory = await Transaction.aggregate([
      { $match: { ...filter, type: 'income' } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } }
    ]);
    
    // 按类别分组的支出
    const expenseByCategory = await Transaction.aggregate([
      { $match: { ...filter, type: 'expense' } },
      { $group: { _id: '$category', total: { $sum: '$amount' } } },
      { $sort: { total: -1 } }
    ]);
    
    // 按月份分组的收入
    const incomeByMonth = await Transaction.aggregate([
      { $match: { ...filter, type: 'income' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // 按月份分组的支出
    const expenseByMonth = await Transaction.aggregate([
      { $match: { ...filter, type: 'expense' } },
      {
        $group: {
          _id: { $dateToString: { format: '%Y-%m', date: '$date' } },
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ]);
    
    // 按支付方式分组的交易
    const transactionsByPaymentMethod = await Transaction.aggregate([
      { $match: filter },
      { $group: { 
          _id: { type: '$type', paymentMethod: '$paymentMethod' }, 
          total: { $sum: '$amount' }, 
          count: { $sum: 1 } 
        } 
      },
      { $sort: { '_id.type': 1, total: -1 } }
    ]);
    
    res.status(200).json({
      success: true,
      data: {
        totalIncome: totalIncome.length > 0 ? totalIncome[0].total : 0,
        totalExpense: totalExpense.length > 0 ? totalExpense[0].total : 0,
        balance: (totalIncome.length > 0 ? totalIncome[0].total : 0) - (totalExpense.length > 0 ? totalExpense[0].total : 0),
        incomeByCategory,
        expenseByCategory,
        incomeByMonth,
        expenseByMonth,
        transactionsByPaymentMethod
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    获取财务概览数据
 * @route   GET /api/transactions/overview
 * @access  Private/Admin
 */
exports.getFinancialOverview = async (req, res, next) => {
  try {
    // 获取当前日期
    const now = new Date();
    
    // 本月开始日期
    const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    
    // 上月开始日期
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    // 上月结束日期
    const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
    
    // 本年开始日期
    const currentYearStart = new Date(now.getFullYear(), 0, 1);
    
    // 上年开始日期
    const lastYearStart = new Date(now.getFullYear() - 1, 0, 1);
    
    // 上年结束日期
    const lastYearEnd = new Date(now.getFullYear() - 1, 11, 31);
    
    // 本月收入
    const currentMonthIncome = await Transaction.aggregate([
      { $match: { type: 'income', date: { $gte: currentMonthStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    // 本月支出
    const currentMonthExpense = await Transaction.aggregate([
      { $match: { type: 'expense', date: { $gte: currentMonthStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    // 上月收入
    const lastMonthIncome = await Transaction.aggregate([
      { $match: { type: 'income', date: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    // 上月支出
    const lastMonthExpense = await Transaction.aggregate([
      { $match: { type: 'expense', date: { $gte: lastMonthStart, $lte: lastMonthEnd } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    // 本年收入
    const currentYearIncome = await Transaction.aggregate([
      { $match: { type: 'income', date: { $gte: currentYearStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    // 本年支出
    const currentYearExpense = await Transaction.aggregate([
      { $match: { type: 'expense', date: { $gte: currentYearStart } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    // 上年收入
    const lastYearIncome = await Transaction.aggregate([
      { $match: { type: 'income', date: { $gte: lastYearStart, $lte: lastYearEnd } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    // 上年支出
    const lastYearExpense = await Transaction.aggregate([
      { $match: { type: 'expense', date: { $gte: lastYearStart, $lte: lastYearEnd } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);
    
    // 最近的交易记录
    const recentTransactions = await Transaction.find()
      .sort({ date: -1 })
      .limit(5);
    
    res.status(200).json({
      success: true,
      data: {
        currentMonth: {
          income: currentMonthIncome.length > 0 ? currentMonthIncome[0].total : 0,
          expense: currentMonthExpense.length > 0 ? currentMonthExpense[0].total : 0,
          balance: (currentMonthIncome.length > 0 ? currentMonthIncome[0].total : 0) - 
                  (currentMonthExpense.length > 0 ? currentMonthExpense[0].total : 0)
        },
        lastMonth: {
          income: lastMonthIncome.length > 0 ? lastMonthIncome[0].total : 0,
          expense: lastMonthExpense.length > 0 ? lastMonthExpense[0].total : 0,
          balance: (lastMonthIncome.length > 0 ? lastMonthIncome[0].total : 0) - 
                  (lastMonthExpense.length > 0 ? lastMonthExpense[0].total : 0)
        },
        currentYear: {
          income: currentYearIncome.length > 0 ? currentYearIncome[0].total : 0,
          expense: currentYearExpense.length > 0 ? currentYearExpense[0].total : 0,
          balance: (currentYearIncome.length > 0 ? currentYearIncome[0].total : 0) - 
                  (currentYearExpense.length > 0 ? currentYearExpense[0].total : 0)
        },
        lastYear: {
          income: lastYearIncome.length > 0 ? lastYearIncome[0].total : 0,
          expense: lastYearExpense.length > 0 ? lastYearExpense[0].total : 0,
          balance: (lastYearIncome.length > 0 ? lastYearIncome[0].total : 0) - 
                  (lastYearExpense.length > 0 ? lastYearExpense[0].total : 0)
        },
        monthOverMonth: {
          income: lastMonthIncome.length > 0 && lastMonthIncome[0].total > 0 ?
                  ((currentMonthIncome.length > 0 ? currentMonthIncome[0].total : 0) - 
                  (lastMonthIncome.length > 0 ? lastMonthIncome[0].total : 0)) / 
                  lastMonthIncome[0].total * 100 : 0,
          expense: lastMonthExpense.length > 0 && lastMonthExpense[0].total > 0 ?
                  ((currentMonthExpense.length > 0 ? currentMonthExpense[0].total : 0) - 
                  (lastMonthExpense.length > 0 ? lastMonthExpense[0].total : 0)) / 
                  lastMonthExpense[0].total * 100 : 0
        },
        yearOverYear: {
          income: lastYearIncome.length > 0 && lastYearIncome[0].total > 0 ?
                  ((currentYearIncome.length > 0 ? currentYearIncome[0].total : 0) - 
                  (lastYearIncome.length > 0 ? lastYearIncome[0].total : 0)) / 
                  lastYearIncome[0].total * 100 : 0,
          expense: lastYearExpense.length > 0 && lastYearExpense[0].total > 0 ?
                  ((currentYearExpense.length > 0 ? currentYearExpense[0].total : 0) - 
                  (lastYearExpense.length > 0 ? lastYearExpense[0].total : 0)) / 
                  lastYearExpense[0].total * 100 : 0
        },
        recentTransactions
      }
    });
  } catch (error) {
    next(error);
  }
};



/**
 * @desc    导出交易记录
 * @route   GET /api/transactions/export
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
      .sort({ date: -1 });
    
    // 格式化数据用于导出
    const formattedTransactions = transactions.map(transaction => ({
      id: transaction._id,
      type: transaction.type,
      category: transaction.category,
      amount: transaction.amount,
      date: transaction.date.toISOString().split('T')[0],
      description: transaction.description,
      paymentMethod: transaction.paymentMethod,
      relatedTo: transaction.relatedTo,
      createdBy: transaction.createdBy ? transaction.createdBy.username : '系统',
      createdAt: transaction.createdAt.toISOString()
    }));
    
    res.status(200).json({
      success: true,
      count: formattedTransactions.length,
      data: formattedTransactions
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    获取账单概览（包含代理相关数据）
 * @route   GET /api/transactions/billing-overview
 * @access  Private
 */
const getBillingOverview = async (req, res, next) => {
  try {
    const { role, agentId } = req.user;
    
    // 获取可访问的代理ID列表
    const accessibleAgentIds = await getAccessibleAgentIds(role, agentId);
    
    // 获取日期范围（默认当前月）
    const { startDate, endDate } = req.query;
    const dateRange = {};
    if (startDate) dateRange.start = startDate;
    if (endDate) dateRange.end = endDate;
    
    // 销售收入统计（按可访问代理与日期范围聚合）
    const saleMatch = {};
    if (Array.isArray(accessibleAgentIds) && accessibleAgentIds.length > 0) {
      saleMatch.agentId = { $in: accessibleAgentIds };
    }
    if (dateRange.start || dateRange.end) {
      saleMatch.saleDate = {};
      if (dateRange.start) saleMatch.saleDate.$gte = new Date(dateRange.start);
      if (dateRange.end) saleMatch.saleDate.$lte = new Date(dateRange.end);
    }
    const salesAgg = await Sale.calculateTotalSales(saleMatch);
    const salesIncome = salesAgg.length > 0 ? salesAgg[0].totalAmount : 0;
    
    // 获取总收入和支出
    const dateQuery = {};
    if (dateRange.start || dateRange.end) {
      dateQuery.date = {};
      if (dateRange.start) dateQuery.date.$gte = new Date(dateRange.start);
      if (dateRange.end) dateQuery.date.$lte = new Date(dateRange.end);
    }
    
    const [totalIncomeResult] = await Transaction.calculateTotalIncome(dateQuery);
    const [totalExpenseResult] = await Transaction.calculateTotalExpense(dateQuery);
    
    const totalIncome = totalIncomeResult ? totalIncomeResult.total : 0;
    const totalExpense = totalExpenseResult ? totalExpenseResult.total : 0;
    
    // 按类别统计
    const incomeByCategory = await Transaction.calculateByCategory('income', dateQuery);
    const expenseByCategory = await Transaction.calculateByCategory('expense', dateQuery);
    
    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalIncome,
          totalExpense,
          netIncome: totalIncome - totalExpense
        },
        salesIncome,
        incomeByCategory,
        expenseByCategory
      }
    });
  } catch (error) {
    next(error);
  }
};


module.exports = {
  getTransactionStats: exports.getTransactionStats,
  getFinancialOverview: exports.getFinancialOverview,
  getAllTransactions: exports.getAllTransactions,
  createTransaction: exports.createTransaction,
  getTransactionById: exports.getTransactionById,
  updateTransaction: exports.updateTransaction,
  deleteTransaction: exports.deleteTransaction,
  exportTransactions: exports.exportTransactions,
  getBillingOverview
};