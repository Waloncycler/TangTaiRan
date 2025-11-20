const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  productId: {
    type: String,
    required: true
  },
  name: {
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
  subtotal: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

const saleSchema = new mongoose.Schema({
  agentId: { 
    type: String, 
    required: true,
    ref: 'Agent'
  },
  customerName: { 
    type: String, 
    required: true 
  },
  customerPhone: {
    type: String,
    default: ''
  },
  customerAddress: {
    type: String,
    default: ''
  },
  products: [
    productSchema
  ],
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
    enum: ['cash', 'wechat', 'alipay', 'bank_transfer', 'other'],
    default: 'cash'
  },
  paymentStatus: { 
    type: String, 
    enum: ['paid', 'pending', 'partial', 'cancelled'], 
    default: 'paid' 
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// 添加虚拟属性 id，返回 _id 的字符串形式
saleSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

// 确保虚拟字段被序列化
saleSchema.set('toJSON', {
  virtuals: true
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