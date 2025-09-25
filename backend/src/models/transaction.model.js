const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
  id: { 
    type: Number, 
    required: true, 
    unique: true 
  },
  type: { 
    type: String, 
    enum: ['income', 'expense'], 
    required: true 
  },
  amount: { 
    type: Number, 
    required: true,
    min: 0
  },
  category: { 
    type: String, 
    required: true 
  },
  date: { 
    type: Date, 
    required: true,
    default: Date.now
  },
  note: { 
    type: String,
    default: ''
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'transfer', 'other'],
    required: true
  },
  createdBy: {
    type: String,
    required: true,
    ref: 'User'
  }
}, {
  timestamps: true
});

// 索引优化查询
transactionSchema.index({ type: 1 });
transactionSchema.index({ date: -1 });
transactionSchema.index({ category: 1 });

// 计算收入总额的静态方法
transactionSchema.statics.calculateTotalIncome = async function(query = {}) {
  const baseQuery = { type: 'income', ...query };
  return this.aggregate([
    { $match: baseQuery },
    { $group: {
      _id: null,
      total: { $sum: '$amount' }
    }}
  ]);
};

// 计算支出总额的静态方法
transactionSchema.statics.calculateTotalExpense = async function(query = {}) {
  const baseQuery = { type: 'expense', ...query };
  return this.aggregate([
    { $match: baseQuery },
    { $group: {
      _id: null,
      total: { $sum: '$amount' }
    }}
  ]);
};

// 按类别分组计算的静态方法
transactionSchema.statics.calculateByCategory = async function(type, query = {}) {
  const baseQuery = { type, ...query };
  return this.aggregate([
    { $match: baseQuery },
    { $group: {
      _id: '$category',
      total: { $sum: '$amount' },
      count: { $sum: 1 }
    }},
    { $sort: { total: -1 } }
  ]);
};

const Transaction = mongoose.model('Transaction', transactionSchema);

module.exports = Transaction;