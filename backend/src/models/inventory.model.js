const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  id: {
    type: Number,
    unique: true,
    required: true
  },
  productCode: {
    type: String,
    required: true,
    trim: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  quantity: {
    type: Number,
    required: true,
    min: 0,
    default: 0
  },
  unit: {
    type: String,
    required: true,
    trim: true
  },
  costPrice: {
    type: Number,
    default: 0,
    min: 0
  },
  sellingPrice: {
    type: Number,
    default: 0,
    min: 0
  },
  location: {
    type: String,
    trim: true,
    default: ''
  },
  status: {
    type: String,
    enum: ['normal', 'low', 'out'],
    default: 'normal'
  },
  lowThreshold: {
    type: Number,
    min: 0,
    default: 10
  },
  description: {
    type: String,
    trim: true,
    default: ''
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

// 索引优化
inventorySchema.index({ status: 1 });
inventorySchema.index({ location: 1 });
// 复合唯一索引：同一产品在同一位置不能重复
inventorySchema.index({ productCode: 1, location: 1 }, { unique: true });

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