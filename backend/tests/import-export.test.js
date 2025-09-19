const request = require('supertest');
const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');
const importExportRoutes = require('../src/routes/import-export.routes');
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

// 模拟multer中间件
jest.mock('multer', () => {
  const multerMock = () => ({
    single: jest.fn().mockImplementation(() => (req, res, next) => {
      // 模拟文件上传
      req.file = {
        fieldname: 'file',
        originalname: 'test.csv',
        encoding: '7bit',
        mimetype: 'text/csv',
        destination: '/tmp',
        filename: 'test-123456.csv',
        path: '/tmp/test-123456.csv',
        size: 1234
      };
      next();
    }),
    array: jest.fn().mockImplementation(() => (req, res, next) => {
      // 模拟多文件上传
      req.files = [{
        fieldname: 'files',
        originalname: 'test1.csv',
        encoding: '7bit',
        mimetype: 'text/csv',
        destination: '/tmp',
        filename: 'test1-123456.csv',
        path: '/tmp/test1-123456.csv',
        size: 1234
      }];
      next();
    })
  });
  multerMock.diskStorage = jest.fn().mockImplementation(({ destination, filename }) => ({
    destination,
    filename
  }));
  return multerMock;
});

// 模拟文件系统操作
jest.mock('fs', () => ({
  ...jest.requireActual('fs'),
  createReadStream: jest.fn().mockImplementation(() => ({
    pipe: jest.fn().mockReturnThis(),
    on: jest.fn().mockImplementation(function(event, handler) {
      if (event === 'data') {
        handler('name,email,phone\nTest User,test@example.com,1234567890');
      }
      if (event === 'end') {
        handler();
      }
      return this;
    })
  })),
  existsSync: jest.fn().mockReturnValue(true),
  mkdirSync: jest.fn(),
  unlinkSync: jest.fn()
}));

// 模拟CSV解析
jest.mock('fast-csv', () => ({
  parse: jest.fn().mockImplementation(() => ({
    on: jest.fn().mockImplementation(function(event, handler) {
      if (event === 'data') {
        handler(['Test User', 'test@example.com', '1234567890']);
      }
      if (event === 'end') {
        handler();
      }
      return this;
    }),
    write: jest.fn(),
    end: jest.fn()
  })),
  format: jest.fn().mockImplementation(() => ({
    pipe: jest.fn().mockReturnThis(),
    write: jest.fn(),
    end: jest.fn()
  }))
}));

// 模拟Excel操作
jest.mock('exceljs', () => {
  const mockWorkbook = {
    xlsx: {
      readFile: jest.fn().mockResolvedValue({}),
      writeFile: jest.fn().mockResolvedValue({})
    },
    csv: {
      readFile: jest.fn().mockResolvedValue({}),
      writeFile: jest.fn().mockResolvedValue({})
    },
    addWorksheet: jest.fn().mockReturnValue({
      columns: [],
      addRow: jest.fn(),
      getRow: jest.fn().mockReturnValue({
        values: ['id', 'name', 'email'],
        eachCell: jest.fn((callback) => {
          callback({ value: 'id' }, 1);
          callback({ value: 'name' }, 2);
          callback({ value: 'email' }, 3);
        })
      }),
      eachRow: jest.fn((options, callback) => {
        callback({ values: [null, 'id', 'name', 'email'] }, 1);
        callback({ values: [null, '1', 'Test User', 'test@example.com'] }, 2);
      })
    })
  };
  return {
    Workbook: jest.fn().mockImplementation(() => mockWorkbook)
  };
});

// 创建测试应用
const app = express();
app.use(express.json());
app.use('/api/import-export', authMiddleware, importExportRoutes);
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

describe('导入导出 API', () => {
  describe('导出功能', () => {
    describe('GET /api/import-export/export/agents', () => {
      it('应该导出代理数据为JSON格式', async () => {
        const response = await request(app)
          .get('/api/import-export/export/agents?format=json')
          .set('Authorization', 'Bearer validtoken')
          .set('user-role', 'admin');

        expect(response.statusCode).toBe(200);
        expect(response.headers['content-type']).toContain('application/json');
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('应该导出代理数据为CSV格式', async () => {
        const response = await request(app)
          .get('/api/import-export/export/agents?format=csv')
          .set('Authorization', 'Bearer validtoken')
          .set('user-role', 'admin');

        expect(response.statusCode).toBe(200);
        expect(response.headers['content-type']).toContain('text/csv');
        expect(response.headers['content-disposition']).toContain('attachment; filename="agents');
      });

      it('应该导出代理数据为Excel格式', async () => {
        const response = await request(app)
          .get('/api/import-export/export/agents?format=excel')
          .set('Authorization', 'Bearer validtoken')
          .set('user-role', 'admin');

        expect(response.statusCode).toBe(200);
        expect(response.headers['content-type']).toContain('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        expect(response.headers['content-disposition']).toContain('attachment; filename="agents');
      });

      it('应该拒绝未认证的请求', async () => {
        const response = await request(app)
          .get('/api/import-export/export/agents?format=json');

        expect(response.statusCode).toBe(401);
        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
      });

      it('应该拒绝非管理员的请求', async () => {
        const response = await request(app)
          .get('/api/import-export/export/agents?format=json')
          .set('Authorization', 'Bearer validtoken')
          .set('user-role', 'user'); // 非管理员角色

        expect(response.statusCode).toBe(403);
        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
      });
    });

    describe('GET /api/import-export/export/sales', () => {
      it('应该导出销售记录数据为JSON格式', async () => {
        const response = await request(app)
          .get('/api/import-export/export/sales?format=json')
          .set('Authorization', 'Bearer validtoken')
          .set('user-role', 'admin');

        expect(response.statusCode).toBe(200);
        expect(response.headers['content-type']).toContain('application/json');
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
      });

      it('应该支持日期范围过滤', async () => {
        const response = await request(app)
          .get('/api/import-export/export/sales?format=json&startDate=2023-01-01&endDate=2023-12-31')
          .set('Authorization', 'Bearer validtoken')
          .set('user-role', 'admin');

        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('success', true);
      });
    });

    describe('GET /api/import-export/export/transactions', () => {
      it('应该导出交易记录数据为JSON格式', async () => {
        const response = await request(app)
          .get('/api/import-export/export/transactions?format=json')
          .set('Authorization', 'Bearer validtoken')
          .set('user-role', 'admin');

        expect(response.statusCode).toBe(200);
        expect(response.headers['content-type']).toContain('application/json');
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    describe('GET /api/import-export/export/inventory', () => {
      it('应该导出库存数据为JSON格式', async () => {
        const response = await request(app)
          .get('/api/import-export/export/inventory?format=json')
          .set('Authorization', 'Bearer validtoken')
          .set('user-role', 'admin');

        expect(response.statusCode).toBe(200);
        expect(response.headers['content-type']).toContain('application/json');
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });

    describe('GET /api/import-export/export/logistics', () => {
      it('应该导出物流数据为JSON格式', async () => {
        const response = await request(app)
          .get('/api/import-export/export/logistics?format=json')
          .set('Authorization', 'Bearer validtoken')
          .set('user-role', 'admin');

        expect(response.statusCode).toBe(200);
        expect(response.headers['content-type']).toContain('application/json');
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('data');
        expect(Array.isArray(response.body.data)).toBe(true);
      });
    });
  });

  describe('导入模板', () => {
    describe('GET /api/import-export/templates/agents', () => {
      it('应该返回代理导入模板', async () => {
        const response = await request(app)
          .get('/api/import-export/templates/agents?format=csv')
          .set('Authorization', 'Bearer validtoken')
          .set('user-role', 'admin');

        expect(response.statusCode).toBe(200);
        expect(response.headers['content-type']).toContain('text/csv');
        expect(response.headers['content-disposition']).toContain('attachment; filename="agent_template');
      });
    });

    describe('GET /api/import-export/templates/sales', () => {
      it('应该返回销售记录导入模板', async () => {
        const response = await request(app)
          .get('/api/import-export/templates/sales?format=csv')
          .set('Authorization', 'Bearer validtoken')
          .set('user-role', 'admin');

        expect(response.statusCode).toBe(200);
        expect(response.headers['content-type']).toContain('text/csv');
        expect(response.headers['content-disposition']).toContain('attachment; filename="sale_template');
      });
    });

    describe('GET /api/import-export/templates/inventory', () => {
      it('应该返回库存导入模板', async () => {
        const response = await request(app)
          .get('/api/import-export/templates/inventory?format=csv')
          .set('Authorization', 'Bearer validtoken')
          .set('user-role', 'admin');

        expect(response.statusCode).toBe(200);
        expect(response.headers['content-type']).toContain('text/csv');
        expect(response.headers['content-disposition']).toContain('attachment; filename="inventory_template');
      });
    });

    describe('GET /api/import-export/templates/logistics', () => {
      it('应该返回物流导入模板', async () => {
        const response = await request(app)
          .get('/api/import-export/templates/logistics?format=csv')
          .set('Authorization', 'Bearer validtoken')
          .set('user-role', 'admin');

        expect(response.statusCode).toBe(200);
        expect(response.headers['content-type']).toContain('text/csv');
        expect(response.headers['content-disposition']).toContain('attachment; filename="logistics_template');
      });
    });

    describe('GET /api/import-export/templates/transactions', () => {
      it('应该返回交易记录导入模板', async () => {
        const response = await request(app)
          .get('/api/import-export/templates/transactions?format=csv')
          .set('Authorization', 'Bearer validtoken')
          .set('user-role', 'admin');

        expect(response.statusCode).toBe(200);
        expect(response.headers['content-type']).toContain('text/csv');
        expect(response.headers['content-disposition']).toContain('attachment; filename="transaction_template');
      });
    });
  });

  describe('导入功能', () => {
    describe('POST /api/import-export/import/agents', () => {
      it('应该导入代理数据（CSV格式）', async () => {
        const response = await request(app)
          .post('/api/import-export/import/agents')
          .set('Authorization', 'Bearer validtoken')
          .set('user-role', 'admin')
          .set('Content-Type', 'multipart/form-data')
          .attach('file', Buffer.from('name,email,phone\nTest Agent,agent@example.com,1234567890'), 'agents.csv');

        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('imported');
        expect(response.body.data).toHaveProperty('errors');
      });

      it('应该拒绝未认证的请求', async () => {
        const response = await request(app)
          .post('/api/import-export/import/agents')
          .set('Content-Type', 'multipart/form-data')
          .attach('file', Buffer.from('name,email,phone\nTest Agent,agent@example.com,1234567890'), 'agents.csv');

        expect(response.statusCode).toBe(401);
        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
      });

      it('应该拒绝非管理员的请求', async () => {
        const response = await request(app)
          .post('/api/import-export/import/agents')
          .set('Authorization', 'Bearer validtoken')
          .set('user-role', 'user') // 非管理员角色
          .set('Content-Type', 'multipart/form-data')
          .attach('file', Buffer.from('name,email,phone\nTest Agent,agent@example.com,1234567890'), 'agents.csv');

        expect(response.statusCode).toBe(403);
        expect(response.body).toHaveProperty('success', false);
        expect(response.body).toHaveProperty('error');
      });
    });

    describe('POST /api/import-export/import/sales', () => {
      it('应该导入销售记录数据（CSV格式）', async () => {
        const response = await request(app)
          .post('/api/import-export/import/sales')
          .set('Authorization', 'Bearer validtoken')
          .set('user-role', 'admin')
          .set('Content-Type', 'multipart/form-data')
          .attach('file', Buffer.from('date,agentId,productName,quantity,unitPrice\n2023-01-01,507f1f77bcf86cd799439011,产品A,10,100'), 'sales.csv');

        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('imported');
        expect(response.body.data).toHaveProperty('errors');
      });
    });

    describe('POST /api/import-export/import/inventory', () => {
      it('应该导入库存数据（CSV格式）', async () => {
        const response = await request(app)
          .post('/api/import-export/import/inventory')
          .set('Authorization', 'Bearer validtoken')
          .set('user-role', 'admin')
          .set('Content-Type', 'multipart/form-data')
          .attach('file', Buffer.from('productName,sku,category,quantity,unitPrice\n产品A,SKU001,类别A,100,50'), 'inventory.csv');

        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('imported');
        expect(response.body.data).toHaveProperty('errors');
      });
    });

    describe('POST /api/import-export/import/logistics', () => {
      it('应该导入物流数据（CSV格式）', async () => {
        const response = await request(app)
          .post('/api/import-export/import/logistics')
          .set('Authorization', 'Bearer validtoken')
          .set('user-role', 'admin')
          .set('Content-Type', 'multipart/form-data')
          .attach('file', Buffer.from('trackingNumber,carrier,senderName,senderPhone,senderAddress,recipientName,recipientPhone,recipientAddress\nTN12345678,顺丰快递,发件人,13900001111,北京市,收件人,13800001111,上海市'), 'logistics.csv');

        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('imported');
        expect(response.body.data).toHaveProperty('errors');
      });
    });

    describe('POST /api/import-export/import/transactions', () => {
      it('应该导入交易记录数据（CSV格式）', async () => {
        const response = await request(app)
          .post('/api/import-export/import/transactions')
          .set('Authorization', 'Bearer validtoken')
          .set('user-role', 'admin')
          .set('Content-Type', 'multipart/form-data')
          .attach('file', Buffer.from('date,type,amount,category,description\n2023-01-01,income,1000,销售收入,产品销售'), 'transactions.csv');

        expect(response.statusCode).toBe(200);
        expect(response.body).toHaveProperty('success', true);
        expect(response.body).toHaveProperty('message');
        expect(response.body).toHaveProperty('data');
        expect(response.body.data).toHaveProperty('imported');
        expect(response.body.data).toHaveProperty('errors');
      });
    });
  });
});