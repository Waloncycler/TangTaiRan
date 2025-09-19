const mongoose = require('mongoose');

const inventoryHistorySchema = new mongoose.Schema({
  inventoryId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Inventory',
    required: [true, '库存ID是必需的']
  },
  productCode: {
    type: String,
    required: [true, '产品编码是必需的'],
    trim: true
  },
  type: {
    type: String,
    enum: ['initial', 'increase', 'decrease', 'import', 'export', 'adjustment'],
    required: [true, '变动类型是必需的']
  },
  quantity: {
    type: Number,
    required: [true, '变动数量是必需的'],
    min: [0, '变动数量不能为负数']
  },
  previousQuantity: {
    type: Number,
    required: [true, '变动前数量是必需的'],
    min: [0, '变动前数量不能为负数']
  },
  newQuantity: {
    type: Number,
    required: [true, '变动后数量是必需的'],
    min: [0, '变动后数量不能为负数']
  },
  notes: {
    type: String,
    trim: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, '创建者是必需的']
  }
}, {
  timestamps: true
});

// 索引
inventoryHistorySchema.index({ inventoryId: 1, createdAt: -1 });
inventoryHistorySchema.index({ productCode: 1 });

module.exports = mongoose.model('InventoryHistory', inventoryHistorySchema);