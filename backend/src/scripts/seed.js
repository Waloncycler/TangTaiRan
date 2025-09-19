const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/user.model');
const Agent = require('../models/agent.model');
require('dotenv').config();

// 连接数据库
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log('成功连接到MongoDB数据库');
    seedData();
  })
  .catch((err) => {
    console.error('数据库连接失败:', err.message);
    process.exit(1);
  });

// 初始化数据
async function seedData() {
  try {
    // 清空现有用户数据（可选）
    // await User.deleteMany({});
    // console.log('已清空用户数据');

    // 检查是否已存在管理员用户
    const adminExists = await User.findOne({ username: 'admin' });
    if (adminExists) {
      console.log('管理员用户已存在，跳过创建');
    } else {
      // 创建管理员用户
      const adminUser = new User({
        username: 'admin',
        password: 'admin123', // 密码会通过模型中间件自动加密
        role: 'admin'
      });
      await adminUser.save();
      console.log('已创建管理员用户: admin / admin123');
    }

    // 创建其他角色的用户
    const roles = ['generalAgent', 'cityAgent', 'teamLeader', 'salesPerson'];
    
    for (const role of roles) {
      const username = `test_${role}`;
      const userExists = await User.findOne({ username });
      
      if (userExists) {
        console.log(`${role}用户已存在，跳过创建`);
      } else {
        const user = new User({
          username,
          password: 'password123',
          role
        });
        await user.save();
        console.log(`已创建${role}用户: ${username} / password123`);
      }
    }

    console.log('数据初始化完成');
    process.exit(0);
  } catch (error) {
    console.error('数据初始化失败:', error);
    process.exit(1);
  }
}