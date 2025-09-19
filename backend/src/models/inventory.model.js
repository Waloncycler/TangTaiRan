const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  id: { 
    type: Number, 
    required: true, 
    unique: true 
  },
  name: { 
    type: String, 
    required: true 
  },
  quantity: { 
    type: Number, 
    required: true, 
    default: 0,
    min: 0
  },
  unit: { 
    type: String, 
    required: true 
  },
  location: { 
    type: String,
    default: ''
  },
  status: { 
    type: String, 
    enum: ['normal', 'low', 'out'], 
    default: 'normal' 
  },
  lowThreshold: {
    type: Number,
    default: 10,
    min: 0
  }
}, {
  timestamps: true
});

// 自动更新状态的中间件
inventorySchema.pre('save', function(next) {
  if (this.isModified('quantity') || this.isModified('lowThreshold')) {
    if (this.quantity <= 0) {
      this.status = 'out';
    } else if (this.quantity <= this.lowThreshold) {
      this.status = 'low';
    } else {
      this.status = 'normal';
    }
  }
  next();
});

// 索引优化查询
inventorySchema.index({ status: 1 });
inventorySchema.index({ location: 1 });

// 获取低库存商品的静态方法
inventorySchema.statics.getLowStockItems = async function() {
  return this.find({ status: { $in: ['low', 'out'] } }).sort({ quantity: 1 });
};

// 按位置分组统计的静态方法
inventorySchema.statics.countByLocation = async function() {
  return this.aggregate([
    { $group: {
      _id: '$location',
      count: { $sum: 1 },
      totalItems: { $sum: '$quantity' }
    }},
    { $sort: { _id: 1 } }
  ]);
};

const Inventory = mongoose.model('Inventory', inventorySchema);

module.exports = Inventory;