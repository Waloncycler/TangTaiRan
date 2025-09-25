const express = require('express');
const router = express.Router();
const {
  getAllAgents,
  getAgentById,
  createAgent,
  updateAgent,
  deleteAgent,
  getAgentHierarchy
} = require('../controllers/agent.controller');
const { authMiddleware, authorizeRoles, agentDataAccess } = require('../middleware/auth.middleware');

/**
 * @swagger
 * components:
 *   schemas:
 *     Agent:
 *       type: object
 *       required:
 *         - name
 *         - phone
 *         - level
 *       properties:
 *         _id:
 *           type: string
 *           description: 代理ID
 *         name:
 *           type: string
 *           description: 代理姓名
 *         phone:
 *           type: string
 *           description: 联系电话
 *         email:
 *           type: string
 *           description: 电子邮箱
 *         address:
 *           type: string
 *           description: 地址
 *         level:
 *           type: number
 *           description: 代理级别 (1:总代理, 2:区域代理, 3:城市代理)
 *           enum: [1, 2, 3]
 *         parentAgent:
 *           type: string
 *           description: 上级代理ID
 *         joinDate:
 *           type: string
 *           format: date
 *           description: 加入日期
 *         status:
 *           type: string
 *           description: 代理状态
 *           enum: [active, inactive, suspended]
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
 *         name: 张三
 *         phone: '13800138000'
 *         email: zhangsan@example.com
 *         address: 北京市朝阳区
 *         level: 1
 *         status: active
 *         joinDate: '2023-01-01'
 *         notes: 优质代理
 *         createdAt: '2023-01-01T00:00:00.000Z'
 *         updatedAt: '2023-01-01T00:00:00.000Z'
 *     AgentHierarchy:
 *       type: object
 *       description: 代理层级结构，包含代理基本信息和子代理列表
 *       properties:
 *         _id:
 *           type: string
 *           description: 代理MongoDB ID
 *         id:
 *           type: string
 *           description: 代理业务ID
 *         name:
 *           type: string
 *           description: 代理姓名
 *         level:
 *           type: number
 *           description: 代理级别 (1:总代理, 2:区域代理, 3:城市代理)
 *           enum: [1, 2, 3]
 *         status:
 *           type: string
 *           description: 代理状态
 *           enum: [active, inactive, suspended]
 *         parentId:
 *           type: string
 *           nullable: true
 *           description: 上级代理ID，顶级代理为null
 *         phone:
 *           type: string
 *           description: 联系电话
 *         email:
 *           type: string
 *           description: 电子邮箱
 *         region:
 *           type: string
 *           description: 所属区域
 *         city:
 *           type: string
 *           description: 所属城市
 *         joinDate:
 *           type: string
 *           format: date
 *           description: 加入日期
 *         children:
 *           type: array
 *           description: 下级代理列表
 *           items:
 *             $ref: '#/components/schemas/AgentHierarchy'
 *       example:
 *         _id: "68d1a85b7541fe01793daf0e"
 *         id: "AG17585705874149693"
 *         name: "张三"
 *         level: 1
 *         status: "active"
 *         parentId: null
 *         phone: "13800138000"
 *         email: "zhangsan@example.com"
 *         region: "华北区"
 *         city: "北京市"
 *         joinDate: "2023-01-01"
 *         children:
 *           - _id: "68d1bb3644fe9a7414b337f2"
 *             id: "AG17585754140709252"
 *             name: "李四"
 *             level: 2
 *             status: "active"
 *             parentId: "AG17585705874149693"
 *             phone: "13800138001"
 *             email: "lisi@example.com"
 *             region: "华北区"
 *             city: "天津市"
 *             joinDate: "2023-02-01"
 *             children: []
 */

// 所有代理路由都需要认证
router.use(authMiddleware);

/**
 * @swagger
 * /api/agents/hierarchy:
 *   get:
 *     summary: 获取代理层级结构
 *     description: |
 *       获取代理的层级结构树。根据用户角色返回不同的数据：
 *       - **管理员**: 返回所有顶级代理及其完整的子代理层级结构
 *       - **代理用户**: 返回该代理自身及其所有下级代理的层级结构
 *       
 *       支持的角色: admin, generalAgent, cityAgent, teamLeader, salesPerson
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: 成功获取代理层级结构
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
 *                     $ref: '#/components/schemas/AgentHierarchy'
 *             examples:
 *               admin_response:
 *                 summary: 管理员权限响应示例
 *                 value:
 *                   success: true
 *                   data:
 *                     - _id: "68d1a85b7541fe01793daf0e"
 *                       id: "AG17585705874149693"
 *                       name: "总代理A"
 *                       level: 1
 *                       status: "active"
 *                       parentId: null
 *                       children:
 *                         - _id: "68d1bb3644fe9a7414b337f2"
 *                           id: "AG17585754140709252"
 *                           name: "区域代理A1"
 *                           level: 2
 *                           status: "active"
 *                           parentId: "AG17585705874149693"
 *                           children: []
 *                     - _id: "68cd56f0b60b0e707986e3dd"
 *                       id: "AG1758287600692726"
 *                       name: "总代理B"
 *                       level: 1
 *                       status: "active"
 *                       parentId: null
 *                       children: []
 *               agent_response:
 *                 summary: 代理权限响应示例
 *                 value:
 *                   success: true
 *                   data:
 *                     - _id: "68d1a85b7541fe01793daf0e"
 *                       id: "AG17585705874149693"
 *                       name: "当前代理"
 *                       level: 1
 *                       status: "active"
 *                       parentId: null
 *                       children:
 *                         - _id: "68d1bb3644fe9a7414b337f2"
 *                           id: "AG17585754140709252"
 *                           name: "下级代理1"
 *                           level: 2
 *                           status: "active"
 *                           parentId: "AG17585705874149693"
 *                           children: []
 *       401:
 *         description: 未授权 - 缺少有效的JWT令牌
 *       403:
 *         description: 权限不足 - 用户角色不被允许访问此接口
 *       500:
 *         description: 服务器错误 - 数据库查询失败或其他内部错误
 */
router.get('/hierarchy', authorizeRoles('admin', 'generalAgent', 'cityAgent', 'teamLeader', 'salesPerson'), getAgentHierarchy);

/**
 * @swagger
 * /api/agents:
 *   get:
 *     summary: 获取所有代理
 *     description: 获取所有代理信息，支持分页和过滤，仅管理员可访问
 *     tags: [Agents]
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
 *         name: level
 *         schema:
 *           type: string
 *           enum: [platinum, gold, silver, bronze]
 *         description: 按代理级别过滤
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [active, inactive, suspended]
 *         description: 按代理状态过滤
 *     responses:
 *       200:
 *         description: 成功获取代理列表
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
 *                   example: 10
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Agent'
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       500:
 *         description: 服务器错误
 */
router.get('/', authorizeRoles('admin', 'generalAgent', 'cityAgent'), getAllAgents);

/**
 * @swagger
 * /api/agents:
 *   post:
 *     summary: 创建新代理
 *     description: 创建新的代理，仅管理员可操作
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - phone
 *               - level
 *             properties:
 *               name:
 *                 type: string
 *                 description: 代理姓名
 *               phone:
 *                 type: string
 *                 description: 联系电话
 *               email:
 *                 type: string
 *                 description: 电子邮箱
 *               address:
 *                 type: string
 *                 description: 地址
 *               level:
 *                 type: number
 *                 description: 代理级别 (1:总代理, 2:区域代理, 3:城市代理)
 *                 enum: [1, 2, 3]
 *               parentAgent:
 *                 type: string
 *                 description: 上级代理ID
 *               joinDate:
 *                 type: string
 *                 format: date
 *                 description: 加入日期
 *               status:
 *                 type: string
 *                 description: 代理状态
 *                 enum: [active, inactive, suspended]
 *               notes:
 *                 type: string
 *                 description: 备注
 *     responses:
 *       201:
 *         description: 代理创建成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Agent'
 *       400:
 *         description: 请求数据无效
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       500:
 *         description: 服务器错误
 */
router.post('/', authorizeRoles('admin'), createAgent);

/**
 * @swagger
 * /api/agents/{id}:
 *   get:
 *     summary: 获取单个代理信息
 *     description: 根据ID获取单个代理的详细信息，管理员或代理本人可访问
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 代理ID
 *     responses:
 *       200:
 *         description: 成功获取代理信息
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Agent'
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 代理不存在
 *       500:
 *         description: 服务器错误
 */
router.get('/:id', agentDataAccess, getAgentById);

/**
 * @swagger
 * /api/agents/{id}:
 *   put:
 *     summary: 更新代理信息
 *     description: 更新指定代理的信息，仅管理员可操作
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 代理ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: 代理姓名
 *               phone:
 *                 type: string
 *                 description: 联系电话
 *               email:
 *                 type: string
 *                 description: 电子邮箱
 *               address:
 *                 type: string
 *                 description: 地址
 *               level:
 *                 type: number
 *                 description: 代理级别 (1:总代理, 2:区域代理, 3:城市代理)
 *                 enum: [1, 2, 3]
 *               parentAgent:
 *                 type: string
 *                 description: 上级代理ID
 *               status:
 *                 type: string
 *                 description: 代理状态
 *                 enum: [active, inactive, suspended]
 *               notes:
 *                 type: string
 *                 description: 备注
 *     responses:
 *       200:
 *         description: 代理更新成功
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 data:
 *                   $ref: '#/components/schemas/Agent'
 *       400:
 *         description: 请求数据无效
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 代理不存在
 *       500:
 *         description: 服务器错误
 */
router.put('/:id', authorizeRoles('admin'), updateAgent);

/**
 * @swagger
 * /api/agents/{id}:
 *   delete:
 *     summary: 删除代理
 *     description: 删除指定的代理，仅管理员可操作
 *     tags: [Agents]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: 代理ID
 *     responses:
 *       200:
 *         description: 代理删除成功
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
 *                   example: 代理已成功删除
 *       401:
 *         description: 未授权
 *       403:
 *         description: 权限不足
 *       404:
 *         description: 代理不存在
 *       500:
 *         description: 服务器错误
 */
router.delete('/:id', authorizeRoles('admin'), deleteAgent);



module.exports = router;