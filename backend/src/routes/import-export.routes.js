const express = require('express');
const router = express.Router();
const { authMiddleware, authorizeRoles } = require('../middleware/auth.middleware');
const importController = require('../controllers/import.controller');
const exportController = require('../controllers/export.controller');

// 导出路由
router.get('/export/agents', authMiddleware, authorizeRoles('admin'), exportController.exportAgents);
router.get('/export/sales', authMiddleware, authorizeRoles('admin'), exportController.exportSales);
router.get('/export/transactions', authMiddleware, authorizeRoles('admin'), exportController.exportTransactions);
router.get('/export/inventory', authMiddleware, authorizeRoles('admin'), exportController.exportInventory);
router.get('/export/logistics', authMiddleware, authorizeRoles('admin'), exportController.exportLogistics);

// 导入模板路由
router.get('/export/templates/:type', authMiddleware, authorizeRoles('admin'), exportController.getImportTemplate);

// 导入路由
router.post('/import/agents', 
  authMiddleware, 
  authorizeRoles('admin'), 
  importController.upload.single('file'), 
  importController.importAgents
);

router.post('/import/sales', 
  authMiddleware, 
  authorizeRoles('admin'), 
  importController.upload.single('file'), 
  importController.importSales
);

router.post('/import/inventory', 
  authMiddleware, 
  authorizeRoles('admin'), 
  importController.upload.single('file'), 
  importController.importInventory
);

router.post('/import/logistics', 
  authMiddleware, 
  authorizeRoles('admin'), 
  importController.upload.single('file'), 
  importController.importLogistics
);

router.post('/import/transactions', 
  authMiddleware, 
  authorizeRoles('admin'), 
  importController.upload.single('file'), 
  importController.importTransactions
);

module.exports = router;