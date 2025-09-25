const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller');
const { authMiddleware, authorizeRoles } = require('../middleware/auth.middleware');
const { validateInventory, validateInventoryUpdate } = require('../middleware/validation.middleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     Inventory:
 *       type: object
 *       required:
 *         - name
 *         - productCode
 *         - quantity
 *         - unit
 *       properties:
 *         _id:
 *           type: string
 *           description: MongoDB文档ID
 *         id:
 *           type: number
 *           description: 自定义库存ID
 *         productCode:
 *           type: string
 *           description: 产品编码
 *         name:
 *           type: string
 *           description: 产品名称
 *         quantity:
 *           type: number
 *           description: 库存数量
 *         unit:
 *           type: string
 *           description: 单位（如：个、盒、瓶等）
 *         location:
 *           type: string
 *           description: 存放位置
 *         status:
 *           type: string
 *           enum: [normal, low, out_of_stock]
 *           description: 库存状态
 *         lowThreshold:
 *           type: number
 *           description: 低库存阈值
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: 创建时间
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: 更新时间
 *         __v:
 *           type: number
 *           description: MongoDB版本字段
 *       example:
 *         _id: "68d4088385d03c44428460b9"
 *         id: 2
 *         productCode: "3"
 *         name: "更新后的测试产品"
 *         quantity: 150
 *         unit: "个"
 *         location: "仓库A"
 *         status: "normal"
 *         lowThreshold: 15
 *         createdAt: "2025-09-24T15:04:35.527Z"
 *         updatedAt: "2025-09-24T15:05:46.075Z"
 *         __v: 0
 *     InventoryAdjustment:
 *       type: object
 *       required:
 *         - quantity
 *         - reason
 *       properties:
 *         quantity:
 *           type: number
 *           description: 调整数量（正数为增加，负数为减少）
 *         reason:
 *           type: string
 *           description: 调整原因
 *         notes:
 *           type: string
 *           description: 备注
 *       example:
 *         quantity: 10
 *         reason: 新进货
 *         notes: 2023年1月1日进货
 */

/**
 * @swagger
 * /api/inventory/stats:
 *   get:
 *     summary: 获取库存统计数据
 *     tags: [Inventory]
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     totalProducts:
 *                       type: integer
 *                     totalQuantity:
 *                       type: integer
 *                     totalValue:
 *                       type: number
 *                     statusBreakdown:
 *                       type: object
 *                       properties:
 *                         normal:
 *                           type: integer
 *                         low:
 *                           type: integer
 *                         out:
 *                           type: integer
 *                     locationBreakdown:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           location:
 *                             type: string
 *                           count:
 *                             type: integer
 *                           totalQuantity:
 *                             type: integer
 *                           totalValue:
 *                             type: number
 *                     unitBreakdown:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           unit:
 *                             type: string
 *                           count:
 *                             type: integer
 *                           totalQuantity:
 *                             type: integer
 *                     recentActivity:
 *                       type: object
 *                       properties:
 *                         lastUpdated:
 *                           type: string
 *                           format: date-time
 *                         recentChanges:
 *                           type: integer
 *       500:
 *         description: 服务器错误
 */
router.get('/stats', inventoryController.getInventoryStats); // 临时移除认证中间件进行测试

/**
 * @swagger
 * /api/inventory:
 *   get:
 *     summary: 获取所有库存记录
 *     tags: [Inventory]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: productName
 *         schema:
 *           type: string
 *       - in: query
 *         name: productCode
 *         schema:
 *           type: string
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [normal, low, out]
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Inventory'
 *       400:
 *         description: 请求错误
 *       500:
 *         description: 服务器错误
 *   post:
 *     summary: 创建库存记录
 *     tags: [Inventory]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - productCode
 *               - quantity
 *               - unit
 *             properties:
 *               name:
 *                 type: string
 *               productCode:
 *                 type: string
 *                 enum: ["1", "2", "3", "4"]
 *               quantity:
 *                 type: number
 *               unit:
 *                 type: string
 *               location:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [normal, low, out]
 *               lowThreshold:
 *                 type: number
 *     responses:
 *       201:
 *         description: 创建成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Inventory'
 *       400:
 *         description: 请求错误
 *       500:
 *         description: 服务器错误
 */
router
  .route('/')
  .get(inventoryController.getAllInventory) // 临时移除认证中间件进行测试
  .post(validateInventory, inventoryController.createInventory); // 临时移除认证中间件进行测试

/**
 * @swagger
 * /api/inventory/{id}:
 *   get:
 *     summary: 获取单个库存记录
 *     tags: [Inventory]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Inventory'
 *       404:
 *         description: 记录不存在
 *       500:
 *         description: 服务器错误
 *   put:
 *     summary: 更新库存记录
 *     tags: [Inventory]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *               productCode:
 *                 type: string
 *                 enum: ["1", "2", "3", "4"]
 *               quantity:
 *                 type: number
 *               unit:
 *                 type: string
 *               location:
 *                 type: string
 *               status:
 *                 type: string
 *                 enum: [normal, low, out]
 *               lowThreshold:
 *                 type: number
 *               adjustmentType:
 *                 type: string
 *                 enum: [increase, decrease]
 *               adjustmentQuantity:
 *                 type: number
 *               adjustmentReason:
 *                 type: string
 *               notes:
 *                 type: string
 *     responses:
 *       200:
 *         description: 更新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Inventory'
 *       400:
 *         description: 请求错误
 *       404:
 *         description: 记录不存在
 *       500:
 *         description: 服务器错误
 *   delete:
 *     summary: 删除库存记录
 *     tags: [Inventory]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: 删除成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       400:
 *         description: 请求错误
 *       404:
 *         description: 记录不存在
 *       500:
 *         description: 服务器错误
 */
router
  .route('/:id')
  .get(inventoryController.getInventoryById) // 临时移除认证中间件进行测试
  .put(validateInventoryUpdate, inventoryController.updateInventory) // 临时移除认证中间件进行测试
  .delete(inventoryController.deleteInventory); // 临时移除认证中间件进行测试



/**
 * @swagger
 * /api/inventory/{id}/history:
 *   get:
 *     summary: 获取库存历史记录
 *     tags: [Inventory]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *     responses:
 *       200:
 *         description: 成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       inventoryId:
 *                         type: string
 *                       type:
 *                         type: string
 *                         enum: [increase, decrease, update]
 *                       previousQuantity:
 *                         type: number
 *                       newQuantity:
 *                         type: number
 *                       adjustmentQuantity:
 *                         type: number
 *                       reason:
 *                         type: string
 *                       notes:
 *                         type: string
 *                       adjustedBy:
 *                         type: string
 *                       createdAt:
 *                         type: string
 *                         format: date-time
 *                       updatedAt:
 *                         type: string
 *                         format: date-time
 *                 pagination:
 *                   type: object
 *                   properties:
 *                     currentPage:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 *                     totalItems:
 *                       type: integer
 *                     hasNextPage:
 *                       type: boolean
 *                     hasPrevPage:
 *                       type: boolean
 *       404:
 *         description: 记录不存在
 *       500:
 *         description: 服务器错误
 */
router.get('/:id/history', inventoryController.getInventoryHistory); // 临时移除认证中间件进行测试

module.exports = router;