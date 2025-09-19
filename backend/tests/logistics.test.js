const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const Logistics = require('../src/models/logistics.model');
const LogisticsStatus = require('../src/models/logisticsStatus.model');
const logisticsRoutes = require('../src/routes/logistics.routes');
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
app.use('/api/logistics', authMiddleware, logisticsRoutes);
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

describe('物流管理 API', () => {
  describe('GET /api/logistics', () => {
    it('应该返回所有物流订单列表', async () => {
      // 创建测试物流订单
      await createTestLogistics(3);

      const response = await request(app)
        .get('/api/logistics')
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin');

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('count', 3);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveLength(3);
      expect(response.body.data[0]).toHaveProperty('trackingNumber');
      expect(response.body.data[0]).toHaveProperty('status');
    });

    it('应该支持分页和过滤', async () => {
      // 创建多个测试物流订单
      await createTestLogistics(5);

      // 测试分页
      const pageResponse = await request(app)
        .get('/api/logistics?page=1&limit=2')
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin');

      expect(pageResponse.statusCode).toBe(200);
      expect(pageResponse.body).toHaveProperty('success', true);
      expect(pageResponse.body).toHaveProperty('count', 5); // 总数仍为5
      expect(pageResponse.body.data).toHaveLength(2); // 但只返回2条

      // 测试按状态过滤
      const filterResponse = await request(app)
        .get('/api/logistics?status=pending')
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin');

      expect(filterResponse.statusCode).toBe(200);
      expect(filterResponse.body).toHaveProperty('success', true);
      expect(filterResponse.body.data.every(item => item.status === 'pending')).toBe(true);
    });

    it('应该拒绝未认证的请求', async () => {
      const response = await request(app).get('/api/logistics');

      expect(response.statusCode).toBe(401);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/logistics/:id', () => {
    it('应该返回指定ID的物流订单', async () => {
      // 创建测试物流订单
      const logistics = await createTestLogistics(1);
      const logistic = logistics[0];

      const response = await request(app)
        .get(`/api/logistics/${logistic._id}`)
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin');

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('_id', logistic._id.toString());
      expect(response.body.data).toHaveProperty('trackingNumber', logistic.trackingNumber);
      expect(response.body.data).toHaveProperty('status', logistic.status);
    });

    it('应该返回404当物流订单不存在', async () => {
      const response = await request(app)
        .get('/api/logistics/507f1f77bcf86cd799439011') // 有效但不存在的ID
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin');

      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/logistics', () => {
    it('应该创建新物流订单', async () => {
      const logisticsData = {
        trackingNumber: 'TN12345678',
        carrier: '顺丰快递',
        senderName: '发件人',
        senderPhone: '13900001111',
        senderAddress: '北京市朝阳区',
        recipientName: '收件人',
        recipientPhone: '13800001111',
        recipientAddress: '上海市浦东新区',
        packageInfo: {
          weight: 2.5,
          dimensions: '30x20x10',
          items: [
            { name: '商品1', quantity: 2 },
            { name: '商品2', quantity: 1 }
          ]
        },
        notes: '测试物流订单'
      };

      const response = await request(app)
        .post('/api/logistics')
        .set('Authorization', 'Bearer validtoken')
        .set('user-id', '507f1f77bcf86cd799439011')
        .set('user-role', 'admin')
        .send(logisticsData);

      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('trackingNumber', logisticsData.trackingNumber);
      expect(response.body.data).toHaveProperty('status', 'pending'); // 默认状态

      // 验证物流订单已保存到数据库
      const logistics = await Logistics.findById(response.body.data._id);
      expect(logistics).toBeTruthy();
      expect(logistics.trackingNumber).toBe(logisticsData.trackingNumber);
      expect(logistics.createdBy.toString()).toBe('507f1f77bcf86cd799439011');

      // 验证初始状态记录已创建
      const status = await LogisticsStatus.findOne({ logistics: logistics._id });
      expect(status).toBeTruthy();
      expect(status.status).toBe('pending');
    });

    it('应该拒绝重复的跟踪号', async () => {
      // 先创建一个物流订单
      const existingLogistics = await Logistics.create({
        trackingNumber: 'TN12345678',
        carrier: '顺丰快递',
        status: 'pending',
        senderName: '发件人',
        senderPhone: '13900001111',
        senderAddress: '北京市朝阳区',
        recipientName: '收件人',
        recipientPhone: '13800001111',
        recipientAddress: '上海市浦东新区',
        createdBy: '507f1f77bcf86cd799439011'
      });

      // 尝试创建相同跟踪号的物流订单
      const logisticsData = {
        trackingNumber: 'TN12345678', // 相同的跟踪号
        carrier: '中通快递',
        senderName: '发件人2',
        senderPhone: '13900002222',
        senderAddress: '北京市海淀区',
        recipientName: '收件人2',
        recipientPhone: '13800002222',
        recipientAddress: '广州市天河区'
      };

      const response = await request(app)
        .post('/api/logistics')
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin')
        .send(logisticsData);

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('应该验证必填字段', async () => {
      const logisticsData = {
        // 缺少必填字段
        trackingNumber: 'TN12345678',
        // 缺少 carrier
        senderName: '发件人',
        // 缺少 senderPhone
        // 缺少 senderAddress
        recipientName: '收件人',
        recipientPhone: '13800001111'
        // 缺少 recipientAddress
      };

      const response = await request(app)
        .post('/api/logistics')
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin')
        .send(logisticsData);

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/logistics/:id', () => {
    it('应该更新物流订单信息', async () => {
      // 创建测试物流订单
      const logistics = await createTestLogistics(1);
      const logistic = logistics[0];

      const updateData = {
        recipientPhone: '13800009999',
        notes: '更新的备注',
        packageInfo: {
          weight: 3.0,
          dimensions: '40x30x20',
          items: [
            { name: '更新商品1', quantity: 3 },
            { name: '更新商品2', quantity: 2 }
          ]
        }
      };

      const response = await request(app)
        .put(`/api/logistics/${logistic._id}`)
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin')
        .send(updateData);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('recipientPhone', updateData.recipientPhone);
      expect(response.body.data).toHaveProperty('notes', updateData.notes);

      // 验证数据库中的物流订单已更新
      const updatedLogistics = await Logistics.findById(logistic._id);
      expect(updatedLogistics.recipientPhone).toBe(updateData.recipientPhone);
      expect(updatedLogistics.notes).toBe(updateData.notes);
      expect(updatedLogistics.packageInfo.weight).toBe(updateData.packageInfo.weight);
    });

    it('应该返回404当物流订单不存在', async () => {
      const updateData = {
        recipientPhone: '13800009999',
        notes: '更新的备注'
      };

      const response = await request(app)
        .put('/api/logistics/507f1f77bcf86cd799439011') // 有效但不存在的ID
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin')
        .send(updateData);

      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/logistics/:id', () => {
    it('应该删除物流订单', async () => {
      // 创建测试物流订单
      const logistics = await createTestLogistics(1);
      const logistic = logistics[0];

      const response = await request(app)
        .delete(`/api/logistics/${logistic._id}`)
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin');

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);

      // 验证物流订单已从数据库中删除
      const deletedLogistics = await Logistics.findById(logistic._id);
      expect(deletedLogistics).toBeNull();

      // 验证相关的状态记录也已删除
      const statuses = await LogisticsStatus.find({ logistics: logistic._id });
      expect(statuses).toHaveLength(0);
    });

    it('应该返回404当物流订单不存在', async () => {
      const response = await request(app)
        .delete('/api/logistics/507f1f77bcf86cd799439011') // 有效但不存在的ID
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin');

      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/logistics/:id/status', () => {
    it('应该添加新的物流状态', async () => {
      // 创建测试物流订单
      const logistics = await createTestLogistics(1);
      const logistic = logistics[0];

      const statusData = {
        status: 'in_transit',
        location: '北京市转运中心',
        description: '包裹已从始发地发出',
        timestamp: new Date().toISOString()
      };

      const response = await request(app)
        .post(`/api/logistics/${logistic._id}/status`)
        .set('Authorization', 'Bearer validtoken')
        .set('user-id', '507f1f77bcf86cd799439011')
        .set('user-role', 'admin')
        .send(statusData);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('status', statusData.status);
      expect(response.body.data).toHaveProperty('location', statusData.location);

      // 验证物流状态已保存到数据库
      const status = await LogisticsStatus.findOne({
        logistics: logistic._id,
        status: 'in_transit'
      });
      expect(status).toBeTruthy();
      expect(status.location).toBe(statusData.location);
      expect(status.createdBy.toString()).toBe('507f1f77bcf86cd799439011');

      // 验证物流订单状态已更新
      const updatedLogistics = await Logistics.findById(logistic._id);
      expect(updatedLogistics.status).toBe('in_transit');
    });

    it('应该返回404当物流订单不存在', async () => {
      const statusData = {
        status: 'in_transit',
        location: '北京市转运中心',
        description: '包裹已从始发地发出'
      };

      const response = await request(app)
        .post('/api/logistics/507f1f77bcf86cd799439011/status') // 有效但不存在的ID
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin')
        .send(statusData);

      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/logistics/:id/status', () => {
    it('应该返回物流订单的状态历史', async () => {
      // 创建测试物流订单
      const logistics = await Logistics.create({
        trackingNumber: 'TN12345678',
        carrier: '顺丰快递',
        status: 'delivered',
        senderName: '发件人',
        senderPhone: '13900001111',
        senderAddress: '北京市朝阳区',
        recipientName: '收件人',
        recipientPhone: '13800001111',
        recipientAddress: '上海市浦东新区',
        createdBy: '507f1f77bcf86cd799439011'
      });

      // 创建多个状态记录
      const statuses = [
        {
          logistics: logistics._id,
          status: 'pending',
          location: '北京市',
          description: '订单已创建',
          timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3天前
          createdBy: '507f1f77bcf86cd799439011'
        },
        {
          logistics: logistics._id,
          status: 'in_transit',
          location: '北京市转运中心',
          description: '包裹已从始发地发出',
          timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // 2天前
          createdBy: '507f1f77bcf86cd799439011'
        },
        {
          logistics: logistics._id,
          status: 'out_for_delivery',
          location: '上海市配送中心',
          description: '包裹正在配送中',
          timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1天前
          createdBy: '507f1f77bcf86cd799439011'
        },
        {
          logistics: logistics._id,
          status: 'delivered',
          location: '上海市浦东新区',
          description: '包裹已送达',
          timestamp: new Date(), // 今天
          createdBy: '507f1f77bcf86cd799439011'
        }
      ];

      await LogisticsStatus.insertMany(statuses);

      const response = await request(app)
        .get(`/api/logistics/${logistics._id}/status`)
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin');

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('count', 4);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveLength(4);
      
      // 验证状态按时间排序（最新的在前）
      const statusList = response.body.data;
      expect(statusList[0].status).toBe('delivered');
      expect(statusList[1].status).toBe('out_for_delivery');
      expect(statusList[2].status).toBe('in_transit');
      expect(statusList[3].status).toBe('pending');
    });

    it('应该返回404当物流订单不存在', async () => {
      const response = await request(app)
        .get('/api/logistics/507f1f77bcf86cd799439011/status') // 有效但不存在的ID
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin');

      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/logistics/track/:trackingNumber', () => {
    it('应该通过跟踪号查询物流信息（公开API）', async () => {
      // 创建测试物流订单
      const logistics = await Logistics.create({
        trackingNumber: 'TN12345678',
        carrier: '顺丰快递',
        status: 'in_transit',
        senderName: '发件人',
        senderPhone: '13900001111',
        senderAddress: '北京市朝阳区',
        recipientName: '收件人',
        recipientPhone: '13800001111',
        recipientAddress: '上海市浦东新区',
        createdBy: '507f1f77bcf86cd799439011'
      });

      // 创建状态记录
      await LogisticsStatus.create({
        logistics: logistics._id,
        status: 'pending',
        location: '北京市',
        description: '订单已创建',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000), // 1天前
        createdBy: '507f1f77bcf86cd799439011'
      });

      await LogisticsStatus.create({
        logistics: logistics._id,
        status: 'in_transit',
        location: '北京市转运中心',
        description: '包裹已从始发地发出',
        timestamp: new Date(), // 今天
        createdBy: '507f1f77bcf86cd799439011'
      });

      // 不需要认证即可访问
      const response = await request(app)
        .get('/api/logistics/track/TN12345678');

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('trackingNumber', 'TN12345678');
      expect(response.body.data).toHaveProperty('carrier', '顺丰快递');
      expect(response.body.data).toHaveProperty('status', 'in_transit');
      expect(response.body.data).toHaveProperty('statusHistory');
      expect(response.body.data.statusHistory).toHaveLength(2);
      
      // 验证敏感信息已被隐藏
      expect(response.body.data).not.toHaveProperty('senderPhone');
      expect(response.body.data).not.toHaveProperty('recipientPhone');
      expect(response.body.data).not.toHaveProperty('createdBy');
    });

    it('应该返回404当跟踪号不存在', async () => {
      const response = await request(app)
        .get('/api/logistics/track/NONEXISTENT');

      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/logistics/stats', () => {
    it('应该返回物流统计数据', async () => {
      // 创建不同状态的物流订单
      await Logistics.create({
        trackingNumber: 'TN00001',
        carrier: '顺丰快递',
        status: 'pending',
        senderName: '发件人1',
        senderPhone: '13900001111',
        senderAddress: '北京市',
        recipientName: '收件人1',
        recipientPhone: '13800001111',
        recipientAddress: '上海市',
        createdAt: new Date(),
        createdBy: '507f1f77bcf86cd799439011'
      });

      await Logistics.create({
        trackingNumber: 'TN00002',
        carrier: '顺丰快递',
        status: 'in_transit',
        senderName: '发件人2',
        senderPhone: '13900002222',
        senderAddress: '北京市',
        recipientName: '收件人2',
        recipientPhone: '13800002222',
        recipientAddress: '广州市',
        createdAt: new Date(),
        createdBy: '507f1f77bcf86cd799439011'
      });

      await Logistics.create({
        trackingNumber: 'TN00003',
        carrier: '中通快递',
        status: 'in_transit',
        senderName: '发件人3',
        senderPhone: '13900003333',
        senderAddress: '北京市',
        recipientName: '收件人3',
        recipientPhone: '13800003333',
        recipientAddress: '深圳市',
        createdAt: new Date(),
        createdBy: '507f1f77bcf86cd799439011'
      });

      await Logistics.create({
        trackingNumber: 'TN00004',
        carrier: '中通快递',
        status: 'delivered',
        senderName: '发件人4',
        senderPhone: '13900004444',
        senderAddress: '北京市',
        recipientName: '收件人4',
        recipientPhone: '13800004444',
        recipientAddress: '成都市',
        createdAt: new Date(),
        createdBy: '507f1f77bcf86cd799439011'
      });

      await Logistics.create({
        trackingNumber: 'TN00005',
        carrier: '圆通快递',
        status: 'delivered',
        senderName: '发件人5',
        senderPhone: '13900005555',
        senderAddress: '北京市',
        recipientName: '收件人5',
        recipientPhone: '13800005555',
        recipientAddress: '武汉市',
        createdAt: new Date(),
        createdBy: '507f1f77bcf86cd799439011'
      });

      const response = await request(app)
        .get('/api/logistics/stats')
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin');

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      
      // 验证按状态统计
      expect(response.body.data).toHaveProperty('byStatus');
      const statusStats = response.body.data.byStatus;
      expect(statusStats.find(s => s._id === 'pending')).toHaveProperty('count', 1);
      expect(statusStats.find(s => s._id === 'in_transit')).toHaveProperty('count', 2);
      expect(statusStats.find(s => s._id === 'delivered')).toHaveProperty('count', 2);
      
      // 验证按承运商统计
      expect(response.body.data).toHaveProperty('byCarrier');
      const carrierStats = response.body.data.byCarrier;
      expect(carrierStats.find(c => c._id === '顺丰快递')).toHaveProperty('count', 2);
      expect(carrierStats.find(c => c._id === '中通快递')).toHaveProperty('count', 2);
      expect(carrierStats.find(c => c._id === '圆通快递')).toHaveProperty('count', 1);
      
      // 验证按目的地统计
      expect(response.body.data).toHaveProperty('byDestination');
      const destinationStats = response.body.data.byDestination;
      expect(destinationStats).toHaveLength(5); // 5个不同的目的地
    });
  });
});

// 辅助函数：创建测试物流订单
async function createTestLogistics(count) {
  const logistics = [];
  for (let i = 1; i <= count; i++) {
    // 创建物流订单
    const logistic = await Logistics.create({
      trackingNumber: `TN${i.toString().padStart(8, '0')}`,
      carrier: i % 2 === 0 ? '顺丰快递' : '中通快递',
      status: i % 3 === 0 ? 'delivered' : (i % 3 === 1 ? 'pending' : 'in_transit'),
      senderName: `发件人${i}`,
      senderPhone: `1390000${i.toString().padStart(4, '0')}`,
      senderAddress: '北京市朝阳区',
      recipientName: `收件人${i}`,
      recipientPhone: `1380000${i.toString().padStart(4, '0')}`,
      recipientAddress: '上海市浦东新区',
      packageInfo: {
        weight: i * 0.5,
        dimensions: '30x20x10',
        items: [
          { name: `商品${i}`, quantity: i }
        ]
      },
      notes: `测试物流订单${i}`,
      createdBy: '507f1f77bcf86cd799439011'
    });
    
    // 创建初始状态记录
    await LogisticsStatus.create({
      logistics: logistic._id,
      status: logistic.status,
      location: '北京市',
      description: '订单已创建',
      createdBy: '507f1f77bcf86cd799439011'
    });
    
    logistics.push(logistic);
  }
  return logistics;
}