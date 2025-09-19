const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema({
  id: { 
    type: String, 
    required: true, 
    unique: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  level: { 
    type: Number, 
    required: true,
    min: 1,
    max: 3,
    comment: '1:总代理, 2:区域代理, 3:城市代理'
  },
  parentId: { 
    type: String, 
    default: null 
  },
  phone: { 
    type: String 
  },
  email: { 
    type: String 
  },
  joinDate: { 
    type: Date 
  },
  status: { 
    type: String, 
    enum: ['active', 'inactive'], 
    default: 'active' 
  },
  region: { 
    type: String 
  },
  city: { 
    type: String 
  }
}, {
  timestamps: true
});

// 索引优化查询
agentSchema.index({ parentId: 1 });
agentSchema.index({ level: 1 });
agentSchema.index({ region: 1, city: 1 });

// 获取代理的所有下级代理
agentSchema.methods.getSubAgents = async function() {
  return await this.model('Agent').find({ parentId: this.id });
};

// 获取代理的层级名称
agentSchema.methods.getLevelName = function() {
  const levelNames = {
    1: '总代理',
    2: '区域代理',
    3: '城市代理'
  };
  return levelNames[this.level] || '未知级别';
};

const Agent = mongoose.model('Agent', agentSchema);

module.exports = Agent;