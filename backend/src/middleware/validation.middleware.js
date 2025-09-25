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
  agent: Joi.string().required().messages({
    'string.base': '代理ID必须是字符串',
    'string.empty': '代理ID不能为空',
    'any.required': '代理ID是必填项'
  }),
  customer: Joi.object({
    name: Joi.string().required().min(2).max(50).messages({
      'string.base': '客户名称必须是字符串',
      'string.empty': '客户名称不能为空',
      'string.min': '客户名称至少需要2个字符',
      'string.max': '客户名称不能超过50个字符',
      'any.required': '客户名称是必填项'
    }),
    phone: Joi.string().allow('').max(20).messages({
      'string.max': '电话号码不能超过20个字符'
    }),
    address: Joi.string().allow('').max(200).messages({
      'string.max': '地址不能超过200个字符'
    })
  }).required(),
  products: Joi.array().items(
    Joi.object({
      product: Joi.string().required().messages({
        'string.base': '产品ID或名称必须是字符串',
        'string.empty': '产品ID或名称不能为空',
        'any.required': '产品ID或名称是必填项'
      }),
      quantity: Joi.number().integer().min(1).required().messages({
        'number.base': '数量必须是数字',
        'number.integer': '数量必须是整数',
        'number.min': '数量最小为1',
        'any.required': '数量是必填项'
      }),
      price: Joi.number().min(0).required().messages({
        'number.base': '单价必须是数字',
        'number.min': '单价不能小于0',
        'any.required': '单价是必填项'
      }),
      subtotal: Joi.number().min(0).required().messages({
        'number.base': '小计必须是数字',
        'number.min': '小计不能小于0',
        'any.required': '小计是必填项'
      })
    })
  ).min(1).required().messages({
    'array.min': '至少需要一个产品',
    'any.required': '产品列表是必填项'
  }),
  totalAmount: Joi.number().min(0).required().messages({
    'number.base': '总金额必须是数字',
    'number.min': '总金额不能小于0',
    'any.required': '总金额是必填项'
  }),
  paymentMethod: Joi.string().valid('cash', 'wechat', 'alipay', 'bank_transfer', 'other').required().messages({
    'string.base': '支付方式必须是字符串',
    'any.only': '支付方式只能是cash、wechat、alipay、bank_transfer或other',
    'any.required': '支付方式是必填项'
  }),
  paymentStatus: Joi.string().valid('paid', 'pending', 'partial', 'cancelled').required().messages({
    'string.base': '支付状态必须是字符串',
    'any.only': '支付状态只能是paid、pending、partial或cancelled',
    'any.required': '支付状态是必填项'
  }),
  notes: Joi.string().allow('').max(500).messages({
    'string.max': '备注不能超过500个字符'
  }),
  saleDate: Joi.date().messages({
    'date.base': '销售日期必须是有效的日期格式'
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
  note: Joi.string().max(500).messages({
    'string.max': '备注不能超过500个字符'
  }),
  paymentMethod: Joi.string().valid('cash', 'card', 'transfer', 'other').required().messages({
    'string.base': '支付方式必须是字符串',
    'any.only': '支付方式只能是cash、card、transfer或other',
    'any.required': '支付方式是必填项'
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
  productCode: Joi.string().required().messages({
    'string.base': '产品编码必须是字符串',
    'string.empty': '产品编码不能为空',
    'any.required': '产品编码是必填项'
  }),
  quantity: Joi.number().integer().min(0).required().messages({
    'number.base': '数量必须是数字',
    'number.integer': '数量必须是整数',
    'number.min': '数量不能为负数',
    'any.required': '数量是必填项'
  }),
  unit: Joi.string().required().messages({
    'string.base': '单位必须是字符串',
    'string.empty': '单位不能为空',
    'any.required': '单位是必填项'
  }),
  location: Joi.string().messages({
    'string.base': '库存位置必须是字符串'
  }),
  status: Joi.string().valid('normal', 'low', 'out').messages({
    'string.base': '状态必须是字符串',
    'any.only': '状态只能是normal、low或out'
  }),
  lowThreshold: Joi.number().integer().min(0).messages({
    'number.base': '低库存阈值必须是数字',
    'number.integer': '低库存阈值必须是整数',
    'number.min': '低库存阈值不能为负数'
  })
});

/**
 * 库存更新验证模式（字段可选，支持基本信息更新和数量调整）
 */
const inventoryUpdateSchema = Joi.object({
  // 基本信息字段
  name: Joi.string().min(2).max(100).messages({
    'string.base': '商品名称必须是字符串',
    'string.empty': '商品名称不能为空',
    'string.min': '商品名称至少需要2个字符',
    'string.max': '商品名称不能超过100个字符'
  }),
  productName: Joi.string().min(2).max(100).messages({
    'string.base': '商品名称必须是字符串',
    'string.empty': '商品名称不能为空',
    'string.min': '商品名称至少需要2个字符',
    'string.max': '商品名称不能超过100个字符'
  }),
  productCode: Joi.string().messages({
    'string.base': '产品编码必须是字符串',
    'string.empty': '产品编码不能为空'
  }),
  quantity: Joi.number().integer().min(0).messages({
    'number.base': '数量必须是数字',
    'number.integer': '数量必须是整数',
    'number.min': '数量不能为负数'
  }),
  unit: Joi.string().messages({
    'string.base': '单位必须是字符串',
    'string.empty': '单位不能为空'
  }),
  location: Joi.string().messages({
    'string.base': '库存位置必须是字符串'
  }),
  status: Joi.string().valid('normal', 'low', 'out').messages({
    'string.base': '状态必须是字符串',
    'any.only': '状态只能是normal、low或out'
  }),
  lowThreshold: Joi.number().integer().min(0).messages({
    'number.base': '低库存阈值必须是数字',
    'number.integer': '低库存阈值必须是整数',
    'number.min': '低库存阈值不能为负数'
  }),
  
  // 数量调整相关字段
  adjustmentType: Joi.string().valid('increase', 'decrease').messages({
    'string.base': '调整类型必须是字符串',
    'any.only': '调整类型只能是increase或decrease'
  }),
  adjustmentQuantity: Joi.number().integer().min(1).when('adjustmentType', {
    is: Joi.exist(),
    then: Joi.required(),
    otherwise: Joi.optional()
  }).messages({
    'number.base': '调整数量必须是数字',
    'number.integer': '调整数量必须是整数',
    'number.min': '调整数量最小为1',
    'any.required': '当指定调整类型时，调整数量是必填项'
  }),
  adjustmentReason: Joi.string().max(200).messages({
    'string.base': '调整原因必须是字符串',
    'string.max': '调整原因不能超过200个字符'
  }),
  notes: Joi.string().max(500).messages({
    'string.base': '备注必须是字符串',
    'string.max': '备注不能超过500个字符'
  })
}).custom((value, helpers) => {
  // 自定义验证：如果提供了adjustmentType，必须提供adjustmentQuantity
  if (value.adjustmentType && !value.adjustmentQuantity) {
    return helpers.error('custom.adjustmentQuantityRequired');
  }
  
  // 自定义验证：不能同时使用quantity和adjustmentType
  if (value.quantity !== undefined && value.adjustmentType) {
    return helpers.error('custom.conflictingQuantityFields');
  }
  
  return value;
}).messages({
  'custom.adjustmentQuantityRequired': '当指定调整类型时，调整数量是必填项',
  'custom.conflictingQuantityFields': '不能同时使用quantity和adjustmentType字段'
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

// 定义库存更新验证中间件
const validateInventoryUpdate = validate(inventoryUpdateSchema);

// 定义库存变动验证中间件


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
  inventoryUpdateSchema,
  logisticsSchema,
  validateTransaction,
  validateInventory,
  validateInventoryUpdate,
  validateLogistics,
  validateLogisticsStatus
};