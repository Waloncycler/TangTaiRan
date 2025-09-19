const mongoose = require('mongoose');

const logisticsSchema = new mongoose.Schema({
  id: { 
    type: Number, 
    required: true, 
    unique: true 
  },
  company: { 
    type: String, 
    required: true 
  },
  orderNumber: { 
    type: String, 
    required: true, 
    unique: true 
  },
  product: { 
    type: String, 
    required: true 
  },
  quantity: { 
    type: Number, 
    required: true,
    min: 1
  },
  recipient: { 
    type: String, 
    required: true 
  },
  contact: { 
    type: String, 
    required: true 
  },
  address: {
    type: String,
    default: ''
  },
  status: { 
    type: String, 
    enum: ['pending', 'transit', 'delivered', 'cancelled'], 
    default: 'pending' 
  },
  trackingUrl: {
    type: String,
    default: ''
  },
  shippingDate: {
    type: Date,
    default: null
  },
  deliveryDate: {
    type: Date,
    default: null
  },
  notes: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// 索引优化查询
logisticsSchema.index({ status: 1 });
logisticsSchema.index({ orderNumber: 1 });
logisticsSchema.index({ company: 1 });

// 按状态统计的静态方法
logisticsSchema.statics.countByStatus = async function() {
  return this.aggregate([
    { $group: {
      _id: '$status',
      count: { $sum: 1 }
    }},
    { $sort: { _id: 1 } }
  ]);
};

// 按公司统计的静态方法
logisticsSchema.statics.countByCompany = async function() {
  return this.aggregate([
    { $group: {
      _id: '$company',
      count: { $sum: 1 }
    }},
    { $sort: { count: -1 } }
  ]);
};

const Logistics = mongoose.model('Logistics', logisticsSchema);

module.exports = Logistics;