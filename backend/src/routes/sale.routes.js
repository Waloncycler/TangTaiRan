const express = require('express');
const router = express.Router();
const { 
  createSale, 
  getAllSales, 
  getSaleById, 
  updateSale, 
  deleteSale,
  getAgentSales,
  getSalesStats,
  getAgentSalesStats
} = require('../controllers/sale.controller');
const { authMiddleware, authorizeRoles, agentDataAccess } = require('../middleware/auth.middleware');
const { validate, saleSchema } = require('../middleware/validation.middleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     Sale:
 *       type: object
 *       required:
 *         - agent
 *         - customer
 *         - products
 *         - totalAmount
 *       properties:
 *         _id:
 *           type: string
 *           description: 销售记录ID
 *         agent:
 *           type: string
 *           description: 代理ID
 *         customer:
 *           type: object
 *           properties:
 *             name:
 *               type: string
 *               description: 客户姓名
 *             phone:
 *               type: string
 *               description: 客户电话
 *             address:
 *               type: string
 *               description: 客户地址
 *         products:
 *           type: array
 *           items:
 *             type: object
 *             properties:
 *               product:
 *                 type: string
 *                 description: 产品ID或名称
 *               quantity:
 *                 type: number
 *                 description: 数量
 *               price:
 *                 type: number
 *                 description: 单价
 *               subtotal:
 *                 type: number
 *                 description: 小计
 *         totalAmount:
 *           type: number
 *           description: 总金额
 *         paymentMethod:
 *           type: string
 *           description: 支付方式
 *           enum: [cash, wechat, alipay, bank_transfer, other]
 *         paymentStatus:
 *           type: string
 *           description: 支付状态
 *           enum: [paid, pending, partial, cancelled]
 *         notes:
 *           type: string
 *           description: 备注
 *         saleDate:
 *           type: string
 *           format: date-time
 *           description: 销售日期
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: 创建时间
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: 更新时间
 *       example:
 *         _id: 60d21b4667d0d8992e610c85
 *         agent: 60d21b4667d0d8992e610c86
 *         customer:
 *           name: 李四
 *           phone: '13900139000'
 *           address: 上海市浦东新区
 *         products:
 *           - product: 唐太然护肤霜
 *             quantity: 2
 *             price: 199
 *             subtotal: 398
 *         totalAmount: 398
 *         paymentMethod: wechat
 *         paymentStatus: paid
 *         notes: 客户很满意
 *         saleDate: '2023-01-01T00:00:00.000Z'
 *         createdAt: '2023-01-01T00:00:00.000Z'
 *         updatedAt: '2023-01-01T00:00:00.000Z'
 */

// 所有销售记录路由都需要认证
router.use(authMiddleware);

/**
 * @swagger
 * /api/sales/stats:
 *   get:
 *     summary: 获取销售统计数据
 *     description: 获取整体销售统计数据，包括总销售额、销售数量等，仅管理员可访问
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 开始日期 (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 结束日期 (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: 成功获取销售统计数据
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalSales:
 *                       type: number
 *                       example: 50000
 *                     totalOrders:
 *                       type: number
 *                       example: 100
 *                     averageOrderValue:
 *                       type: number
 *                       example: 500
 *                     topProducts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           product:
 *                             type: string
 *                           count:
 *                             type: number
 *                           amount:
 *                             type: number
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       500:
 *         description: 服务器错误
 */
router.get('/stats', authorizeRoles('admin'), getSalesStats);

/**
 * @swagger
 * /api/sales:
 *   get:
 *     summary: 获取所有销售记录
 *     description: 获取所有销售记录，支持分页和过滤，仅管理员可访问
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 每页数量
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 开始日期 (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 结束日期 (YYYY-MM-DD)
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *           enum: [paid, pending, partial, cancelled]
 *         description: 按支付状态过滤
 *       - in: query
 *         name: minAmount
 *         schema:
 *           type: number
 *         description: 最小金额
 *       - in: query
 *         name: maxAmount
 *         schema:
 *           type: number
 *         description: 最大金额
 *     responses:
 *       200:
 *         description: 成功获取销售记录列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 50
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Sale'
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       500:
 *         description: 服务器错误
 */
router.get('/', authorizeRoles('admin'), getAllSales);

/**
 * @swagger
 * /api/sales:
 *   post:
 *     summary: 创建销售记录
 *     description: 创建新的销售记录，管理员或代理可操作
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - customer
 *               - products
 *               - totalAmount
 *               - paymentMethod
 *               - paymentStatus
 *             properties:
 *               customer:
 *                 type: object
 *                 required:
 *                   - name
 *                 properties:
 *                   name:
 *                     type: string
 *                   phone:
 *                     type: string
 *                   address:
 *                     type: string
 *               products:
 *                 type: array
 *                 items:
 *                   type: object
 *                   required:
 *                     - product
 *                     - quantity
 *                     - price
 *                     - subtotal
 *                   properties:
 *                     product:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                     price:
 *                       type: number
 *                     subtotal:
 *                       type: number
 *               totalAmount:
 *                 type: number
 *               paymentMethod:
 *                 type: string
 *                 enum: [cash, wechat, alipay, bank_transfer, other]
 *               paymentStatus:
 *                 type: string
 *                 enum: [paid, pending, partial, cancelled]
 *               notes:
 *                 type: string
 *               saleDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       201:
 *         description: 销售记录创建成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Sale'
 *       400:
 *         description: 请求数据无效
 *       401:
 *         description: 未授权
 *       500:
 *         description: 服务器错误
 */
router.post('/', authMiddleware, validate(saleSchema), createSale);

/**
 * @swagger
 * /api/sales/{id}:
 *   get:
 *     summary: 获取单个销售记录
 *     description: 根据ID获取单个销售记录的详细信息，管理员或相关代理可访问
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 销售记录ID
 *     responses:
 *       200:
 *         description: 成功获取销售记录
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Sale'
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 销售记录不存在
 *       500:
 *         description: 服务器错误
 */
router.get('/:id', getSaleById);

/**
 * @swagger
 * /api/sales/{id}:
 *   put:
 *     summary: 更新销售记录
 *     description: 更新指定销售记录的信息，仅管理员可操作
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 销售记录ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               customer:
 *                 type: object
 *                 properties:
 *                   name:
 *                     type: string
 *                   phone:
 *                     type: string
 *                   address:
 *                     type: string
 *               products:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     product:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                     price:
 *                       type: number
 *                     subtotal:
 *                       type: number
 *               totalAmount:
 *                 type: number
 *               paymentMethod:
 *                 type: string
 *                 enum: [cash, wechat, alipay, bank_transfer, other]
 *               paymentStatus:
 *                 type: string
 *                 enum: [paid, pending, partial, cancelled]
 *               notes:
 *                 type: string
 *               saleDate:
 *                 type: string
 *                 format: date-time
 *     responses:
 *       200:
 *         description: 销售记录更新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Sale'
 *       400:
 *         description: 请求数据无效
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 销售记录不存在
 *       500:
 *         description: 服务器错误
 */
router.put('/:id', authorizeRoles('admin'), validate(saleSchema), updateSale);

/**
 * @swagger
 * /api/sales/{id}:
 *   delete:
 *     summary: 删除销售记录
 *     description: 删除指定的销售记录，仅管理员可操作
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 销售记录ID
 *     responses:
 *       200:
 *         description: 销售记录删除成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: 销售记录已成功删除
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 销售记录不存在
 *       500:
 *         description: 服务器错误
 */
router.delete('/:id', authorizeRoles('admin'), deleteSale);

/**
 * @swagger
 * /api/sales/agent/{agentId}:
 *   get:
 *     summary: 获取代理的销售记录
 *     description: 获取指定代理的所有销售记录，管理员或代理本人可访问
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema:
 *           type: string
 *         description: 代理ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: 页码
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         description: 每页数量
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 开始日期 (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 结束日期 (YYYY-MM-DD)
 *       - in: query
 *         name: paymentStatus
 *         schema:
 *           type: string
 *           enum: [paid, pending, partial, cancelled]
 *         description: 按支付状态过滤
 *     responses:
 *       200:
 *         description: 成功获取代理销售记录
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 count:
 *                   type: integer
 *                   example: 20
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Sale'
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 代理不存在
 *       500:
 *         description: 服务器错误
 */
router.get('/agent/:agentId', getAgentSales);

/**
 * @swagger
 * /api/sales/agent/{agentId}/stats:
 *   get:
 *     summary: 获取代理的销售统计数据
 *     description: 获取指定代理的销售统计数据，包括总销售额、销售数量等，管理员或代理本人可访问
 *     tags: [Sales]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: agentId
 *         required: true
 *         schema:
 *           type: string
 *         description: 代理ID
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 开始日期 (YYYY-MM-DD)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 结束日期 (YYYY-MM-DD)
 *     responses:
 *       200:
 *         description: 成功获取代理销售统计数据
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalSales:
 *                       type: number
 *                       example: 20000
 *                     totalOrders:
 *                       type: number
 *                       example: 40
 *                     averageOrderValue:
 *                       type: number
 *                       example: 500
 *                     topProducts:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           product:
 *                             type: string
 *                           count:
 *                             type: number
 *                           amount:
 *                             type: number
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 代理不存在
 *       500:
 *         description: 服务器错误
 */
router.get('/agent/:agentId/stats', getAgentSalesStats);

module.exports = router;