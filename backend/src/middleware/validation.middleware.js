const Joi = require('joi');

/**
 * 通用验证中间件
 * @param {Object} schema - Joi验证模式
 * @returns {Function} Express中间件函数
 */
const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false });
  
  if (error) {
    const errorMessages = error.details.map(detail => detail.message);
    return res.status(400).json({
      success: false,
      message: '数据验证失败',
      errors: errorMessages
    });
  }
  
  next();
};

/**
 * 代理数据验证模式
 */
const agentSchema = Joi.object({
  name: Joi.string().required().min(2).max(50).messages({
    'string.base': '名称必须是字符串',
    'string.empty': '名称不能为空',
    'string.min': '名称至少需要2个字符',
    'string.max': '名称不能超过50个字符',
    'any.required': '名称是必填项'
  }),
  level: Joi.number().integer().min(1).required().messages({
    'number.base': '级别必须是数字',
    'number.integer': '级别必须是整数',
    'number.min': '级别最小为1',
    'any.required': '级别是必填项'
  }),
  parentId: Joi.string().allow(null).messages({
    'string.base': '父代理ID必须是字符串'
  }),
  contactInfo: Joi.object({
    phone: Joi.string().pattern(/^[0-9]{11}$/).messages({
      'string.pattern.base': '手机号格式不正确，应为11位数字'
    }),
    email: Joi.string().email().messages({
      'string.email': '邮箱格式不正确'
    }),
    address: Joi.string().max(200).messages({
      'string.max': '地址不能超过200个字符'
    })
  }),
  commission: Joi.number().min(0).max(100).messages({
    'number.base': '佣金比例必须是数字',
    'number.min': '佣金比例不能小于0',
    'number.max': '佣金比例不能大于100'
  }),
  area: Joi.string().max(100).messages({
    'string.max': '区域不能超过100个字符'
  }),
  status: Joi.string().valid('active', 'inactive').messages({
    'string.base': '状态必须是字符串',
    'any.only': '状态只能是active或inactive'
  })
});

/**
 * 销售记录数据验证模式
 */
const saleSchema = Joi.object({
  agentId: Joi.string().required().messages({
    'string.base': '代理ID必须是字符串',
    'string.empty': '代理ID不能为空',
    'any.required': '代理ID是必填项'
  }),
  customerName: Joi.string().required().min(2).max(50).messages({
    'string.base': '客户名称必须是字符串',
    'string.empty': '客户名称不能为空',
    'string.min': '客户名称至少需要2个字符',
    'string.max': '客户名称不能超过50个字符',
    'any.required': '客户名称是必填项'
  }),
  products: Joi.array().items(
    Joi.object({
      productId: Joi.string().required().messages({
        'string.base': '产品ID必须是字符串',
        'string.empty': '产品ID不能为空',
        'any.required': '产品ID是必填项'
      }),
      name: Joi.string().required().messages({
        'string.base': '产品名称必须是字符串',
        'string.empty': '产品名称不能为空',
        'any.required': '产品名称是必填项'
      }),
      quantity: Joi.number().integer().min(1).required().messages({
        'number.base': '数量必须是数字',
        'number.integer': '数量必须是整数',
        'number.min': '数量最小为1',
        'any.required': '数量是必填项'
      }),
      price: Joi.number().min(0).required().messages({
        'number.base': '价格必须是数字',
        'number.min': '价格不能为负数',
        'any.required': '价格是必填项'
      })
    })
  ).min(1).required().messages({
    'array.min': '至少需要一个产品',
    'any.required': '产品列表是必填项'
  }),
  totalAmount: Joi.number().min(0).required().messages({
    'number.base': '总金额必须是数字',
    'number.min': '总金额不能为负数',
    'any.required': '总金额是必填项'
  }),
  saleDate: Joi.date().required().messages({
    'date.base': '销售日期必须是有效日期',
    'any.required': '销售日期是必填项'
  }),
  paymentMethod: Joi.string().valid('cash', 'card', 'transfer', 'other').required().messages({
    'string.base': '支付方式必须是字符串',
    'any.only': '支付方式只能是cash、card、transfer或other',
    'any.required': '支付方式是必填项'
  }),
  notes: Joi.string().max(500).messages({
    'string.max': '备注不能超过500个字符'
  })
});

/**
 * 交易数据验证模式
 */
const transactionSchema = Joi.object({
  type: Joi.string().valid('income', 'expense').required().messages({
    'string.base': '交易类型必须是字符串',
    'any.only': '交易类型只能是income或expense',
    'any.required': '交易类型是必填项'
  }),
  category: Joi.string().required().messages({
    'string.base': '交易类别必须是字符串',
    'string.empty': '交易类别不能为空',
    'any.required': '交易类别是必填项'
  }),
  amount: Joi.number().min(0).required().messages({
    'number.base': '金额必须是数字',
    'number.min': '金额不能为负数',
    'any.required': '金额是必填项'
  }),
  date: Joi.date().required().messages({
    'date.base': '交易日期必须是有效日期',
    'any.required': '交易日期是必填项'
  }),
  description: Joi.string().max(500).messages({
    'string.max': '描述不能超过500个字符'
  }),
  paymentMethod: Joi.string().valid('cash', 'card', 'transfer', 'other').required().messages({
    'string.base': '支付方式必须是字符串',
    'any.only': '支付方式只能是cash、card、transfer或other',
    'any.required': '支付方式是必填项'
  }),
  relatedTo: Joi.string().messages({
    'string.base': '关联对象必须是字符串'
  })
});

/**
 * 库存数据验证模式
 */
const inventorySchema = Joi.object({
  name: Joi.string().required().min(2).max(100).messages({
    'string.base': '商品名称必须是字符串',
    'string.empty': '商品名称不能为空',
    'string.min': '商品名称至少需要2个字符',
    'string.max': '商品名称不能超过100个字符',
    'any.required': '商品名称是必填项'
  }),
  sku: Joi.string().required().messages({
    'string.base': 'SKU必须是字符串',
    'string.empty': 'SKU不能为空',
    'any.required': 'SKU是必填项'
  }),
  category: Joi.string().required().messages({
    'string.base': '类别必须是字符串',
    'string.empty': '类别不能为空',
    'any.required': '类别是必填项'
  }),
  quantity: Joi.number().integer().min(0).required().messages({
    'number.base': '数量必须是数字',
    'number.integer': '数量必须是整数',
    'number.min': '数量不能为负数',
    'any.required': '数量是必填项'
  }),
  price: Joi.number().min(0).required().messages({
    'number.base': '价格必须是数字',
    'number.min': '价格不能为负数',
    'any.required': '价格是必填项'
  }),
  location: Joi.string().required().messages({
    'string.base': '库存位置必须是字符串',
    'string.empty': '库存位置不能为空',
    'any.required': '库存位置是必填项'
  }),
  lowStockThreshold: Joi.number().integer().min(0).messages({
    'number.base': '低库存阈值必须是数字',
    'number.integer': '低库存阈值必须是整数',
    'number.min': '低库存阈值不能为负数'
  }),
  description: Joi.string().max(500).messages({
    'string.max': '描述不能超过500个字符'
  })
});

/**
 * 库存变动验证模式
 */
const inventoryChangeSchema = Joi.object({
  inventoryId: Joi.string().required().messages({
    'string.base': '库存ID必须是字符串',
    'string.empty': '库存ID不能为空',
    'any.required': '库存ID是必填项'
  }),
  changeType: Joi.string().valid('increase', 'decrease').required().messages({
    'string.base': '变动类型必须是字符串',
    'any.only': '变动类型只能是increase或decrease',
    'any.required': '变动类型是必填项'
  }),
  quantity: Joi.number().integer().min(1).required().messages({
    'number.base': '数量必须是数字',
    'number.integer': '数量必须是整数',
    'number.min': '数量最小为1',
    'any.required': '数量是必填项'
  }),
  reason: Joi.string().required().messages({
    'string.base': '变动原因必须是字符串',
    'string.empty': '变动原因不能为空',
    'any.required': '变动原因是必填项'
  }),
  notes: Joi.string().max(500).messages({
    'string.max': '备注不能超过500个字符'
  })
});

/**
 * 物流数据验证模式
 */
const logisticsSchema = Joi.object({
  company: Joi.string().required().messages({
    'string.base': '物流公司必须是字符串',
    'string.empty': '物流公司不能为空',
    'any.required': '物流公司是必填项'
  }),
  orderNumber: Joi.string().required().messages({
    'string.base': '订单号必须是字符串',
    'string.empty': '订单号不能为空',
    'any.required': '订单号是必填项'
  }),
  status: Joi.string().valid('pending', 'shipped', 'delivered', 'returned', 'cancelled').required().messages({
    'string.base': '状态必须是字符串',
    'any.only': '状态只能是pending、shipped、delivered、returned或cancelled',
    'any.required': '状态是必填项'
  }),
  shippingDate: Joi.date().messages({
    'date.base': '发货日期必须是有效日期'
  }),
  estimatedDeliveryDate: Joi.date().messages({
    'date.base': '预计送达日期必须是有效日期'
  }),
  actualDeliveryDate: Joi.date().messages({
    'date.base': '实际送达日期必须是有效日期'
  }),
  trackingInfo: Joi.array().items(
    Joi.object({
      date: Joi.date().required().messages({
        'date.base': '日期必须是有效日期',
        'any.required': '日期是必填项'
      }),
      location: Joi.string().required().messages({
        'string.base': '位置必须是字符串',
        'string.empty': '位置不能为空',
        'any.required': '位置是必填项'
      }),
      description: Joi.string().required().messages({
        'string.base': '描述必须是字符串',
        'string.empty': '描述不能为空',
        'any.required': '描述是必填项'
      })
    })
  ),
  recipientInfo: Joi.object({
    name: Joi.string().required().messages({
      'string.base': '收件人姓名必须是字符串',
      'string.empty': '收件人姓名不能为空',
      'any.required': '收件人姓名是必填项'
    }),
    phone: Joi.string().pattern(/^[0-9]{11}$/).required().messages({
      'string.pattern.base': '手机号格式不正确，应为11位数字',
      'any.required': '收件人电话是必填项'
    }),
    address: Joi.string().required().messages({
      'string.base': '地址必须是字符串',
      'string.empty': '地址不能为空',
      'any.required': '地址是必填项'
    })
  }).required().messages({
    'any.required': '收件人信息是必填项'
  }),
  notes: Joi.string().max(500).messages({
    'string.max': '备注不能超过500个字符'
  })
});

// 定义交易验证中间件
const validateTransaction = validate(transactionSchema);

// 定义库存验证中间件
const validateInventory = validate(inventorySchema);

// 定义库存变动验证中间件
const validateInventoryChange = validate(inventoryChangeSchema);

// 定义库存调整验证中间件
const validateInventoryAdjustment = validate(inventoryChangeSchema); // 使用相同的schema

// 定义物流验证中间件
const validateLogistics = validate(logisticsSchema);

// 定义物流状态更新验证中间件
const validateLogisticsStatus = validate(Joi.object({
  status: Joi.string().valid('pending', 'shipped', 'delivered', 'returned', 'cancelled').required().messages({
    'string.base': '状态必须是字符串',
    'any.only': '状态只能是pending、shipped、delivered、returned或cancelled',
    'any.required': '状态是必填项'
  }),
  location: Joi.string().required().messages({
    'string.base': '位置必须是字符串',
    'string.empty': '位置不能为空',
    'any.required': '位置是必填项'
  }),
  description: Joi.string().required().messages({
    'string.base': '描述必须是字符串',
    'string.empty': '描述不能为空',
    'any.required': '描述是必填项'
  })
}));

module.exports = {
  validate,
  agentSchema,
  saleSchema,
  transactionSchema,
  inventorySchema,
  inventoryChangeSchema,
  logisticsSchema,
  validateTransaction,
  validateInventory,
  validateInventoryChange,
  validateInventoryAdjustment,
  validateLogistics,
  validateLogisticsStatus
};