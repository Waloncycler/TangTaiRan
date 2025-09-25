const express = require('express');
const router = express.Router();
const { authMiddleware, authorizeRoles } = require('../middleware/auth.middleware');

const exportController = require('../controllers/export.controller');

// 导出路由
router.get('/export/agents', authMiddleware, authorizeRoles('admin'), exportController.exportAgents);
router.get('/export/sales', authMiddleware, authorizeRoles('admin'), exportController.exportSales);
router.get('/export/transactions', authMiddleware, authorizeRoles('admin'), exportController.exportTransactions);
router.get('/export/inventory', authMiddleware, authorizeRoles('admin'), exportController.exportInventory);
router.get('/export/logistics', authMiddleware, authorizeRoles('admin'), exportController.exportLogistics);

// 导入模板路由
router.get('/export/templates/:type', authMiddleware, authorizeRoles('admin'), exportController.getImportTemplate);



module.exports = router;