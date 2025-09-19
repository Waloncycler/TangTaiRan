const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../src/models/user.model');
const authRoutes = require('../src/routes/auth.routes');
const { errorHandler } = require('../src/middleware/error.middleware');
const dbHandler = require('./setup');

// 创建测试应用
const app = express();
app.use(express.json());
app.use('/api/auth', authRoutes);
app.use(errorHandler);

// 测试前连接到内存数据库
beforeAll(async () => {
  await dbHandler.connect();
});

// 每个测试后清空数据库
afterEach(async () => {
  await dbHandler.clearDatabase();
});

// 所有测试完成后关闭数据库连接
afterAll(async () => {
  await dbHandler.closeDatabase();
});

describe('认证 API', () => {
  describe('POST /api/auth/register', () => {
    it('应该成功注册新用户', async () => {
      const userData = {
        username: 'testuser',
        email: 'test@example.com',
        password: 'password123',
        role: 'admin'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.statusCode).toBe(201);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('username', userData.username);
      expect(response.body.data).toHaveProperty('email', userData.email);
      expect(response.body.data).not.toHaveProperty('password');

      // 验证用户已保存到数据库
      const user = await User.findOne({ username: userData.username });
      expect(user).toBeTruthy();
      expect(user.email).toBe(userData.email);

      // 验证密码已加密
      const isMatch = await bcrypt.compare(userData.password, user.password);
      expect(isMatch).toBe(true);
    });

    it('应该拒绝重复的用户名', async () => {
      // 先创建一个用户
      const existingUser = new User({
        username: 'testuser',
        email: 'existing@example.com',
        password: await bcrypt.hash('password123', 10),
        role: 'admin'
      });
      await existingUser.save();

      // 尝试创建同名用户
      const userData = {
        username: 'testuser',
        email: 'new@example.com',
        password: 'password123',
        role: 'admin'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('应该拒绝缺少必填字段的请求', async () => {
      const userData = {
        username: 'testuser',
        // 缺少 email
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.statusCode).toBe(400);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('POST /api/auth/login', () => {
    it('应该成功登录并返回令牌', async () => {
      // 先创建一个用户
      const password = 'password123';
      const hashedPassword = await bcrypt.hash(password, 10);
      const user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: hashedPassword,
        role: 'admin'
      });
      await user.save();

      // 尝试登录
      const loginData = {
        username: 'testuser',
        password: password
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('token');
      expect(response.body.data).toHaveProperty('username', user.username);
      expect(response.body.data).toHaveProperty('email', user.email);
      expect(response.body.data).not.toHaveProperty('password');

      // 验证令牌有效
      const token = response.body.token;
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'test_secret');
      expect(decoded).toHaveProperty('id', user._id.toString());
      expect(decoded).toHaveProperty('role', user.role);
    });

    it('应该拒绝错误的密码', async () => {
      // 先创建一个用户
      const user = new User({
        username: 'testuser',
        email: 'test@example.com',
        password: await bcrypt.hash('password123', 10),
        role: 'admin'
      });
      await user.save();

      // 尝试使用错误密码登录
      const loginData = {
        username: 'testuser',
        password: 'wrongpassword'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.statusCode).toBe(401);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('应该拒绝不存在的用户', async () => {
      const loginData = {
        username: 'nonexistentuser',
        password: 'password123'
      };

      const response = await request(app)
        .post('/api/auth/login')
        .send(loginData);

      expect(response.statusCode).toBe(401);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });

  describe('GET /api/auth/me', () => {
    it('应该返回当前用户信息', async () => {
      // 创建用户
      const user = await dbHandler.createTestUser('admin');
      const token = dbHandler.generateToken(user);

      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${token}`);

      expect(response.statusCode).toBe(200);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body.data).toHaveProperty('username', user.username);
      expect(response.body.data).toHaveProperty('email', user.email);
      expect(response.body.data).not.toHaveProperty('password');
    });

    it('应该拒绝未认证的请求', async () => {
      const response = await request(app).get('/api/auth/me');

      expect(response.statusCode).toBe(401);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });

    it('应该拒绝无效的令牌', async () => {
      const response = await request(app)
        .get('/api/auth/me')
        .set('Authorization', 'Bearer invalidtoken');

      expect(response.statusCode).toBe(401);
      expect(response.body).toHaveProperty('success', false);
      expect(response.body).toHaveProperty('error');
    });
  });
});