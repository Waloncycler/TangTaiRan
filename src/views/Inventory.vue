<template>
  <div class="inventory">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">库存管理</h1>
      <p class="page-subtitle">管理商品库存和变动记录</p>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :xs="24" :sm="8">
        <div class="stat-card total">
          <div class="stat-icon">
            <el-icon size="24"><Box /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ dataStore.inventoryStats?.total || 0 }}</div>
            <div class="stat-label">总商品</div>
          </div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="8">
        <div class="stat-card warning">
          <div class="stat-icon">
            <el-icon size="24"><WarningFilled /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ dataStore.inventoryStats.lowStock }}</div>
            <div class="stat-label">库存不足</div>
          </div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="8">
        <div class="stat-card danger">
          <div class="stat-icon">
            <el-icon size="24"><CircleCloseFilled /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ dataStore.inventoryStats.outOfStock }}</div>
            <div class="stat-label">缺货</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 操作栏 -->
    <div class="action-bar">
      <div class="action-left">
        <el-button type="primary" :icon="Plus" @click="showAddDialog = true">
          添加商品
        </el-button>
        <el-button :icon="Download" @click="exportData">
          导出数据
        </el-button>
      </div>
      <div class="action-right">
        <el-input
          v-model="searchText"
          placeholder="搜索商品名称..."
          :prefix-icon="Search"
          style="width: 300px"
          clearable
        />
        <el-select v-model="statusFilter" placeholder="状态筛选" style="width: 120px" clearable>
          <el-option label="正常" value="normal" />
          <el-option label="库存不足" value="low" />
          <el-option label="缺货" value="out" />
        </el-select>
      </div>
    </div>

    <!-- 库存列表 -->
    <el-card class="table-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span class="card-title">库存列表</span>
          <span class="record-count">共 {{ filteredInventory.length }} 件商品</span>
        </div>
      </template>
      
      <el-table
        :data="paginatedInventory"
        stripe
        style="width: 100%"
        v-loading="loading"
      >
        <el-table-column prop="name" label="商品名称" width="200" />
        <el-table-column prop="productCode" label="产品编码" width="200">
          <template #default="{row}">
            {{ PRODUCT_CODE_NAMES[row.productCode] || row.productCode }}
          </template>
        </el-table-column>
        <el-table-column prop="quantity" label="数量" width="200" sortable />
        <el-table-column prop="unit" label="单位" width="200" />
        <el-table-column prop="location" label="存储位置" width="200" />
        <el-table-column prop="status" label="状态" width="200">
          <template #default="{ row }">
            <el-tag :type="getStatusType(row.status)" size="small">
              {{ getStatusText(row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="updatedAt" label="更新时间" width="250">
          <template #default="{ row }">
            {{ formatDate(row.updatedAt) }}
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="editInventory(row)">
              编辑
            </el-button>
            <el-button type="danger" link size="small" @click="deleteInventory(row)">
              删除
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      
      <!-- 分页 -->
      <div class="pagination-wrapper">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 50, 100]"
          :total="filteredInventory.length"
          layout="total, sizes, prev, pager, next, jumper"
          background
        />
      </div>
    </el-card>



    <!-- 添加/编辑商品对话框 -->
    <el-dialog
      v-model="showAddDialog"
      :title="editingItem ? '编辑商品' : '添加商品'"
      width="500px"
      :before-close="handleDialogClose"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="80px"
      >
        <el-form-item label="商品名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入商品名称" />
        </el-form-item>
        
        <el-form-item label="产品编码" prop="productCode">
          <el-select v-model="form.productCode" placeholder="请选择产品编码" style="width: 100%">
            <el-option 
              v-for="option in getProductCodeOptions()" 
              :key="option.value" 
              :label="option.label" 
              :value="option.value" 
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="数量" prop="quantity">
          <el-input
            v-model.number="form.quantity"
            type="number"
            placeholder="请输入数量"
            :min="0"
          />
        </el-form-item>
        
        <el-form-item label="单位" prop="unit">
          <el-input v-model="form.unit" placeholder="请输入单位（如：盒、瓶、个）" />
        </el-form-item>
        
        <el-form-item label="存储位置" prop="location">
          <el-input v-model="form.location" placeholder="请输入存储位置" />
        </el-form-item>
      </el-form>
      
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="handleDialogClose">取消</el-button>
          <el-button type="primary" :loading="loading" @click="handleSubmit">
            {{ loading ? '保存中...' : '保存' }}
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { useDataStore } from '@/stores/data'
import { 
  Plus, 
  Download, 
  Search, 
  Box, 
  WarningFilled, 
  CircleCloseFilled 
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import dayjs from 'dayjs'
import { getProductCodeOptions, PRODUCT_CODE_NAMES } from '../constants/productCodes'

const dataStore = useDataStore()
const formRef = ref()
const loading = ref(false)
const showAddDialog = ref(false)
const editingItem = ref(null)
const searchText = ref('')
const statusFilter = ref('')
const currentPage = ref(1)
const pageSize = ref(20)


// 表单数据
const form = reactive({
  name: '',
  productCode: '',
  quantity: null,
  unit: '',
  location: ''
})

// 表单验证规则
const rules = {
  name: [
    { required: true, message: '请输入商品名称', trigger: 'blur' }
  ],
  productCode: [
    { required: true, message: '请输入产品编码', trigger: 'blur' }
  ],
  quantity: [
    { required: true, message: '请输入数量', trigger: 'blur' },
    { type: 'number', min: 0, message: '数量不能为负数', trigger: 'blur' }
  ],
  unit: [
    { required: true, message: '请输入单位', trigger: 'blur' }
  ],
  location: [
    { required: true, message: '请输入存储位置', trigger: 'blur' }
  ]
}

// 过滤后的库存
const filteredInventory = computed(() => {
  let result = dataStore.inventory
  
  // 搜索过滤
  if (searchText.value) {
    const search = searchText.value.toLowerCase()
    result = result.filter(item => 
      item.name.toLowerCase().includes(search)
    )
  }
  
  // 状态过滤
  if (statusFilter.value) {
    result = result.filter(item => item.status === statusFilter.value)
  }
  
  return result
})

// 分页后的库存
const paginatedInventory = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredInventory.value.slice(start, end)
})



// 格式化日期
const formatDate = (dateString) => {
  return dayjs(dateString).format('YYYY-MM-DD HH:mm:ss')
}

// 获取状态类型
const getStatusType = (status) => {
  const typeMap = {
    'normal': 'success',
    'low': 'warning',
    'out': 'danger'
  }
  return typeMap[status] || 'info'
}

// 获取状态文本
const getStatusText = (status) => {
  const textMap = {
    'normal': '正常',
    'low': '库存不足',
    'out': '缺货'
  }
  return textMap[status] || status
}


// 重置表单
const resetForm = () => {
  form.name = ''
  form.productCode = ''
  form.quantity = null
  form.unit = ''
  form.location = ''
  
  if (formRef.value) {
    formRef.value.clearValidate()
  }
}

// 编辑商品
const editInventory = (item) => {
  console.log('编辑的商品项:', item)
  console.log('商品ID:', item.id)
  console.log('商品_id:', item._id)
  editingItem.value = item
  form.name = item.name
  form.productCode = item.productCode || ''
  form.quantity = item.quantity
  form.unit = item.unit
  form.location = item.location
  showAddDialog.value = true
}

// 删除商品
const deleteInventory = async (item) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除商品「${item.name}」吗？此操作不可撤销。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await dataStore.deleteInventory(item.id)
    // 刷新库存数据以确保实时更新
    await dataStore.fetchInventory()
    ElMessage.success('删除成功')
  } catch {
    // 用户取消删除
  }
}

// 处理提交
const handleSubmit = async () => {
  if (!formRef.value) return
  
  try {
    const valid = await formRef.value.validate()
    if (!valid) return
    
    loading.value = true
    
    if (editingItem.value) {
      // 编辑模式
      console.log('提交时的编辑项:', editingItem.value)
      console.log('提交时的ID:', editingItem.value.id)
      console.log('提交时的_id:', editingItem.value._id)
      
      // 使用_id替代id
      const inventoryId = editingItem.value._id || editingItem.value.id
      console.log('使用的ID:', inventoryId)
      
      await dataStore.updateInventory(inventoryId, {
        name: form.name,
        productCode: form.productCode,
        quantity: form.quantity,
        unit: form.unit,
        location: form.location
      })
      ElMessage.success('商品更新成功')
    } else {
      // 添加模式
      const item = {
        name: form.name,
        productCode: form.productCode,
        quantity: form.quantity,
        unit: form.unit,
        location: form.location
      }
      await dataStore.addInventory(item)
      ElMessage.success('商品添加成功')
    }
    
    // 刷新库存数据以确保实时更新
    await dataStore.fetchInventory()
    
    handleDialogClose()
  } catch (error) {
    console.error('保存商品失败:', error)
    ElMessage.error('保存失败，请重试')
  } finally {
    loading.value = false
  }
}

// 处理对话框关闭
const handleDialogClose = () => {
  resetForm()
  editingItem.value = null
  showAddDialog.value = false
}

// 导出数据
const exportData = () => {
  ElMessage.info('导出功能开发中...')
}

// 组件挂载时获取库存数据
onMounted(async () => {
  // 只在数据未初始化时才获取数据，避免重复请求
  if (!dataStore.initialized) {
    await dataStore.fetchInventory()
  }
})
</script>

<style lang="scss" scoped>
.inventory {
  .page-header {
    margin-bottom: 24px;
    
    .page-title {
      font-size: 28px;
      font-weight: 600;
      color: var(--el-text-color-primary);
      margin: 0 0 8px 0;
    }
    
    .page-subtitle {
      font-size: 14px;
      color: var(--el-text-color-regular);
      margin: 0;
    }
  }
  
  .stats-row {
    margin-bottom: 24px;
    
    .stat-card {
      background: white;
      border-radius: 12px;
      padding: 20px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      gap: 16px;
      height: 100px;
      transition: transform 0.3s ease;
      
      &:hover {
        transform: translateY(-2px);
      }
      
      .stat-icon {
        width: 50px;
        height: 50px;
        border-radius: 10px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
      }
      
      &.total .stat-icon {
        background: linear-gradient(135deg, #409EFF, #66B1FF);
      }
      
      &.warning .stat-icon {
        background: linear-gradient(135deg, #E6A23C, #EBB563);
      }
      
      &.danger .stat-icon {
        background: linear-gradient(135deg, #F56C6C, #F78989);
      }
      
      .stat-content {
        flex: 1;
        
        .stat-value {
          font-size: 24px;
          font-weight: 600;
          color: var(--el-text-color-primary);
          margin-bottom: 4px;
        }
        
        .stat-label {
          font-size: 14px;
          color: var(--el-text-color-regular);
        }
      }
    }
  }
  
  .action-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    
    .action-left {
      display: flex;
      gap: 12px;
    }
    
    .action-right {
      display: flex;
      gap: 12px;
    }
    
    @media (max-width: 768px) {
      flex-direction: column;
      gap: 12px;
      align-items: stretch;
      
      .action-right {
        .el-input {
          width: 100% !important;
        }
      }
    }
  }
  
  .table-card {
    margin-bottom: 24px;
    
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      .card-title {
        font-size: 16px;
        font-weight: 600;
      }
      
      .record-count {
        font-size: 14px;
        color: var(--el-text-color-regular);
      }
    }
    
    .pagination-wrapper {
      display: flex;
      justify-content: center;
      margin-top: 20px;
    }
  }
  
  .logs-card {
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      .card-title {
        font-size: 16px;
        font-weight: 600;
      }
      
      .log-filters {
        display: flex;
        gap: 12px;
      }
    }
    
    .change-positive {
      color: var(--el-color-success);
      font-weight: 500;
    }
    
    .change-negative {
      color: var(--el-color-danger);
      font-weight: 500;
    }
    
    .show-more {
      text-align: center;
      margin-top: 16px;
    }
  }
  
  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .inventory {
    .stats-row {
      .stat-card {
        height: auto;
        padding: 16px;
        
        .stat-icon {
          width: 40px;
          height: 40px;
        }
        
        .stat-content {
          .stat-value {
            font-size: 20px;
          }
        }
      }
    }
    
    .logs-card {
      .card-header {
        flex-direction: column;
        gap: 12px;
        align-items: flex-start;
        
        .log-filters {
          width: 100%;
          
          .el-select,
          .el-date-picker {
            flex: 1;
          }
        }
      }
    }
  }
}
</style>