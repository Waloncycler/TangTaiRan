const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const Transaction = require('../src/models/transaction.model');
const transactionRoutes = require('../src/routes/transaction.routes');
const { authMiddleware } = require('../src/middleware/auth.middleware');
const { errorHandler } = require('../src/middleware/error.middleware');
const dbHandler = require('./setup');

// 模拟认证中间件
jest.mock('../src/middleware/auth.middleware', () => ({
  authMiddleware: jest.fn((req, res, next) => {
    if (req.headers.authorization) {
      req.user = {
        _id: req.headers['user-id'] || '507f1f77bcf86cd799439011',
        role: req.headers['user-role'] || 'admin'
      };
      next();
    } else {
      res.status(401).json({ success: false, error: '未授权' });
    }
  }),
  authorize: jest.fn(() => (req, res, next) => next())
}));

// 创建测试应用
const app = express();
app.use(express.json());
app.use('/api/transactions', authMiddleware, transactionRoutes);
app.use(errorHandler);

// 测试前连接到内存数据库
beforeAll(async () => {
  await dbHandler.connect();
});

// 每个测试后清空数据库
afterEach(async () => {
  await dbHandler.clearDatabase();
  jest.clearAllMocks();
});

// 所有测试完成后关闭数据库连接
afterAll(async () => {
  await dbHandler.closeDatabase();
});

describe('交易记录 API', () => {
  describe('GET /api/transactions', () => {
    it('应该返回所有交易记录列表', async () => {
      // 创建测试交易记录
      await createTestTransactions(3);

      const response = await request(app)
        .get('/api/transactions')
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin');

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('count', 3);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveLength(3);
      expect(response.body.data[0]).toHaveProperty('amount');
      expect(response.body.data[0]).toHaveProperty('type');
    });

    it('应该支持分页和过滤', async () => {
      // 创建收入和支出交易记录
      await Transaction.create({
        type: 'income',
        category: '销售收入',
        amount: 1000,
        description: '测试收入1',
        date: new Date(),
        createdBy: '507f1f77bcf86cd799439011'
      });

      await Transaction.create({
        type: 'income',
        category: '销售收入',
        amount: 2000,
        description: '测试收入2',
        date: new Date(),
        createdBy: '507f1f77bcf86cd799439011'
      });

      await Transaction.create({
        type: 'expense',
        category: '采购支出',
        amount: 500,
        description: '测试支出1',
        date: new Date(),
        createdBy: '507f1f77bcf86cd799439011'
      });

      // 测试分页
      const pageResponse = await request(app)
        .get('/api/transactions?page=1&limit=2')
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin');

      expect(pageResponse.statusCode).toBe(200);
      expect(pageResponse.body).toHaveProperty('success', true);
      expect(pageResponse.body).toHaveProperty('count', 3); // 总数仍为3
      expect(pageResponse.body.data).toHaveLength(2); // 但只返回2条

      // 测试按类型过滤
      const filterResponse = await request(app)
        .get('/api/transactions?type=income')
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin');

      expect(filterResponse.statusCode).toBe(200);
      expect(filterResponse.body).toHaveProperty('success', true);
      expect(filterResponse.body.data).toHaveLength(2); // 只有2条收入记录
      expect(filterResponse.body.data.every(transaction => transaction.type === 'income')).toBe(true);
    });

    it('应该拒绝未认证的请求', async () => {
      const response = await request(app).get('/api/transactions');

      expect(response.statusCode).toBe(401);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/transactions/:id', () => {
    it('应该返回指定ID的交易记录', async () => {
      // 创建测试交易记录
      const transactions = await createTestTransactions(1);
      const transaction = transactions[0];

      const response = await request(app)
        .get(`/api/transactions/${transaction._id}`)
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin');

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('_id', transaction._id.toString());
      expect(response.body.data).toHaveProperty('amount', transaction.amount);
      expect(response.body.data).toHaveProperty('type', transaction.type);
    });

    it('应该返回404当交易记录不存在', async () => {
      const response = await request(app)
        .get('/api/transactions/507f1f77bcf86cd799439011') // 有效但不存在的ID
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin');

      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/transactions', () => {
    it('应该创建新收入交易记录', async () => {
      const transactionData = {
        type: 'income',
        category: '销售收入',
        amount: 1000,
        description: '测试收入',
        date: new Date().toISOString(),
        relatedSale: '507f1f77bcf86cd799439011', // 模拟销售ID
        notes: '测试备注'
      };

      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', 'Bearer validtoken')
        .set('user-id', '507f1f77bcf86cd799439011')
        .set('user-role', 'admin')
        .send(transactionData);

      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('type', transactionData.type);
      expect(response.body.data).toHaveProperty('amount', transactionData.amount);
      expect(response.body.data).toHaveProperty('relatedSale', transactionData.relatedSale);

      // 验证交易记录已保存到数据库
      const transaction = await Transaction.findById(response.body.data._id);
      expect(transaction).toBeTruthy();
      expect(transaction.type).toBe(transactionData.type);
      expect(transaction.amount).toBe(transactionData.amount);
      expect(transaction.createdBy.toString()).toBe('507f1f77bcf86cd799439011');
    });

    it('应该创建新支出交易记录', async () => {
      const transactionData = {
        type: 'expense',
        category: '采购支出',
        amount: 500,
        description: '测试支出',
        date: new Date().toISOString(),
        paymentMethod: 'bank',
        notes: '测试备注'
      };

      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', 'Bearer validtoken')
        .set('user-id', '507f1f77bcf86cd799439011')
        .set('user-role', 'admin')
        .send(transactionData);

      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('type', transactionData.type);
      expect(response.body.data).toHaveProperty('amount', transactionData.amount);
      expect(response.body.data).toHaveProperty('paymentMethod', transactionData.paymentMethod);

      // 验证交易记录已保存到数据库
      const transaction = await Transaction.findById(response.body.data._id);
      expect(transaction).toBeTruthy();
      expect(transaction.type).toBe(transactionData.type);
      expect(transaction.amount).toBe(transactionData.amount);
    });

    it('应该验证必填字段', async () => {
      const transactionData = {
        // 缺少必填字段
        type: 'income',
        // 缺少 category
        // 缺少 amount
        description: '测试收入'
      };

      const response = await request(app)
        .post('/api/transactions')
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin')
        .send(transactionData);

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/transactions/:id', () => {
    it('应该更新交易记录', async () => {
      // 创建测试交易记录
      const transactions = await createTestTransactions(1);
      const transaction = transactions[0];

      const updateData = {
        category: '更新的类别',
        description: '更新的描述',
        notes: '更新的备注'
      };

      const response = await request(app)
        .put(`/api/transactions/${transaction._id}`)
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin')
        .send(updateData);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('category', updateData.category);
      expect(response.body.data).toHaveProperty('description', updateData.description);

      // 验证数据库中的交易记录已更新
      const updatedTransaction = await Transaction.findById(transaction._id);
      expect(updatedTransaction.category).toBe(updateData.category);
      expect(updatedTransaction.description).toBe(updateData.description);
    });

    it('应该返回404当交易记录不存在', async () => {
      const updateData = {
        category: '更新的类别',
        description: '更新的描述'
      };

      const response = await request(app)
        .put('/api/transactions/507f1f77bcf86cd799439011') // 有效但不存在的ID
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin')
        .send(updateData);

      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/transactions/:id', () => {
    it('应该删除交易记录', async () => {
      // 创建测试交易记录
      const transactions = await createTestTransactions(1);
      const transaction = transactions[0];

      const response = await request(app)
        .delete(`/api/transactions/${transaction._id}`)
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin');

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);

      // 验证交易记录已从数据库中删除
      const deletedTransaction = await Transaction.findById(transaction._id);
      expect(deletedTransaction).toBeNull();
    });

    it('应该返回404当交易记录不存在', async () => {
      const response = await request(app)
        .delete('/api/transactions/507f1f77bcf86cd799439011') // 有效但不存在的ID
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin');

      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/transactions/stats', () => {
    it('应该返回交易统计数据', async () => {
      // 创建多个测试交易记录，不同日期和类型
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const lastMonth = new Date(today);
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      // 今天的收入
      await Transaction.create({
        type: 'income',
        category: '销售收入',
        amount: 1000,
        description: '测试收入1',
        date: today,
        createdBy: '507f1f77bcf86cd799439011'
      });

      await Transaction.create({
        type: 'income',
        category: '其他收入',
        amount: 500,
        description: '测试收入2',
        date: today,
        createdBy: '507f1f77bcf86cd799439011'
      });

      // 今天的支出
      await Transaction.create({
        type: 'expense',
        category: '采购支出',
        amount: 300,
        description: '测试支出1',
        date: today,
        createdBy: '507f1f77bcf86cd799439011'
      });

      // 昨天的收入
      await Transaction.create({
        type: 'income',
        category: '销售收入',
        amount: 800,
        description: '测试收入3',
        date: yesterday,
        createdBy: '507f1f77bcf86cd799439011'
      });

      // 上个月的支出
      await Transaction.create({
        type: 'expense',
        category: '运营支出',
        amount: 1200,
        description: '测试支出2',
        date: lastMonth,
        createdBy: '507f1f77bcf86cd799439011'
      });

      // 测试总体统计
      const response = await request(app)
        .get('/api/transactions/stats')
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin');

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      
      // 验证总收入和支出
      expect(response.body.data).toHaveProperty('totalIncome', 2300); // 1000+500+800
      expect(response.body.data).toHaveProperty('totalExpense', 1500); // 300+1200
      expect(response.body.data).toHaveProperty('netIncome', 800); // 2300-1500
      
      // 验证按类别统计
      expect(response.body.data).toHaveProperty('byCategory');
      const categoryStats = response.body.data.byCategory;
      expect(categoryStats.find(c => c._id === '销售收入')).toHaveProperty('total', 1800); // 1000+800
      expect(categoryStats.find(c => c._id === '其他收入')).toHaveProperty('total', 500);
      expect(categoryStats.find(c => c._id === '采购支出')).toHaveProperty('total', 300);
      expect(categoryStats.find(c => c._id === '运营支出')).toHaveProperty('total', 1200);
      
      // 验证按时间段统计
      expect(response.body.data).toHaveProperty('byPeriod');
      const periodStats = response.body.data.byPeriod;
      expect(periodStats).toHaveProperty('today');
      expect(periodStats.today).toHaveProperty('income', 1500); // 1000+500
      expect(periodStats.today).toHaveProperty('expense', 300);
      expect(periodStats).toHaveProperty('yesterday');
      expect(periodStats.yesterday).toHaveProperty('income', 800);
      expect(periodStats).toHaveProperty('yesterday').toHaveProperty('expense', 0);
      expect(periodStats).toHaveProperty('thisMonth');
      expect(periodStats).toHaveProperty('lastMonth');
      expect(periodStats.lastMonth).toHaveProperty('expense', 1200);
    });
  });
});

// 辅助函数：创建测试交易记录
async function createTestTransactions(count) {
  const transactions = [];
  for (let i = 1; i <= count; i++) {
    const type = i % 2 === 0 ? 'expense' : 'income';
    const category = type === 'income' ? '销售收入' : '采购支出';
    const transaction = await Transaction.create({
      type,
      category,
      amount: i * 100,
      description: `测试${type === 'income' ? '收入' : '支出'}${i}`,
      date: new Date(),
      notes: `测试备注${i}`,
      createdBy: '507f1f77bcf86cd799439011'
    });
    transactions.push(transaction);
  }
  return transactions;
}