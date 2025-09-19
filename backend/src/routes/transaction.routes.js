const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transaction.controller');
const { authMiddleware, authorizeRoles } = require('../middleware/auth.middleware');
const { validateTransaction } = require('../middleware/validation.middleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     Transaction:
 *       type: object
 *       required:
 *         - type
 *         - amount
 *         - description
 *       properties:
 *         _id:
 *           type: string
 *           description: 交易记录ID
 *         type:
 *           type: string
 *           enum: [income, expense]
 *           description: 交易类型（收入或支出）
 *         amount:
 *           type: number
 *           description: 交易金额
 *         description:
 *           type: string
 *           description: 交易描述
 *         category:
 *           type: string
 *           description: 交易类别
 *         date:
 *           type: string
 *           format: date
 *           description: 交易日期
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: 创建时间
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: 更新时间
 */

/**
 * @swagger
 * /api/transactions/stats:
 *   get:
 *     summary: 获取交易统计数据
 *     description: 获取系统中所有交易的统计数据，包括收入和支出总额、交易数量等
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功获取交易统计数据
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
 *                     totalIncome:
 *                       type: number
 *                     totalExpense:
 *                       type: number
 *                     transactionCount:
 *                       type: number
 *       401:
 *         description: 未授权
 *       403:
 *         description: 禁止访问
 *       500:
 *         description: 服务器错误
 */
router.get('/stats', authMiddleware, authorizeRoles('admin'), transactionController.getTransactionStats);

/**
 * @swagger
 * /api/transactions/overview:
 *   get:
 *     summary: 获取财务概览数据
 *     description: 获取系统中的财务概览数据，包括收入支出趋势、类别分布等
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功获取财务概览数据
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *       401:
 *         description: 未授权
 *       403:
 *         description: 禁止访问
 *       500:
 *         description: 服务器错误
 */
router.get('/overview', authMiddleware, authorizeRoles('admin'), transactionController.getFinancialOverview);

/**
 * @swagger
 * /api/transactions/import:
 *   post:
 *     summary: 批量导入交易记录
 *     description: 通过CSV或Excel文件批量导入交易记录
 *     tags: [Transactions]
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
 *                 description: 包含交易记录的CSV或Excel文件
 *     responses:
 *       200:
 *         description: 成功导入交易记录
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                   description: 导入的记录数量
 *       400:
 *         description: 无效的请求
 *       401:
 *         description: 未授权
 *       403:
 *         description: 禁止访问
 *       500:
 *         description: 服务器错误
 */
router.post('/import', authMiddleware, authorizeRoles('admin'), transactionController.importTransactions);

/**
 * @swagger
 * /api/transactions/export:
 *   get:
 *     summary: 导出交易记录
 *     description: 将系统中的交易记录导出为CSV或Excel文件
 *     tags: [Transactions]
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
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 开始日期筛选
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 结束日期筛选
 *     responses:
 *       200:
 *         description: 成功导出交易记录
 *         content:
 *           application/csv:
 *             schema:
 *               type: string
 *               format: binary
 *           application/vnd.openxmlformats-officedocument.spreadsheetml.sheet:
 *             schema:
 *               type: string
 *               format: binary
 *       401:
 *         description: 未授权
 *       403:
 *         description: 禁止访问
 *       500:
 *         description: 服务器错误
 */
router.get('/export', authMiddleware, authorizeRoles('admin'), transactionController.exportTransactions);

/**
 * @swagger
 * /api/transactions:
 *   get:
 *     summary: 获取所有交易记录
 *     description: 获取系统中的所有交易记录，支持分页、排序和筛选
 *     tags: [Transactions]
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
 *         description: 每页记录数
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [income, expense]
 *         description: 交易类型筛选
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 开始日期筛选
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date
 *         description: 结束日期筛选
 *     responses:
 *       200:
 *         description: 成功获取交易记录列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 pagination:
 *                   type: object
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Transaction'
 *       401:
 *         description: 未授权
 *       403:
 *         description: 禁止访问
 *       500:
 *         description: 服务器错误
 *   post:
 *     summary: 创建交易记录
 *     description: 创建新的交易记录
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - type
 *               - amount
 *               - description
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [income, expense]
 *                 description: 交易类型（收入或支出）
 *               amount:
 *                 type: number
 *                 description: 交易金额
 *               description:
 *                 type: string
 *                 description: 交易描述
 *               category:
 *                 type: string
 *                 description: 交易类别
 *               date:
 *                 type: string
 *                 format: date
 *                 description: 交易日期
 *               paymentMethod:
 *                 type: string
 *                 description: 支付方式
 *               relatedTo:
 *                 type: string
 *                 description: 关联对象
 *     responses:
 *       201:
 *         description: 成功创建交易记录
 *       400:
 *         description: 无效的请求
 *       401:
 *         description: 未授权
 *       403:
 *         description: 禁止访问
 *       500:
 *         description: 服务器错误
 */

// 定义主路由
router
  .route('/')
  .get(authMiddleware, authorizeRoles('admin'), transactionController.getAllTransactions)
  .post(authMiddleware, authorizeRoles('admin'), validateTransaction, transactionController.createTransaction);

/**
 * @swagger
 * /api/transactions/{id}:
 *   get:
 *     summary: 获取单个交易记录
 *     description: 通过ID获取特定的交易记录详情
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 交易记录ID
 *     responses:
 *       200:
 *         description: 成功获取交易记录列表
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 count:
 *                   type: integer
 *                 pagination:
 *                   type: object
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Transaction'
 *       401:
 *         description: 未授权
 *       403:
 *         description: 禁止访问
 *       500:
 *         description: 服务器错误
 */
// 路由已在上方定义，此处删除重复定义

/**
 * @swagger
 * /api/transactions/{id}:
 *   get:
 *     summary: 获取单个交易记录
 *     description: 通过ID获取特定的交易记录详情
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 交易记录ID
 *     responses:
 *       200:
 *         description: 成功获取交易记录
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Transaction'
 *       401:
 *         description: 未授权
 *       403:
 *         description: 禁止访问
 *       404:
 *         description: 交易记录不存在
 *       500:
 *         description: 服务器错误
 *   put:
 *     summary: 更新交易记录
 *     description: 更新特定ID的交易记录信息
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 交易记录ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               type:
 *                 type: string
 *                 enum: [income, expense]
 *                 description: 交易类型（收入或支出）
 *               amount:
 *                 type: number
 *                 description: 交易金额
 *               description:
 *                 type: string
 *                 description: 交易描述
 *               category:
 *                 type: string
 *                 description: 交易类别
 *               date:
 *                 type: string
 *                 format: date
 *                 description: 交易日期
 *     responses:
 *       200:
 *         description: 成功更新交易记录
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/Transaction'
 *       400:
 *         description: 无效的请求
 *       401:
 *         description: 未授权
 *       403:
 *         description: 禁止访问
 *       404:
 *         description: 交易记录不存在
 *       500:
 *         description: 服务器错误
 *   delete:
 *     summary: 删除交易记录
 *     description: 删除特定ID的交易记录
 *     tags: [Transactions]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 交易记录ID
 *     responses:
 *       200:
 *         description: 成功删除交易记录
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *       401:
 *         description: 未授权
 *       403:
 *         description: 禁止访问
 *       404:
 *         description: 交易记录不存在
 *       500:
 *         description: 服务器错误
 */
router
  .route('/:id')
  .get(authMiddleware, authorizeRoles('admin'), transactionController.getTransactionById)
  .put(authMiddleware, authorizeRoles('admin'), validateTransaction, transactionController.updateTransaction)
  .delete(authMiddleware, authorizeRoles('admin'), transactionController.deleteTransaction);

module.exports = router;