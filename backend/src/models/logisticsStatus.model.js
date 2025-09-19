const mongoose = require('mongoose');

const logisticsStatusSchema = new mongoose.Schema({
  logisticsId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Logistics',
    required: [true, '物流ID是必需的']
  },
  status: {
    type: String,
    enum: ['created', 'picked_up', 'in_transit', 'out_for_delivery', 'delivered', 'exception', 'returned'],
    required: [true, '状态是必需的']
  },
  location: {
    type: String,
    required: [true, '位置是必需的'],
    trim: true
  },
  description: {
    type: String,
    required: [true, '描述是必需的'],
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
logisticsStatusSchema.index({ logisticsId: 1, createdAt: 1 });
logisticsStatusSchema.index({ status: 1 });

module.exports = mongoose.model('LogisticsStatus', logisticsStatusSchema);