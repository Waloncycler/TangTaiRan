const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const Sale = require('../src/models/sale.model');
const Agent = require('../src/models/agent.model');
const saleRoutes = require('../src/routes/sale.routes');
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
app.use('/api/sales', authMiddleware, saleRoutes);
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

describe('销售记录 API', () => {
  let testAgent;

  beforeEach(async () => {
    // 创建测试代理
    testAgent = await dbHandler.createTestAgent();
  });

  describe('GET /api/sales', () => {
    it('应该返回所有销售记录列表', async () => {
      // 创建测试销售记录
      await createTestSales(testAgent._id, 3);

      const response = await request(app)
        .get('/api/sales')
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin');

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('count', 3);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveLength(3);
      expect(response.body.data[0]).toHaveProperty('productName');
      expect(response.body.data[0]).toHaveProperty('agent');
    });

    it('应该支持分页和过滤', async () => {
      // 创建多个测试销售记录
      await createTestSales(testAgent._id, 5);

      // 测试分页
      const pageResponse = await request(app)
        .get('/api/sales?page=1&limit=2')
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin');

      expect(pageResponse.statusCode).toBe(200);
      expect(pageResponse.body).toHaveProperty('success', true);
      expect(pageResponse.body).toHaveProperty('count', 5); // 总数仍为5
      expect(pageResponse.body.data).toHaveLength(2); // 但只返回2条

      // 测试按代理过滤
      const filterResponse = await request(app)
        .get(`/api/sales?agent=${testAgent._id}`)
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin');

      expect(filterResponse.statusCode).toBe(200);
      expect(filterResponse.body).toHaveProperty('success', true);
      expect(filterResponse.body.data.every(sale => sale.agent._id === testAgent._id.toString() || 
                                                  sale.agent === testAgent._id.toString())).toBe(true);
    });

    it('应该拒绝未认证的请求', async () => {
      const response = await request(app).get('/api/sales');

      expect(response.statusCode).toBe(401);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('代理只能查看自己的销售记录', async () => {
      // 创建两个代理
      const agent1 = testAgent;
      const agent2 = await dbHandler.createTestAgent();
      agent2.username = 'agent2';
      await agent2.save();

      // 为两个代理各创建销售记录
      await createTestSales(agent1._id, 2);
      await createTestSales(agent2._id, 3);

      // 代理1查询销售记录
      const response = await request(app)
        .get('/api/sales')
        .set('Authorization', 'Bearer validtoken')
        .set('user-id', agent1._id.toString())
        .set('user-role', 'agent');

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('count', 2); // 只能看到自己的2条记录
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data.every(sale => 
        sale.agent._id === agent1._id.toString() || sale.agent === agent1._id.toString())).toBe(true);
    });
  });

  describe('GET /api/sales/:id', () => {
    it('应该返回指定ID的销售记录', async () => {
      // 创建测试销售记录
      const sales = await createTestSales(testAgent._id, 1);
      const sale = sales[0];

      const response = await request(app)
        .get(`/api/sales/${sale._id}`)
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin');

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('_id', sale._id.toString());
      expect(response.body.data).toHaveProperty('productName', sale.productName);
    });

    it('应该返回404当销售记录不存在', async () => {
      const response = await request(app)
        .get('/api/sales/507f1f77bcf86cd799439011') // 有效但不存在的ID
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin');

      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('代理不能查看其他代理的销售记录', async () => {
      // 创建两个代理
      const agent1 = testAgent;
      const agent2 = await dbHandler.createTestAgent();
      agent2.username = 'agent2';
      await agent2.save();

      // 为代理2创建销售记录
      const sales = await createTestSales(agent2._id, 1);
      const sale = sales[0];

      // 代理1尝试查看代理2的销售记录
      const response = await request(app)
        .get(`/api/sales/${sale._id}`)
        .set('Authorization', 'Bearer validtoken')
        .set('user-id', agent1._id.toString())
        .set('user-role', 'agent');

      expect(response.statusCode).toBe(403);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/sales', () => {
    it('应该创建新销售记录', async () => {
      const saleData = {
        productName: '测试产品',
        productCode: 'TP001',
        quantity: 5,
        unitPrice: 100,
        totalAmount: 500,
        customerName: '测试客户',
        customerPhone: '13900001111',
        customerAddress: '北京市',
        saleDate: new Date(),
        agent: testAgent._id.toString(),
        paymentStatus: 'paid',
        paymentMethod: 'cash',
        notes: '测试备注'
      };

      const response = await request(app)
        .post('/api/sales')
        .set('Authorization', 'Bearer validtoken')
        .set('user-id', '507f1f77bcf86cd799439011')
        .set('user-role', 'admin')
        .send(saleData);

      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('productName', saleData.productName);
      expect(response.body.data).toHaveProperty('totalAmount', saleData.totalAmount);

      // 验证销售记录已保存到数据库
      const sale = await Sale.findById(response.body.data._id);
      expect(sale).toBeTruthy();
      expect(sale.productName).toBe(saleData.productName);
      expect(sale.createdBy.toString()).toBe('507f1f77bcf86cd799439011');

      // 验证代理的销售统计已更新
      const agent = await Agent.findById(testAgent._id);
      expect(agent.salesCount).toBe(1);
      expect(agent.totalSales).toBe(saleData.totalAmount);
    });

    it('代理可以创建自己的销售记录', async () => {
      const saleData = {
        productName: '测试产品',
        productCode: 'TP001',
        quantity: 5,
        unitPrice: 100,
        totalAmount: 500,
        customerName: '测试客户',
        customerPhone: '13900001111',
        customerAddress: '北京市',
        saleDate: new Date(),
        paymentStatus: 'paid',
        paymentMethod: 'cash',
        notes: '测试备注'
      };

      const response = await request(app)
        .post('/api/sales')
        .set('Authorization', 'Bearer validtoken')
        .set('user-id', testAgent._id.toString())
        .set('user-role', 'agent')
        .send(saleData);

      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('agent', testAgent._id.toString());

      // 验证销售记录已保存到数据库
      const sale = await Sale.findById(response.body.data._id);
      expect(sale).toBeTruthy();
      expect(sale.agent.toString()).toBe(testAgent._id.toString());
      expect(sale.createdBy.toString()).toBe(testAgent._id.toString());
    });

    it('应该验证必填字段', async () => {
      const saleData = {
        // 缺少必填字段
        productName: '测试产品',
        // 缺少 productCode
        // 缺少 quantity
        unitPrice: 100,
        // 缺少 totalAmount
        customerName: '测试客户',
        agent: testAgent._id.toString()
      };

      const response = await request(app)
        .post('/api/sales')
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin')
        .send(saleData);

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/sales/:id', () => {
    it('应该更新销售记录', async () => {
      // 创建测试销售记录
      const sales = await createTestSales(testAgent._id, 1);
      const sale = sales[0];

      const updateData = {
        customerName: '更新的客户名称',
        customerPhone: '13911112222',
        paymentStatus: 'refunded',
        notes: '更新的备注'
      };

      const response = await request(app)
        .put(`/api/sales/${sale._id}`)
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin')
        .send(updateData);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('customerName', updateData.customerName);
      expect(response.body.data).toHaveProperty('paymentStatus', updateData.paymentStatus);

      // 验证数据库中的销售记录已更新
      const updatedSale = await Sale.findById(sale._id);
      expect(updatedSale.customerName).toBe(updateData.customerName);
      expect(updatedSale.paymentStatus).toBe(updateData.paymentStatus);
    });

    it('应该返回404当销售记录不存在', async () => {
      const updateData = {
        customerName: '更新的客户名称',
        paymentStatus: 'refunded'
      };

      const response = await request(app)
        .put('/api/sales/507f1f77bcf86cd799439011') // 有效但不存在的ID
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin')
        .send(updateData);

      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('代理只能更新自己的销售记录', async () => {
      // 创建两个代理
      const agent1 = testAgent;
      const agent2 = await dbHandler.createTestAgent();
      agent2.username = 'agent2';
      await agent2.save();

      // 为代理2创建销售记录
      const sales = await createTestSales(agent2._id, 1);
      const sale = sales[0];

      // 代理1尝试更新代理2的销售记录
      const updateData = {
        customerName: '更新的客户名称',
        notes: '更新的备注'
      };

      const response = await request(app)
        .put(`/api/sales/${sale._id}`)
        .set('Authorization', 'Bearer validtoken')
        .set('user-id', agent1._id.toString())
        .set('user-role', 'agent')
        .send(updateData);

      expect(response.statusCode).toBe(403);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/sales/:id', () => {
    it('管理员应该能删除销售记录', async () => {
      // 创建测试销售记录
      const sales = await createTestSales(testAgent._id, 1);
      const sale = sales[0];

      const response = await request(app)
        .delete(`/api/sales/${sale._id}`)
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin');

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);

      // 验证销售记录已从数据库中删除
      const deletedSale = await Sale.findById(sale._id);
      expect(deletedSale).toBeNull();

      // 验证代理的销售统计已更新
      const agent = await Agent.findById(testAgent._id);
      expect(agent.salesCount).toBe(0);
      expect(agent.totalSales).toBe(0);
    });

    it('代理不能删除销售记录', async () => {
      // 创建测试销售记录
      const sales = await createTestSales(testAgent._id, 1);
      const sale = sales[0];

      const response = await request(app)
        .delete(`/api/sales/${sale._id}`)
        .set('Authorization', 'Bearer validtoken')
        .set('user-id', testAgent._id.toString())
        .set('user-role', 'agent');

      expect(response.statusCode).toBe(403);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');

      // 验证销售记录未被删除
      const notDeletedSale = await Sale.findById(sale._id);
      expect(notDeletedSale).toBeTruthy();
    });
  });

  describe('GET /api/sales/stats', () => {
    it('应该返回销售统计数据', async () => {
      // 创建多个测试销售记录，不同日期和产品
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const lastMonth = new Date(today);
      lastMonth.setMonth(lastMonth.getMonth() - 1);

      // 今天的销售
      await Sale.create({
        productName: '产品A',
        productCode: 'PA001',
        quantity: 2,
        unitPrice: 100,
        totalAmount: 200,
        customerName: '客户1',
        agent: testAgent._id,
        saleDate: today,
        createdBy: testAgent._id
      });

      await Sale.create({
        productName: '产品B',
        productCode: 'PB001',
        quantity: 1,
        unitPrice: 300,
        totalAmount: 300,
        customerName: '客户2',
        agent: testAgent._id,
        saleDate: today,
        createdBy: testAgent._id
      });

      // 昨天的销售
      await Sale.create({
        productName: '产品A',
        productCode: 'PA001',
        quantity: 3,
        unitPrice: 100,
        totalAmount: 300,
        customerName: '客户3',
        agent: testAgent._id,
        saleDate: yesterday,
        createdBy: testAgent._id
      });

      // 上个月的销售
      await Sale.create({
        productName: '产品C',
        productCode: 'PC001',
        quantity: 5,
        unitPrice: 200,
        totalAmount: 1000,
        customerName: '客户4',
        agent: testAgent._id,
        saleDate: lastMonth,
        createdBy: testAgent._id
      });

      // 测试总体统计
      const response = await request(app)
        .get('/api/sales/stats')
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin');

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      
      // 验证总销售额
      expect(response.body.data).toHaveProperty('totalSales', 1800); // 200+300+300+1000
      expect(response.body.data).toHaveProperty('totalCount', 4);
      
      // 验证按产品统计
      expect(response.body.data).toHaveProperty('byProduct');
      const productStats = response.body.data.byProduct;
      expect(productStats.find(p => p._id === '产品A')).toHaveProperty('totalAmount', 500); // 200+300
      expect(productStats.find(p => p._id === '产品B')).toHaveProperty('totalAmount', 300);
      expect(productStats.find(p => p._id === '产品C')).toHaveProperty('totalAmount', 1000);
      
      // 验证按时间段统计
      expect(response.body.data).toHaveProperty('byPeriod');
      const periodStats = response.body.data.byPeriod;
      expect(periodStats).toHaveProperty('today', 500); // 200+300
      expect(periodStats).toHaveProperty('yesterday', 300);
      expect(periodStats).toHaveProperty('thisMonth');
      expect(periodStats).toHaveProperty('lastMonth', 1000);
    });

    it('代理只能查看自己的销售统计', async () => {
      // 创建两个代理
      const agent1 = testAgent;
      const agent2 = await dbHandler.createTestAgent();
      agent2.username = 'agent2';
      await agent2.save();

      // 为两个代理各创建销售记录
      await Sale.create({
        productName: '产品A',
        productCode: 'PA001',
        quantity: 2,
        unitPrice: 100,
        totalAmount: 200,
        customerName: '客户1',
        agent: agent1._id,
        saleDate: new Date(),
        createdBy: agent1._id
      });

      await Sale.create({
        productName: '产品B',
        productCode: 'PB001',
        quantity: 3,
        unitPrice: 200,
        totalAmount: 600,
        customerName: '客户2',
        agent: agent2._id,
        saleDate: new Date(),
        createdBy: agent2._id
      });

      // 代理1查询销售统计
      const response = await request(app)
        .get('/api/sales/stats')
        .set('Authorization', 'Bearer validtoken')
        .set('user-id', agent1._id.toString())
        .set('user-role', 'agent');

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('totalSales', 200); // 只能看到自己的销售额
      expect(response.body.data).toHaveProperty('totalCount', 1); // 只能看到自己的销售记录数
    });
  });
});

// 辅助函数：创建测试销售记录
async function createTestSales(agentId, count) {
  const sales = [];
  for (let i = 1; i <= count; i++) {
    const sale = await Sale.create({
      productName: `测试产品${i}`,
      productCode: `TP00${i}`,
      quantity: i,
      unitPrice: 100,
      totalAmount: 100 * i,
      customerName: `测试客户${i}`,
      customerPhone: '13900001111',
      customerAddress: '北京市',
      saleDate: new Date(),
      agent: agentId,
      paymentStatus: 'paid',
      paymentMethod: 'cash',
      notes: `测试备注${i}`,
      createdBy: agentId
    });
    sales.push(sale);
  }
  return sales;
}