const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const Agent = require('../src/models/agent.model');
const agentRoutes = require('../src/routes/agent.routes');
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
app.use('/api/agents', authMiddleware, agentRoutes);
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

describe('代理 API', () => {
  describe('GET /api/agents', () => {
    it('应该返回所有代理列表', async () => {
      // 创建测试代理
      const agent1 = await dbHandler.createTestAgent();
      agent1.username = 'agent1';
      await agent1.save();
      
      const agent2 = await dbHandler.createTestAgent();
      agent2.username = 'agent2';
      await agent2.save();

      const response = await request(app)
        .get('/api/agents')
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin');

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('count', 2);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toHaveProperty('username');
      expect(response.body.data[1]).toHaveProperty('username');
    });

    it('应该支持分页和过滤', async () => {
      // 创建多个测试代理
      for (let i = 1; i <= 5; i++) {
        const agent = await dbHandler.createTestAgent();
        agent.username = `agent${i}`;
        agent.level = i % 2 + 1; // 级别为1或2
        await agent.save();
      }

      // 测试分页
      const pageResponse = await request(app)
        .get('/api/agents?page=1&limit=2')
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin');

      expect(pageResponse.statusCode).toBe(200);
      expect(pageResponse.body).toHaveProperty('success', true);
      expect(pageResponse.body).toHaveProperty('count', 5); // 总数仍为5
      expect(pageResponse.body.data).toHaveLength(2); // 但只返回2条

      // 测试过滤
      const filterResponse = await request(app)
        .get('/api/agents?level=1')
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin');

      expect(filterResponse.statusCode).toBe(200);
      expect(filterResponse.body).toHaveProperty('success', true);
      expect(filterResponse.body.data.every(agent => agent.level === 1)).toBe(true);
    });

    it('应该拒绝未认证的请求', async () => {
      const response = await request(app).get('/api/agents');

      expect(response.statusCode).toBe(401);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/agents/:id', () => {
    it('应该返回指定ID的代理', async () => {
      const agent = await dbHandler.createTestAgent();

      const response = await request(app)
        .get(`/api/agents/${agent._id}`)
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin');

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('_id', agent._id.toString());
      expect(response.body.data).toHaveProperty('username', agent.username);
    });

    it('应该返回404当代理不存在', async () => {
      const response = await request(app)
        .get('/api/agents/507f1f77bcf86cd799439011') // 有效但不存在的ID
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin');

      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/agents', () => {
    it('应该创建新代理', async () => {
      const agentData = {
        username: 'newagent',
        password: 'password123',
        name: '新代理',
        email: 'newagent@example.com',
        phone: '13900001111',
        address: '北京市',
        level: 1,
        commissionRate: 0.1
      };

      const response = await request(app)
        .post('/api/agents')
        .set('Authorization', 'Bearer validtoken')
        .set('user-id', '507f1f77bcf86cd799439011')
        .set('user-role', 'admin')
        .send(agentData);

      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('username', agentData.username);
      expect(response.body.data).toHaveProperty('name', agentData.name);
      expect(response.body.data).not.toHaveProperty('password');

      // 验证代理已保存到数据库
      const agent = await Agent.findOne({ username: agentData.username });
      expect(agent).toBeTruthy();
      expect(agent.name).toBe(agentData.name);
      expect(agent.createdBy.toString()).toBe('507f1f77bcf86cd799439011');
    });

    it('应该拒绝重复的用户名', async () => {
      // 先创建一个代理
      const existingAgent = await dbHandler.createTestAgent();

      // 尝试创建同名代理
      const agentData = {
        username: existingAgent.username,
        password: 'password123',
        name: '新代理',
        email: 'newagent@example.com',
        phone: '13900001111',
        level: 1,
        commissionRate: 0.1
      };

      const response = await request(app)
        .post('/api/agents')
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin')
        .send(agentData);

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('PUT /api/agents/:id', () => {
    it('应该更新代理信息', async () => {
      const agent = await dbHandler.createTestAgent();

      const updateData = {
        name: '更新的名称',
        email: 'updated@example.com',
        phone: '13911112222',
        commissionRate: 0.15
      };

      const response = await request(app)
        .put(`/api/agents/${agent._id}`)
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin')
        .send(updateData);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('name', updateData.name);
      expect(response.body.data).toHaveProperty('email', updateData.email);
      expect(response.body.data).toHaveProperty('commissionRate', updateData.commissionRate);

      // 验证数据库中的代理已更新
      const updatedAgent = await Agent.findById(agent._id);
      expect(updatedAgent.name).toBe(updateData.name);
      expect(updatedAgent.email).toBe(updateData.email);
      expect(updatedAgent.commissionRate).toBe(updateData.commissionRate);
    });

    it('应该返回404当代理不存在', async () => {
      const updateData = {
        name: '更新的名称',
        email: 'updated@example.com'
      };

      const response = await request(app)
        .put('/api/agents/507f1f77bcf86cd799439011') // 有效但不存在的ID
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin')
        .send(updateData);

      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('DELETE /api/agents/:id', () => {
    it('应该删除代理', async () => {
      const agent = await dbHandler.createTestAgent();

      const response = await request(app)
        .delete(`/api/agents/${agent._id}`)
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin');

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);

      // 验证代理已从数据库中删除
      const deletedAgent = await Agent.findById(agent._id);
      expect(deletedAgent).toBeNull();
    });

    it('应该返回404当代理不存在', async () => {
      const response = await request(app)
        .delete('/api/agents/507f1f77bcf86cd799439011') // 有效但不存在的ID
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin');

      expect(response.statusCode).toBe(404);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/agents/me', () => {
    it('应该返回当前代理信息', async () => {
      // 创建测试代理
      const agent = await dbHandler.createTestAgent();

      const response = await request(app)
        .get('/api/agents/me')
        .set('Authorization', 'Bearer validtoken')
        .set('user-id', agent._id.toString())
        .set('user-role', 'agent');

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('_id', agent._id.toString());
      expect(response.body.data).toHaveProperty('username', agent.username);
    });
  });

  describe('GET /api/agents/:id/downline', () => {
    it('应该返回代理的下线列表', async () => {
      // 创建上级代理
      const parentAgent = await dbHandler.createTestAgent();
      parentAgent.username = 'parent';
      await parentAgent.save();

      // 创建下线代理
      for (let i = 1; i <= 3; i++) {
        const agent = await dbHandler.createTestAgent(parentAgent._id);
        agent.username = `child${i}`;
        agent.parent = parentAgent._id;
        await agent.save();
      }

      const response = await request(app)
        .get(`/api/agents/${parentAgent._id}/downline`)
        .set('Authorization', 'Bearer validtoken')
        .set('user-role', 'admin');

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('count', 3);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.data[0]).toHaveProperty('parent', parentAgent._id.toString());
    });
  });
});