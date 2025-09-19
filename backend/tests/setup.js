const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const jwt = require('jsonwebtoken');
const User = require('../src/models/user.model');
const Agent = require('../src/models/agent.model');

let mongoServer;

// 连接到内存数据库
module.exports.connect = async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  
  const mongooseOpts = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  };
  
  await mongoose.connect(uri, mongooseOpts);
};

// 清空数据库集合
module.exports.clearDatabase = async () => {
  const collections = mongoose.connection.collections;
  
  for (const key in collections) {
    const collection = collections[key];
    await collection.deleteMany({});
  }
};

// 关闭数据库连接
module.exports.closeDatabase = async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.connection.close();
  await mongoServer.stop();
};

// 创建测试用户
module.exports.createTestUser = async (role = 'admin') => {
  const user = new User({
    username: `test_${role}`,
    email: `test_${role}@example.com`,
    password: '$2a$10$XOPbrlUPQdwdJUpSrIF6X.LG1DXEp/7YK8zftF.WlWt3t5EdhEoLu', // 密码: password123
    role: role
  });
  
  await user.save();
  return user;
};

// 创建测试代理
module.exports.createTestAgent = async (parent = null) => {
  // 生成唯一ID
  const timestamp = new Date().getTime();
  const randomNum = Math.floor(Math.random() * 10000);
  const generatedId = `AG${timestamp}${randomNum}`;
  
  const agent = new Agent({
    id: generatedId,
    username: 'test_agent',
    password: '$2a$10$XOPbrlUPQdwdJUpSrIF6X.LG1DXEp/7YK8zftF.WlWt3t5EdhEoLu', // 密码: password123
    name: '测试代理',
    email: 'test_agent@example.com',
    phone: '13800138000',
    address: '测试地址',
    level: 1,
    parent: parent,
    commissionRate: 0.1,
    status: 'active'
  });
  
  await agent.save();
  return agent;
};

// 生成测试JWT令牌
module.exports.generateToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET || 'test_secret',
    { expiresIn: '1h' }
  );
};