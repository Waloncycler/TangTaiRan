<template>
  <div class="logistics">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">物流管理</h1>
      <p class="page-subtitle">管理物流订单和配送状态</p>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :xs="24" :sm="8">
        <div class="stat-card pending">
          <div class="stat-icon">
            <el-icon size="24"><Clock /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ logisticsStats.pending }}</div>
            <div class="stat-label">待发货</div>
          </div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="8">
        <div class="stat-card transit">
          <div class="stat-icon">
            <el-icon size="24"><Van /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ logisticsStats.transit }}</div>
            <div class="stat-label">运输中</div>
          </div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="8">
        <div class="stat-card delivered">
          <div class="stat-icon">
            <el-icon size="24"><CircleCheckFilled /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ logisticsStats.delivered }}</div>
            <div class="stat-label">已送达</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 操作栏 -->
    <div class="action-bar">
      <div class="action-left">
        <el-button type="primary" :icon="Plus" @click="showAddDialog = true">
          添加物流
        </el-button>
        <el-button :icon="Download" @click="exportData">
          导出数据
        </el-button>
      </div>
      <div class="action-right">
        <el-input
          v-model="searchText"
          placeholder="搜索订单号或商品..."
          :prefix-icon="Search"
          style="width: 300px"
          clearable
        />
        <el-select v-model="statusFilter" placeholder="状态筛选" style="width: 120px" clearable>
          <el-option label="待发货" value="pending" />
          <el-option label="运输中" value="transit" />
          <el-option label="已送达" value="delivered" />
        </el-select>
      </div>
    </div>

    <!-- 物流列表 -->
    <el-row :gutter="20">
      <!-- 待发货 -->
      <el-col :xs="24" :lg="8">
        <el-card class="logistics-column" shadow="hover">
          <template #header>
            <div class="column-header pending">
              <el-icon><Clock /></el-icon>
              <span>待发货 ({{ pendingItems.length }})</span>
            </div>
          </template>
          
          <div class="logistics-items">
            <div v-if="pendingItems.length === 0" class="empty-state">
              <el-empty description="暂无待发货订单" :image-size="80" />
            </div>
            
            <div 
              v-for="item in pendingItems" 
              :key="item.id" 
              class="logistics-item"
            >
              <div class="item-header">
                <div class="company-info">
                  <strong>{{ getCompanyName(item.company) }}</strong>
                  <span class="order-number">{{ item.orderNumber }}</span>
                </div>
                <el-dropdown @command="(command) => handleCommand(command, item)">
                  <el-button type="primary" link>
                    <el-icon><MoreFilled /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="ship">发货</el-dropdown-item>
                      <el-dropdown-item command="edit">编辑</el-dropdown-item>
                      <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
              
              <div class="item-content">
                <div class="product-info">
                  <div class="product-name">{{ item.product }}</div>
                  <div class="product-quantity">数量: {{ item.quantity }}</div>
                </div>
                
                <div class="recipient-info">
                  <div class="recipient-name">{{ item.recipient }}</div>
                  <div class="recipient-contact">{{ item.contact }}</div>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <!-- 运输中 -->
      <el-col :xs="24" :lg="8">
        <el-card class="logistics-column" shadow="hover">
          <template #header>
            <div class="column-header transit">
              <el-icon><Van /></el-icon>
              <span>运输中 ({{ transitItems.length }})</span>
            </div>
          </template>
          
          <div class="logistics-items">
            <div v-if="transitItems.length === 0" class="empty-state">
              <el-empty description="暂无运输中订单" :image-size="80" />
            </div>
            
            <div 
              v-for="item in transitItems" 
              :key="item.id" 
              class="logistics-item"
            >
              <div class="item-header">
                <div class="company-info">
                  <strong>{{ getCompanyName(item.company) }}</strong>
                  <span class="order-number">{{ item.orderNumber }}</span>
                </div>
                <el-dropdown @command="(command) => handleCommand(command, item)">
                  <el-button type="primary" link>
                    <el-icon><MoreFilled /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="deliver">确认送达</el-dropdown-item>
                      <el-dropdown-item command="edit">编辑</el-dropdown-item>
                      <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
              
              <div class="item-content">
                <div class="product-info">
                  <div class="product-name">{{ item.product }}</div>
                  <div class="product-quantity">数量: {{ item.quantity }}</div>
                </div>
                
                <div class="recipient-info">
                  <div class="recipient-name">{{ item.recipient }}</div>
                  <div class="recipient-contact">{{ item.contact }}</div>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
      
      <!-- 已送达 -->
      <el-col :xs="24" :lg="8">
        <el-card class="logistics-column" shadow="hover">
          <template #header>
            <div class="column-header delivered">
              <el-icon><CircleCheckFilled /></el-icon>
              <span>已送达 ({{ deliveredItems.length }})</span>
            </div>
          </template>
          
          <div class="logistics-items">
            <div v-if="deliveredItems.length === 0" class="empty-state">
              <el-empty description="暂无已送达订单" :image-size="80" />
            </div>
            
            <div 
              v-for="item in deliveredItems" 
              :key="item.id" 
              class="logistics-item"
            >
              <div class="item-header">
                <div class="company-info">
                  <strong>{{ getCompanyName(item.company) }}</strong>
                  <span class="order-number">{{ item.orderNumber }}</span>
                </div>
                <el-dropdown @command="(command) => handleCommand(command, item)">
                  <el-button type="primary" link>
                    <el-icon><MoreFilled /></el-icon>
                  </el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item command="view">查看详情</el-dropdown-item>
                      <el-dropdown-item command="delete" divided>删除</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </div>
              
              <div class="item-content">
                <div class="product-info">
                  <div class="product-name">{{ item.product }}</div>
                  <div class="product-quantity">数量: {{ item.quantity }}</div>
                </div>
                
                <div class="recipient-info">
                  <div class="recipient-name">{{ item.recipient }}</div>
                  <div class="recipient-contact">{{ item.contact }}</div>
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 添加/编辑物流对话框 -->
    <el-dialog
      v-model="showAddDialog"
      :title="editingItem ? '编辑物流' : '添加物流'"
      width="500px"
      :before-close="handleDialogClose"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="80px"
      >
        <el-form-item label="物流公司" prop="company">
          <el-select v-model="form.company" placeholder="请选择物流公司" style="width: 100%">
            <el-option label="顺丰速运" value="sf" />
            <el-option label="中国邮政EMS" value="ems" />
            <el-option label="圆通速递" value="yt" />
            <el-option label="申通快递" value="sto" />
            <el-option label="中通快递" value="zto" />
            <el-option label="韵达速递" value="yunda" />
            <el-option label="京东物流" value="jd" />
            <el-option label="其他" value="other" />
          </el-select>
        </el-form-item>
        
        <el-form-item label="订单号" prop="orderNumber">
          <el-input v-model="form.orderNumber" placeholder="请输入订单号" />
        </el-form-item>
        
        <el-form-item label="商品名称" prop="product">
          <el-input v-model="form.product" placeholder="请输入商品名称" />
        </el-form-item>
        
        <el-form-item label="数量" prop="quantity">
          <el-input
            v-model.number="form.quantity"
            type="number"
            placeholder="请输入数量"
            :min="1"
          />
        </el-form-item>
        
        <el-form-item label="收件人" prop="recipient">
          <el-input v-model="form.recipient" placeholder="请输入收件人姓名" />
        </el-form-item>
        
        <el-form-item label="联系方式" prop="contact">
          <el-input v-model="form.contact" placeholder="请输入联系方式" />
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
import { ref, computed, reactive } from 'vue'
import { useDataStore } from '@/stores/data'
import { 
  Plus, 
  Download, 
  Search, 
  Clock, 
  Van, 
  CircleCheckFilled,
  MoreFilled
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const dataStore = useDataStore()
const formRef = ref()
const loading = ref(false)
const showAddDialog = ref(false)
const editingItem = ref(null)
const searchText = ref('')
const statusFilter = ref('')

// 表单数据
const form = reactive({
  company: '',
  orderNumber: '',
  product: '',
  quantity: null,
  recipient: '',
  contact: ''
})

// 表单验证规则
const rules = {
  company: [
    { required: true, message: '请选择物流公司', trigger: 'change' }
  ],
  orderNumber: [
    { required: true, message: '请输入订单号', trigger: 'blur' }
  ],
  product: [
    { required: true, message: '请输入商品名称', trigger: 'blur' }
  ],
  quantity: [
    { required: true, message: '请输入数量', trigger: 'blur' },
    { type: 'number', min: 1, message: '数量必须大于0', trigger: 'blur' }
  ],
  recipient: [
    { required: true, message: '请输入收件人姓名', trigger: 'blur' }
  ],
  contact: [
    { required: true, message: '请输入联系方式', trigger: 'blur' }
  ]
}

// 过滤后的物流数据
const filteredLogistics = computed(() => {
  let result = dataStore.logistics
  
  // 搜索过滤
  if (searchText.value) {
    const search = searchText.value.toLowerCase()
    result = result.filter(item => 
      item.orderNumber.toLowerCase().includes(search) ||
      item.product.toLowerCase().includes(search) ||
      item.recipient.toLowerCase().includes(search)
    )
  }
  
  // 状态过滤
  if (statusFilter.value) {
    result = result.filter(item => item.status === statusFilter.value)
  }
  
  return result
})

// 按状态分组的物流数据
const pendingItems = computed(() => 
  filteredLogistics.value.filter(item => item.status === 'pending')
)

const transitItems = computed(() => 
  filteredLogistics.value.filter(item => item.status === 'transit')
)

const deliveredItems = computed(() => 
  filteredLogistics.value.filter(item => item.status === 'delivered')
)

// 物流统计
const logisticsStats = computed(() => {
  const all = dataStore.logistics
  return {
    pending: all.filter(item => item.status === 'pending').length,
    transit: all.filter(item => item.status === 'transit').length,
    delivered: all.filter(item => item.status === 'delivered').length
  }
})

// 获取物流公司名称
const getCompanyName = (company) => {
  const companyNames = {
    'sf': '顺丰速运',
    'ems': '中国邮政EMS',
    'yt': '圆通速递',
    'sto': '申通快递',
    'zto': '中通快递',
    'yunda': '韵达速递',
    'jd': '京东物流',
    'other': '其他'
  }
  return companyNames[company] || company
}

// 重置表单
const resetForm = () => {
  form.company = ''
  form.orderNumber = ''
  form.product = ''
  form.quantity = null
  form.recipient = ''
  form.contact = ''
  
  if (formRef.value) {
    formRef.value.clearValidate()
  }
}

// 处理命令
const handleCommand = async (command, item) => {
  switch (command) {
    case 'ship':
      await updateStatus(item, 'transit')
      break
    case 'deliver':
      await updateStatus(item, 'delivered')
      break
    case 'edit':
      editLogistics(item)
      break
    case 'view':
      viewLogistics(item)
      break
    case 'delete':
      await deleteLogistics(item)
      break
  }
}

// 更新状态
const updateStatus = async (item, newStatus) => {
  const statusText = {
    'transit': '发货',
    'delivered': '确认送达'
  }
  
  try {
    await ElMessageBox.confirm(
      `确定要${statusText[newStatus]}吗？`,
      '确认操作',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'info'
      }
    )
    
    dataStore.updateLogisticsStatus(item.id)
    ElMessage.success(`${statusText[newStatus]}成功`)
  } catch {
    // 用户取消操作
  }
}

// 编辑物流
const editLogistics = (item) => {
  editingItem.value = item
  form.company = item.company
  form.orderNumber = item.orderNumber
  form.product = item.product
  form.quantity = item.quantity
  form.recipient = item.recipient
  form.contact = item.contact
  showAddDialog.value = true
}

// 查看物流详情
const viewLogistics = (item) => {
  ElMessage.info('查看详情功能开发中...')
}

// 删除物流
const deleteLogistics = async (item) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除订单「${item.orderNumber}」吗？此操作不可撤销。`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    dataStore.deleteLogistics(item.id)
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
      // 编辑模式 - 这里需要在dataStore中添加updateLogistics方法
      ElMessage.info('编辑功能开发中...')
    } else {
      // 添加模式
      const item = {
        company: form.company,
        orderNumber: form.orderNumber,
        product: form.product,
        quantity: form.quantity,
        recipient: form.recipient,
        contact: form.contact
      }
      dataStore.addLogistics(item)
      ElMessage.success('物流添加成功')
    }
    
    handleDialogClose()
  } catch (error) {
    console.error('保存物流失败:', error)
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
</script>

<style lang="scss" scoped>
.logistics {
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
      
      &.pending .stat-icon {
        background: linear-gradient(135deg, #E6A23C, #EBB563);
      }
      
      &.transit .stat-icon {
        background: linear-gradient(135deg, #409EFF, #66B1FF);
      }
      
      &.delivered .stat-icon {
        background: linear-gradient(135deg, #67C23A, #85CE61);
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
    margin-bottom: 24px;
    
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
  
  .logistics-column {
    margin-bottom: 16px;
    height: 600px;
    
    .column-header {
      display: flex;
      align-items: center;
      gap: 8px;
      font-weight: 600;
      
      &.pending {
        color: #E6A23C;
      }
      
      &.transit {
        color: #409EFF;
      }
      
      &.delivered {
        color: #67C23A;
      }
    }
    
    .logistics-items {
      height: 520px;
      overflow-y: auto;
      
      .empty-state {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 100%;
      }
      
      .logistics-item {
        border: 1px solid var(--el-border-color-lighter);
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 12px;
        transition: all 0.3s ease;
        
        &:hover {
          border-color: var(--el-color-primary-light-7);
          box-shadow: 0 2px 8px rgba(64, 158, 255, 0.1);
        }
        
        .item-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 12px;
          
          .company-info {
            flex: 1;
            
            strong {
              display: block;
              font-size: 14px;
              color: var(--el-text-color-primary);
              margin-bottom: 4px;
            }
            
            .order-number {
              font-size: 12px;
              color: var(--el-text-color-secondary);
              background: var(--el-fill-color-light);
              padding: 2px 6px;
              border-radius: 4px;
            }
          }
        }
        
        .item-content {
          .product-info {
            margin-bottom: 12px;
            
            .product-name {
              font-size: 14px;
              font-weight: 500;
              color: var(--el-text-color-primary);
              margin-bottom: 4px;
            }
            
            .product-quantity {
              font-size: 12px;
              color: var(--el-text-color-secondary);
            }
          }
          
          .recipient-info {
            .recipient-name {
              font-size: 13px;
              color: var(--el-text-color-primary);
              margin-bottom: 2px;
            }
            
            .recipient-contact {
              font-size: 12px;
              color: var(--el-text-color-secondary);
            }
          }
        }
      }
    }
  }
  
  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }
}

// 响应式设计
@media (max-width: 1024px) {
  .logistics {
    .logistics-column {
      height: auto;
      
      .logistics-items {
        height: auto;
        max-height: 400px;
      }
    }
  }
}

@media (max-width: 768px) {
  .logistics {
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
    
    .logistics-column {
      .logistics-items {
        .logistics-item {
          padding: 12px;
          
          .item-header {
            .company-info {
              strong {
                font-size: 13px;
              }
            }
          }
        }
      }
    }
  }
}
</style>