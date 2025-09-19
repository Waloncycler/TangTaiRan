const mongoose = require('mongoose');

const saleSchema = new mongoose.Schema({
  id: { 
    type: String, 
    required: true, 
    unique: true 
  },
  agentId: { 
    type: String, 
    required: true,
    ref: 'Agent'
  },
  customerName: { 
    type: String, 
    required: true 
  },
  productName: { 
    type: String, 
    required: true 
  },
  quantity: { 
    type: Number, 
    required: true,
    min: 1
  },
  unitPrice: { 
    type: Number, 
    required: true,
    min: 0
  },
  totalAmount: { 
    type: Number, 
    required: true,
    min: 0
  },
  saleDate: { 
    type: Date, 
    required: true,
    default: Date.now
  },
  paymentMethod: { 
    type: String,
    enum: ['cash', 'transfer', 'card', 'other'],
    default: 'cash'
  },
  status: { 
    type: String, 
    enum: ['pending', 'completed', 'cancelled'], 
    default: 'completed' 
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// 索引优化查询
saleSchema.index({ agentId: 1 });
saleSchema.index({ saleDate: -1 });
saleSchema.index({ status: 1 });

// 计算销售总额的静态方法
saleSchema.statics.calculateTotalSales = async function(query = {}) {
  return this.aggregate([
    { $match: query },
    { $group: {
      _id: null,
      totalAmount: { $sum: '$totalAmount' },
      count: { $sum: 1 }
    }}
  ]);
};

// 按代理ID分组计算销售额的静态方法
saleSchema.statics.calculateSalesByAgent = async function(query = {}) {
  return this.aggregate([
    { $match: query },
    { $group: {
      _id: '$agentId',
      totalAmount: { $sum: '$totalAmount' },
      count: { $sum: 1 }
    }},
    { $sort: { totalAmount: -1 } }
  ]);
};

const Sale = mongoose.model('Sale', saleSchema);

module.exports = Sale;