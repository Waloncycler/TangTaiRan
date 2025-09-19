const express = require('express');
const router = express.Router();
const logisticsController = require('../controllers/logistics.controller');
const { authMiddleware, authorizeRoles } = require('../middleware/auth.middleware');
const { validateLogistics, validateLogisticsStatus } = require('../middleware/validation.middleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     Logistics:
 *       type: object
 *       required:
 *         - trackingNumber
 *         - recipient
 *         - address
 *         - status
 *       properties:
 *         _id:
 *           type: string
 *           description: 物流订单ID
 *         trackingNumber:
 *           type: string
 *           description: 物流跟踪号
 *         recipient:
 *           type: string
 *           description: 收件人姓名
 *         phone:
 *           type: string
 *           description: 收件人电话
 *         address:
 *           type: string
 *           description: 收件地址
 *         items:
 *           type: array
 *           description: 物流包含的商品
 *           items:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               quantity:
 *                 type: number
 *               sku:
 *                 type: string
 *         weight:
 *           type: number
 *           description: 包裹重量(kg)
 *         shippingMethod:
 *           type: string
 *           description: 配送方式
 *         shippingFee:
 *           type: number
 *           description: 运费
 *         status:
 *           type: string
 *           description: 物流状态
 *           enum: [pending, shipped, in_transit, delivered, returned, cancelled]
 *         statusHistory:
 *           type: array
 *           description: 状态变更历史
 *           items:
 *             type: object
 *             properties:
 *               status:
 *                 type: string
 *               timestamp:
 *                 type: string
 *                 format: date-time
 *               notes:
 *                 type: string
 *         notes:
 *           type: string
 *           description: 备注
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
 *         trackingNumber: TTR20230101001
 *         recipient: 张三
 *         phone: 13800138000
 *         address: 北京市朝阳区某某路123号
 *         items: [
 *           {
 *             name: 唐太然护肤霜,
 *             quantity: 2,
 *             sku: TTR-HSC-001
 *           }
 *         ]
 *         weight: 1.5
 *         shippingMethod: 顺丰速运
 *         shippingFee: 20
 *         status: shipped
 *         statusHistory: [
 *           {
 *             status: pending,
 *             timestamp: '2023-01-01T10:00:00.000Z',
 *             notes: 订单已创建
 *           },
 *           {
 *             status: shipped,
 *             timestamp: '2023-01-02T14:30:00.000Z',
 *             notes: 包裹已发出
 *           }
 *         ]
 *         notes: 请在工作日送达
 *         createdAt: '2023-01-01T00:00:00.000Z'
 *         updatedAt: '2023-01-02T14:30:00.000Z'
 *     LogisticsStatus:
 *       type: object
 *       required:
 *         - status
 *       properties:
 *         status:
 *           type: string
 *           description: 物流状态
 *           enum: [pending, shipped, in_transit, delivered, returned, cancelled]
 *         notes:
 *           type: string
 *           description: 状态变更备注
 *       example:
 *         status: delivered
 *         notes: 已送达，签收人：张三
 */

/**
 * @swagger
 * /api/logistics/tracking/{trackingNumber}:
 *   get:
 *     summary: 通过跟踪号查询物流
 *     description: 公开API，任何人都可以通过物流跟踪号查询物流状态
 *     tags: [Logistics]
 *     parameters:
 *       - in: path
 *         name: trackingNumber
 *         required: true
 *         schema:
 *           type: string
 *         description: 物流跟踪号
 *     responses:
 *       200:
 *         description: 成功获取物流信息
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Logistics'
 *       404:
 *         description: 物流订单不存在
 *       500:
 *         description: 服务器错误
 */
router.get('/tracking/:trackingNumber', logisticsController.getLogisticsByTrackingNumber);

// 需要认证的路由
/**
 * @swagger
 * /api/logistics/stats:
 *   get:
 *     summary: 获取物流统计数据
 *     description: 获取物流统计数据，包括各状态订单数量、平均配送时间等
 *     tags: [Logistics]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功获取物流统计数据
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
 *                     totalOrders:
 *                       type: number
 *                       example: 120
 *                     statusBreakdown:
 *                       type: object
 *                       properties:
 *                         pending:
 *                           type: number
 *                           example: 20
 *                         shipped:
 *                           type: number
 *                           example: 30
 *                         in_transit:
 *                           type: number
 *                           example: 40
 *                         delivered:
 *                           type: number
 *                           example: 25
 *                         returned:
 *                           type: number
 *                           example: 3
 *                         cancelled:
 *                           type: number
 *                           example: 2
 *                     avgDeliveryTime:
 *                       type: number
 *                       example: 3.5
 *                     monthlyTrend:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           month:
 *                             type: string
 *                           count:
 *                             type: number
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       500:
 *         description: 服务器错误
 */
router.get('/stats', authMiddleware, authorizeRoles('admin'), logisticsController.getLogisticsStats);

/**
 * @swagger
 * /api/logistics/import:
 *   post:
 *     summary: 批量导入物流订单
 *     description: 通过CSV或Excel文件批量导入物流订单数据
 *     tags: [Logistics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: CSV或Excel文件
 *     responses:
 *       200:
 *         description: 物流订单导入成功
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
 *                   example: 成功导入20条物流订单
 *                 data:
 *                   type: object
 *                   properties:
 *                     imported:
 *                       type: number
 *                       example: 20
 *                     failed:
 *                       type: number
 *                       example: 0
 *       400:
 *         description: 请求数据无效或文件格式错误
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       500:
 *         description: 服务器错误
 */
router.post('/import', authMiddleware, authorizeRoles('admin'), logisticsController.importLogistics);

/**
 * @swagger
 * /api/logistics/export:
 *   get:
 *     summary: 导出物流订单
 *     description: 将物流订单数据导出为CSV或Excel文件
 *     tags: [Logistics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: format
 *         schema:
 *           type: string
 *           enum: [csv, excel]
 *           default: csv
 *         description: 导出文件格式
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, shipped, in_transit, delivered, returned, cancelled]
 *         description: 按状态过滤
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
 *         description: 成功导出物流订单数据
 *         content:
 *           application/octet-stream:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       500:
 *         description: 服务器错误
 */
router.get('/export', authMiddleware, authorizeRoles('admin'), logisticsController.exportLogistics);

// 物流订单的CRUD操作

/**
 * @swagger
 * /api/logistics:
 *   get:
 *     summary: 获取所有物流订单
 *     description: 获取所有物流订单，支持分页和过滤
 *     tags: [Logistics]
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
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, shipped, in_transit, delivered, returned, cancelled]
 *         description: 按状态过滤
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 搜索收件人或跟踪号
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
 *         description: 成功获取物流订单列表
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
 *                     $ref: '#/components/schemas/Logistics'
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       500:
 *         description: 服务器错误
 *   post:
 *     summary: 创建物流订单
 *     description: 创建新的物流订单
 *     tags: [Logistics]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - recipient
 *               - phone
 *               - address
 *               - items
 *             properties:
 *               trackingNumber:
 *                 type: string
 *                 description: 物流跟踪号（如不提供将自动生成）
 *               recipient:
 *                 type: string
 *                 description: 收件人姓名
 *               phone:
 *                 type: string
 *                 description: 收件人电话
 *               address:
 *                 type: string
 *                 description: 收件地址
 *               items:
 *                 type: array
 *                 description: 物流包含的商品
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                     sku:
 *                       type: string
 *               weight:
 *                 type: number
 *                 description: 包裹重量(kg)
 *               shippingMethod:
 *                 type: string
 *                 description: 配送方式
 *               shippingFee:
 *                 type: number
 *                 description: 运费
 *               status:
 *                 type: string
 *                 description: 物流状态
 *                 enum: [pending, shipped, in_transit, delivered, returned, cancelled]
 *                 default: pending
 *               notes:
 *                 type: string
 *                 description: 备注
 *     responses:
 *       201:
 *         description: 物流订单创建成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Logistics'
 *       400:
 *         description: 请求数据无效
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       500:
 *         description: 服务器错误
 */
router
  .route('/')
  .get(authMiddleware, authorizeRoles('admin'), logisticsController.getAllLogistics)
  .post(authMiddleware, authorizeRoles('admin'), validateLogistics, logisticsController.createLogistics);

/**
 * @swagger
 * /api/logistics/{id}:
 *   get:
 *     summary: 获取单个物流订单
 *     description: 根据ID获取单个物流订单的详细信息
 *     tags: [Logistics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 物流订单ID
 *     responses:
 *       200:
 *         description: 成功获取物流订单
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Logistics'
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 物流订单不存在
 *       500:
 *         description: 服务器错误
 *   put:
 *     summary: 更新物流订单
 *     description: 更新指定物流订单的信息
 *     tags: [Logistics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 物流订单ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               trackingNumber:
 *                 type: string
 *                 description: 物流跟踪号
 *               recipient:
 *                 type: string
 *                 description: 收件人姓名
 *               phone:
 *                 type: string
 *                 description: 收件人电话
 *               address:
 *                 type: string
 *                 description: 收件地址
 *               items:
 *                 type: array
 *                 description: 物流包含的商品
 *                 items:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     quantity:
 *                       type: number
 *                     sku:
 *                       type: string
 *               weight:
 *                 type: number
 *                 description: 包裹重量(kg)
 *               shippingMethod:
 *                 type: string
 *                 description: 配送方式
 *               shippingFee:
 *                 type: number
 *                 description: 运费
 *               notes:
 *                 type: string
 *                 description: 备注
 *     responses:
 *       200:
 *         description: 物流订单更新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Logistics'
 *       400:
 *         description: 请求数据无效
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 物流订单不存在
 *       500:
 *         description: 服务器错误
 *   delete:
 *     summary: 删除物流订单
 *     description: 删除指定的物流订单
 *     tags: [Logistics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 物流订单ID
 *     responses:
 *       200:
 *         description: 物流订单删除成功
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
 *                   example: 物流订单已成功删除
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 物流订单不存在
 *       500:
 *         description: 服务器错误
 */
router
  .route('/:id')
  .get(authMiddleware, authorizeRoles('admin'), logisticsController.getLogisticsById)
  .put(authMiddleware, authorizeRoles('admin'), validateLogistics, logisticsController.updateLogistics)
  .delete(authMiddleware, authorizeRoles('admin'), logisticsController.deleteLogistics);

// 物流状态管理
/**
 * @swagger
 * /api/logistics/{id}/status:
 *   get:
 *     summary: 获取物流状态历史
 *     description: 获取指定物流订单的状态变更历史
 *     tags: [Logistics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 物流订单ID
 *     responses:
 *       200:
 *         description: 成功获取物流状态历史
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       status:
 *                         type: string
 *                         enum: [pending, shipped, in_transit, delivered, returned, cancelled]
 *                       timestamp:
 *                         type: string
 *                         format: date-time
 *                       notes:
 *                         type: string
 *                       updatedBy:
 *                         type: string
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 物流订单不存在
 *       500:
 *         description: 服务器错误
 *   post:
 *     summary: 更新物流状态
 *     description: 更新指定物流订单的状态
 *     tags: [Logistics]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 物流订单ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/LogisticsStatus'
 *     responses:
 *       200:
 *         description: 物流状态更新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Logistics'
 *                 statusUpdate:
 *                   type: object
 *                   properties:
 *                     status:
 *                       type: string
 *                     timestamp:
 *                       type: string
 *                       format: date-time
 *                     notes:
 *                       type: string
 *       400:
 *         description: 请求数据无效
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 物流订单不存在
 *       500:
 *         description: 服务器错误
 */
router
  .route('/:id/status')
  .get(authMiddleware, authorizeRoles('admin'), logisticsController.getLogisticsStatusHistory)
  .post(authMiddleware, authorizeRoles('admin'), validateLogisticsStatus, logisticsController.updateLogisticsStatus);

module.exports = router;