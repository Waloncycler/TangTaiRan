const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventory.controller');
const { authMiddleware, authorizeRoles } = require('../middleware/auth.middleware');
const { validateInventory, validateInventoryAdjustment } = require('../middleware/validation.middleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     Inventory:
 *       type: object
 *       required:
 *         - productName
 *         - sku
 *         - quantity
 *       properties:
 *         _id:
 *           type: string
 *           description: 库存ID
 *         productName:
 *           type: string
 *           description: 产品名称
 *         sku:
 *           type: string
 *           description: 库存单位
 *         category:
 *           type: string
 *           description: 产品类别
 *         quantity:
 *           type: number
 *           description: 库存数量
 *         unit:
 *           type: string
 *           description: 单位（如：盒、瓶等）
 *         unitPrice:
 *           type: number
 *           description: 单价
 *         reorderLevel:
 *           type: number
 *           description: 补货阈值
 *         location:
 *           type: string
 *           description: 存放位置
 *         supplier:
 *           type: string
 *           description: 供应商
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
 *         productName: 唐太然护肤霜
 *         sku: TTR-HSC-001
 *         category: 护肤品
 *         quantity: 100
 *         unit: 盒
 *         unitPrice: 199
 *         reorderLevel: 20
 *         location: A区-01架
 *         supplier: 唐太然生产厂
 *         notes: 畅销产品
 *         createdAt: '2023-01-01T00:00:00.000Z'
 *         updatedAt: '2023-01-01T00:00:00.000Z'
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
 *     description: 获取库存统计数据，包括总库存价值、低库存产品数量等
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功获取库存统计数据
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
 *                     totalProducts:
 *                       type: number
 *                       example: 50
 *                     totalValue:
 *                       type: number
 *                       example: 100000
 *                     lowStockItems:
 *                       type: number
 *                       example: 5
 *                     categoryBreakdown:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           category:
 *                             type: string
 *                           count:
 *                             type: number
 *                           value:
 *                             type: number
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       500:
 *         description: 服务器错误
 */
router.get('/stats', authMiddleware, authorizeRoles('admin'), inventoryController.getInventoryStats);

/**
 * @swagger
 * /api/inventory/import:
 *   post:
 *     summary: 批量导入库存
 *     description: 通过CSV或Excel文件批量导入库存数据
 *     tags: [Inventory]
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
 *         description: 库存数据导入成功
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
 *                   example: 成功导入30条库存记录
 *                 data:
 *                   type: object
 *                   properties:
 *                     imported:
 *                       type: number
 *                       example: 30
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
router.post('/import', authMiddleware, authorizeRoles('admin'), inventoryController.importInventory);

/**
 * @swagger
 * /api/inventory/export:
 *   get:
 *     summary: 导出库存数据
 *     description: 将库存数据导出为CSV或Excel文件
 *     tags: [Inventory]
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
 *         name: category
 *         schema:
 *           type: string
 *         description: 按类别过滤
 *     responses:
 *       200:
 *         description: 成功导出库存数据
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
router.get('/export', authMiddleware, authorizeRoles('admin'), inventoryController.exportInventory);

// 库存记录的CRUD操作

/**
 * @swagger
 * /api/inventory:
 *   get:
 *     summary: 获取所有库存
 *     description: 获取所有库存记录，支持分页和过滤
 *     tags: [Inventory]
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
 *         name: category
 *         schema:
 *           type: string
 *         description: 按类别过滤
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: 搜索产品名称或SKU
 *       - in: query
 *         name: lowStock
 *         schema:
 *           type: boolean
 *         description: 仅显示低库存产品
 *     responses:
 *       200:
 *         description: 成功获取库存列表
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
 *                     $ref: '#/components/schemas/Inventory'
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       500:
 *         description: 服务器错误
 *   post:
 *     summary: 创建库存记录
 *     description: 创建新的库存记录
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productName
 *               - sku
 *               - quantity
 *             properties:
 *               productName:
 *                 type: string
 *                 description: 产品名称
 *               sku:
 *                 type: string
 *                 description: 库存单位
 *               category:
 *                 type: string
 *                 description: 产品类别
 *               quantity:
 *                 type: number
 *                 description: 库存数量
 *               unit:
 *                 type: string
 *                 description: 单位（如：盒、瓶等）
 *               unitPrice:
 *                 type: number
 *                 description: 单价
 *               reorderLevel:
 *                 type: number
 *                 description: 补货阈值
 *               location:
 *                 type: string
 *                 description: 存放位置
 *               supplier:
 *                 type: string
 *                 description: 供应商
 *               notes:
 *                 type: string
 *                 description: 备注
 *     responses:
 *       201:
 *         description: 库存记录创建成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Inventory'
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
  .get(authMiddleware, authorizeRoles('admin'), inventoryController.getAllInventory)
  .post(authMiddleware, authorizeRoles('admin'), validateInventory, inventoryController.createInventory);

/**
 * @swagger
 * /api/inventory/{id}:
 *   get:
 *     summary: 获取单个库存记录
 *     description: 根据ID获取单个库存记录的详细信息
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 库存记录ID
 *     responses:
 *       200:
 *         description: 成功获取库存记录
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Inventory'
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 库存记录不存在
 *       500:
 *         description: 服务器错误
 *   put:
 *     summary: 更新库存记录
 *     description: 更新指定库存记录的信息
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 库存记录ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productName:
 *                 type: string
 *                 description: 产品名称
 *               sku:
 *                 type: string
 *                 description: 库存单位
 *               category:
 *                 type: string
 *                 description: 产品类别
 *               quantity:
 *                 type: number
 *                 description: 库存数量
 *               unit:
 *                 type: string
 *                 description: 单位（如：盒、瓶等）
 *               unitPrice:
 *                 type: number
 *                 description: 单价
 *               reorderLevel:
 *                 type: number
 *                 description: 补货阈值
 *               location:
 *                 type: string
 *                 description: 存放位置
 *               supplier:
 *                 type: string
 *                 description: 供应商
 *               notes:
 *                 type: string
 *                 description: 备注
 *     responses:
 *       200:
 *         description: 库存记录更新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Inventory'
 *       400:
 *         description: 请求数据无效
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 库存记录不存在
 *       500:
 *         description: 服务器错误
 *   delete:
 *     summary: 删除库存记录
 *     description: 删除指定的库存记录
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 库存记录ID
 *     responses:
 *       200:
 *         description: 库存记录删除成功
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
 *                   example: 库存记录已成功删除
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 库存记录不存在
 *       500:
 *         description: 服务器错误
 */
router
  .route('/:id')
  .get(authMiddleware, authorizeRoles('admin'), inventoryController.getInventoryById)
  .put(authMiddleware, authorizeRoles('admin'), validateInventory, inventoryController.updateInventory)
  .delete(authMiddleware, authorizeRoles('admin'), inventoryController.deleteInventory);

/**
 * @swagger
 * /api/inventory/{id}/adjust:
 *   post:
 *     summary: 调整库存数量
 *     description: 增加或减少指定库存的数量
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 库存记录ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/InventoryAdjustment'
 *     responses:
 *       200:
 *         description: 库存数量调整成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Inventory'
 *                 adjustment:
 *                   type: object
 *                   properties:
 *                     quantity:
 *                       type: number
 *                     reason:
 *                       type: string
 *                     date:
 *                       type: string
 *                       format: date-time
 *       400:
 *         description: 请求数据无效或库存不足
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 库存记录不存在
 *       500:
 *         description: 服务器错误
 */
router.post('/:id/adjust', authMiddleware, authorizeRoles('admin'), validateInventoryAdjustment, inventoryController.adjustInventory);

/**
 * @swagger
 * /api/inventory/{id}/history:
 *   get:
 *     summary: 获取库存历史记录
 *     description: 获取指定库存的历史调整记录
 *     tags: [Inventory]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 库存记录ID
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
 *     responses:
 *       200:
 *         description: 成功获取库存历史记录
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
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       quantity:
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
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 库存记录不存在
 *       500:
 *         description: 服务器错误
 */
router.get('/:id/history', authMiddleware, authorizeRoles('admin'), inventoryController.getInventoryHistory);

module.exports = router;