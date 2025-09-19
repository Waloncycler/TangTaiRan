const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const Inventory = require('../src/models/inventory.model');
const InventoryHistory = require('../src/models/inventoryHistory.model');
const inventoryRoutes = require('../src/routes/inventory.routes');
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
app.use('/api/inventory', authMiddleware, inventoryRoutes);
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

describe('库存管理 API', () => {
  describe('GET /api/inventory', () => {
    it('应该返回所有库存列表', async () => {
      // 创建测试库存
      await createTestInventories(3);

      const response = await request(app)
        .get('/api/inventory')
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin');

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('count', 3);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveLength(3);
      expect(response.body.data[0]).toHaveProperty('productName');
      expect(response.body.data[0]).toHaveProperty('quantity');
    });

    it('应该支持分页和过滤', async () => {
      // 创建多个测试库存
      await createTestInventories(5);

      // 测试分页
      const pageResponse = await request(app)
        .get('/api/inventory?page=1&limit=2')
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin');

      expect(pageResponse.statusCode).toBe(200);
      expect(pageResponse.body).toHaveProperty('success', true);
      expect(pageResponse.body).toHaveProperty('count', 5); // 总数仍为5
      expect(pageResponse.body.data).toHaveLength(2); // 但只返回2条

      // 测试按产品名称过滤
      const filterResponse = await request(app)
        .get('/api/inventory?productName=测试产品1')
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin');

      expect(filterResponse.statusCode).toBe(200);
      expect(filterResponse.body).toHaveProperty('success', true);
      expect(filterResponse.body.data.every(item => item.productName === '测试产品1')).toBe(true);
    });

    it('应该拒绝未认证的请求', async () => {
      const response = await request(app).get('/api/inventory');

      expect(response.statusCode).toBe(401);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/inventory/:id', () => {
    it('应该返回指定ID的库存', async () => {
      // 创建测试库存
      const inventories = await createTestInventories(1);
      const inventory = inventories[0];

      const response = await request(app)
        .get(`/api/inventory/${inventory._id}`)
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin');

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('_id', inventory._id.toString());
      expect(response.body.data).toHaveProperty('productName', inventory.productName);
      expect(response.body.data).toHaveProperty('quantity', inventory.quantity);
    });

    it('应该返回404当库存不存在', async () => {
      const response = await request(app)
        .get('/api/inventory/507f1f77bcf86cd799439011') // 有效但不存在的ID
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin');

      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/inventory', () => {
    it('应该创建新库存', async () => {
      const inventoryData = {
        productName: '新产品',
        productCode: 'NP001',
        quantity: 100,
        unit: '个',
        unitPrice: 50,
        location: '仓库A',
        description: '测试新产品',
        minimumStock: 10
      };

      const response = await request(app)
        .post('/api/inventory')
        .set('Authorization', 'Bearer validtoken')
        .set('user-id', '507f1f77bcf86cd799439011')
        .set('user-role', 'admin')
        .send(inventoryData);

      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('productName', inventoryData.productName);
      expect(response.body.data).toHaveProperty('quantity', inventoryData.quantity);

      // 验证库存已保存到数据库
      const inventory = await Inventory.findById(response.body.data._id);
      expect(inventory).toBeTruthy();
      expect(inventory.productName).toBe(inventoryData.productName);
      expect(inventory.quantity).toBe(inventoryData.quantity);
      expect(inventory.createdBy.toString()).toBe('507f1f77bcf86cd799439011');

      // 验证库存历史记录已创建
      const history = await InventoryHistory.findOne({ inventory: inventory._id });
      expect(history).toBeTruthy();
      expect(history.type).toBe('initial');
      expect(history.quantity).toBe(inventoryData.quantity);
    });

    it('应该拒绝重复的产品编码', async () => {
      // 先创建一个库存
      const existingInventory = await Inventory.create({
        productName: '现有产品',
        productCode: 'EP001',
        quantity: 50,
        unit: '个',
        createdBy: '507f1f77bcf86cd799439011'
      });

      // 尝试创建相同编码的库存
      const inventoryData = {
        productName: '新产品',
        productCode: 'EP001', // 相同的产品编码
        quantity: 100,
        unit: '个'
      };

      const response = await request(app)
        .post('/api/inventory')
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin')
        .send(inventoryData);

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('应该验证必填字段', async () => {
      const inventoryData = {
        // 缺少必填字段
        productName: '新产品',
        // 缺少 productCode
        // 缺少 quantity
        unit: '个'
      };

      const response = await request(app)
        .post('/api/inventory')
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin')
        .send(inventoryData);

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/inventory/:id', () => {
    it('应该更新库存信息', async () => {
      // 创建测试库存
      const inventories = await createTestInventories(1);
      const inventory = inventories[0];

      const updateData = {
        description: '更新的描述',
        location: '更新的位置',
        minimumStock: 20
      };

      const response = await request(app)
        .put(`/api/inventory/${inventory._id}`)
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin')
        .send(updateData);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('description', updateData.description);
      expect(response.body.data).toHaveProperty('location', updateData.location);
      expect(response.body.data).toHaveProperty('minimumStock', updateData.minimumStock);

      // 验证数据库中的库存已更新
      const updatedInventory = await Inventory.findById(inventory._id);
      expect(updatedInventory.description).toBe(updateData.description);
      expect(updatedInventory.location).toBe(updateData.location);
      expect(updatedInventory.minimumStock).toBe(updateData.minimumStock);
    });

    it('应该返回404当库存不存在', async () => {
      const updateData = {
        description: '更新的描述',
        location: '更新的位置'
      };

      const response = await request(app)
        .put('/api/inventory/507f1f77bcf86cd799439011') // 有效但不存在的ID
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin')
        .send(updateData);

      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/inventory/:id', () => {
    it('应该删除库存', async () => {
      // 创建测试库存
      const inventories = await createTestInventories(1);
      const inventory = inventories[0];

      const response = await request(app)
        .delete(`/api/inventory/${inventory._id}`)
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin');

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);

      // 验证库存已从数据库中删除
      const deletedInventory = await Inventory.findById(inventory._id);
      expect(deletedInventory).toBeNull();
    });

    it('应该返回404当库存不存在', async () => {
      const response = await request(app)
        .delete('/api/inventory/507f1f77bcf86cd799439011') // 有效但不存在的ID
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin');

      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/inventory/:id/adjust', () => {
    it('应该增加库存数量', async () => {
      // 创建测试库存
      const inventories = await createTestInventories(1);
      const inventory = inventories[0];
      const originalQuantity = inventory.quantity;

      const adjustData = {
        type: 'increase',
        quantity: 50,
        reason: '采购入库',
        notes: '测试增加库存'
      };

      const response = await request(app)
        .post(`/api/inventory/${inventory._id}/adjust`)
        .set('Authorization', 'Bearer validtoken')
        .set('user-id', '507f1f77bcf86cd799439011')
        .set('user-role', 'admin')
        .send(adjustData);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('quantity', originalQuantity + adjustData.quantity);

      // 验证数据库中的库存已更新
      const updatedInventory = await Inventory.findById(inventory._id);
      expect(updatedInventory.quantity).toBe(originalQuantity + adjustData.quantity);

      // 验证库存历史记录已创建
      const history = await InventoryHistory.findOne({
        inventory: inventory._id,
        type: 'increase'
      });
      expect(history).toBeTruthy();
      expect(history.quantity).toBe(adjustData.quantity);
      expect(history.reason).toBe(adjustData.reason);
    });

    it('应该减少库存数量', async () => {
      // 创建测试库存，数量足够减少
      const inventory = await Inventory.create({
        productName: '测试产品',
        productCode: 'TP001',
        quantity: 100,
        unit: '个',
        createdBy: '507f1f77bcf86cd799439011'
      });

      const adjustData = {
        type: 'decrease',
        quantity: 30,
        reason: '销售出库',
        notes: '测试减少库存'
      };

      const response = await request(app)
        .post(`/api/inventory/${inventory._id}/adjust`)
        .set('Authorization', 'Bearer validtoken')
        .set('user-id', '507f1f77bcf86cd799439011')
        .set('user-role', 'admin')
        .send(adjustData);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('quantity', 70); // 100 - 30

      // 验证数据库中的库存已更新
      const updatedInventory = await Inventory.findById(inventory._id);
      expect(updatedInventory.quantity).toBe(70);

      // 验证库存历史记录已创建
      const history = await InventoryHistory.findOne({
        inventory: inventory._id,
        type: 'decrease'
      });
      expect(history).toBeTruthy();
      expect(history.quantity).toBe(adjustData.quantity);
      expect(history.reason).toBe(adjustData.reason);
    });

    it('应该拒绝减少超过现有数量的库存', async () => {
      // 创建测试库存，数量较少
      const inventory = await Inventory.create({
        productName: '测试产品',
        productCode: 'TP001',
        quantity: 20,
        unit: '个',
        createdBy: '507f1f77bcf86cd799439011'
      });

      const adjustData = {
        type: 'decrease',
        quantity: 30, // 超过现有数量
        reason: '销售出库',
        notes: '测试减少库存'
      };

      const response = await request(app)
        .post(`/api/inventory/${inventory._id}/adjust`)
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin')
        .send(adjustData);

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');

      // 验证数据库中的库存未变化
      const unchangedInventory = await Inventory.findById(inventory._id);
      expect(unchangedInventory.quantity).toBe(20);
    });
  });

  describe('GET /api/inventory/:id/history', () => {
    it('应该返回库存历史记录', async () => {
      // 创建测试库存
      const inventory = await Inventory.create({
        productName: '测试产品',
        productCode: 'TP001',
        quantity: 100,
        unit: '个',
        createdBy: '507f1f77bcf86cd799439011'
      });

      // 创建初始库存历史记录
      await InventoryHistory.create({
        inventory: inventory._id,
        productCode: 'TP001',
        type: 'initial',
        quantity: 100,
        reason: '初始库存',
        createdBy: '507f1f77bcf86cd799439011'
      });

      // 创建增加库存历史记录
      await InventoryHistory.create({
        inventory: inventory._id,
        productCode: 'TP001',
        type: 'increase',
        quantity: 50,
        reason: '采购入库',
        createdBy: '507f1f77bcf86cd799439011'
      });

      // 创建减少库存历史记录
      await InventoryHistory.create({
        inventory: inventory._id,
        productCode: 'TP001',
        type: 'decrease',
        quantity: 30,
        reason: '销售出库',
        createdBy: '507f1f77bcf86cd799439011'
      });

      const response = await request(app)
        .get(`/api/inventory/${inventory._id}/history`)
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin');

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('count', 3);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveLength(3);
      
      // 验证历史记录类型
      const types = response.body.data.map(item => item.type);
      expect(types).toContain('initial');
      expect(types).toContain('increase');
      expect(types).toContain('decrease');
    });

    it('应该返回404当库存不存在', async () => {
      const response = await request(app)
        .get('/api/inventory/507f1f77bcf86cd799439011/history') // 有效但不存在的ID
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin');

      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/inventory/low-stock', () => {
    it('应该返回低库存产品列表', async () => {
      // 创建正常库存产品
      await Inventory.create({
        productName: '正常库存产品',
        productCode: 'NP001',
        quantity: 100,
        unit: '个',
        minimumStock: 20, // 库存充足
        createdBy: '507f1f77bcf86cd799439011'
      });

      // 创建低库存产品
      await Inventory.create({
        productName: '低库存产品1',
        productCode: 'LP001',
        quantity: 10,
        unit: '个',
        minimumStock: 20, // 库存不足
        createdBy: '507f1f77bcf86cd799439011'
      });

      await Inventory.create({
        productName: '低库存产品2',
        productCode: 'LP002',
        quantity: 5,
        unit: '个',
        minimumStock: 15, // 库存不足
        createdBy: '507f1f77bcf86cd799439011'
      });

      const response = await request(app)
        .get('/api/inventory/low-stock')
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin');

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('count', 2); // 只有2个低库存产品
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveLength(2);
      
      // 验证返回的是低库存产品
      const productNames = response.body.data.map(item => item.productName);
      expect(productNames).toContain('低库存产品1');
      expect(productNames).toContain('低库存产品2');
      expect(productNames).not.toContain('正常库存产品');
    });
  });
});

// 辅助函数：创建测试库存
async function createTestInventories(count) {
  const inventories = [];
  for (let i = 1; i <= count; i++) {
    const inventory = await Inventory.create({
      productName: `测试产品${i}`,
      productCode: `TP00${i}`,
      quantity: i * 10,
      unit: '个',
      unitPrice: i * 50,
      location: `仓库${i}`,
      description: `测试描述${i}`,
      minimumStock: i * 2,
      createdBy: '507f1f77bcf86cd799439011'
    });
    inventories.push(inventory);
  }
  return inventories;
}