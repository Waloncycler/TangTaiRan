<template>
  <div class="budget">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">预算管理</h1>
      <p class="page-subtitle">设置和跟踪预算使用情况</p>
    </div>

    <!-- 预算概览 -->
    <el-row :gutter="20" class="overview-row">
      <el-col :xs="24" :lg="16">
        <el-card class="overview-card" shadow="hover">
          <template #header>
            <span class="card-title">预算概览</span>
          </template>
          <div class="overview-content">
            <div class="overview-stats">
              <div class="stat-item">
                <div class="stat-value">{{ formatCurrency(dataStore.budgetOverview.totalBudget) }}</div>
                <div class="stat-label">总预算</div>
              </div>
              <div class="stat-item">
                <div class="stat-value expense">{{ formatCurrency(dataStore.budgetOverview.totalSpent) }}</div>
                <div class="stat-label">已使用</div>
              </div>
              <div class="stat-item">
                <div class="stat-value" :class="dataStore.budgetOverview.remaining >= 0 ? 'positive' : 'negative'">
                  {{ formatCurrency(dataStore.budgetOverview.remaining) }}
                </div>
                <div class="stat-label">剩余</div>
              </div>
            </div>
            <div class="progress-section">
              <div class="progress-info">
                <span>使用进度</span>
                <span class="percentage">{{ dataStore.budgetOverview.percentage.toFixed(1) }}%</span>
              </div>
              <el-progress 
                :percentage="dataStore.budgetOverview.percentage" 
                :color="getProgressColor(dataStore.budgetOverview.percentage)"
                :stroke-width="12"
                striped
                striped-flow
              />
            </div>
          </div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :lg="8">
        <el-card class="quick-add-card" shadow="hover">
          <template #header>
            <span class="card-title">快速添加预算</span>
          </template>
          <el-form :model="quickForm" @submit.prevent="handleQuickAdd">
            <el-form-item>
              <el-select v-model="quickForm.category" placeholder="选择分类" style="width: 100%">
                <el-option
                  v-for="category in availableCategories"
                  :key="category.value"
                  :label="category.label"
                  :value="category.value"
                />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-input
                v-model.number="quickForm.amount"
                type="number"
                placeholder="预算金额"
                :min="0"
                step="0.01"
              >
                <template #prepend>¥</template>
              </el-input>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" style="width: 100%" @click="handleQuickAdd">
                添加预算
              </el-button>
            </el-form-item>
          </el-form>
        </el-card>
      </el-col>
    </el-row>

    <!-- 预算列表 -->
    <el-card class="budget-list-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span class="card-title">预算详情</span>
          <el-button type="primary" :icon="Plus" @click="showAddDialog = true">
            添加预算
          </el-button>
        </div>
      </template>
      
      <div class="budget-list">
        <div v-if="dataStore.budgets.length === 0" class="empty-state">
          <el-empty description="暂无预算数据">
            <el-button type="primary" @click="showAddDialog = true">添加第一个预算</el-button>
          </el-empty>
        </div>
        
        <div v-else class="budget-items">
          <div 
            v-for="budget in dataStore.budgets" 
            :key="budget.id" 
            class="budget-item"
          >
            <div class="budget-info">
              <div class="budget-header">
                <h3 class="budget-category">{{ getCategoryName(budget.category) }}</h3>
                <div class="budget-actions">
                  <el-button type="primary" link size="small" @click="editBudget(budget)">
                    编辑
                  </el-button>
                  <el-button type="danger" link size="small" @click="deleteBudget(budget)">
                    删除
                  </el-button>
                </div>
              </div>
              
              <div class="budget-details">
                <div class="amount-info">
                  <span class="label">预算:</span>
                  <span class="value">{{ formatCurrency(budget.amount) }}</span>
                </div>
                <div class="amount-info">
                  <span class="label">已用:</span>
                  <span class="value expense">{{ formatCurrency(budget.spent) }}</span>
                </div>
                <div class="amount-info">
                  <span class="label">剩余:</span>
                  <span class="value" :class="(budget.amount - budget.spent) >= 0 ? 'positive' : 'negative'">
                    {{ formatCurrency(budget.amount - budget.spent) }}
                  </span>
                </div>
              </div>
            </div>
            
            <div class="budget-progress">
              <div class="progress-header">
                <span class="progress-label">使用进度</span>
                <span class="progress-percentage">
                  {{ ((budget.spent / budget.amount) * 100).toFixed(1) }}%
                </span>
              </div>
              <el-progress 
                :percentage="(budget.spent / budget.amount) * 100" 
                :color="getProgressColor((budget.spent / budget.amount) * 100)"
                :stroke-width="8"
              />
            </div>
          </div>
        </div>
      </div>
    </el-card>

    <!-- 添加/编辑预算对话框 -->
    <el-dialog
      v-model="showAddDialog"
      :title="editingBudget ? '编辑预算' : '添加预算'"
      width="500px"
      :before-close="handleDialogClose"
    >
      <el-form
        ref="formRef"
        :model="form"
        :rules="rules"
        label-width="80px"
      >
        <el-form-item label="分类" prop="category">
          <el-select v-model="form.category" placeholder="请选择分类" style="width: 100%">
            <el-option
              v-for="category in availableCategories"
              :key="category.value"
              :label="category.label"
              :value="category.value"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="预算金额" prop="amount">
          <el-input
            v-model.number="form.amount"
            type="number"
            placeholder="请输入预算金额"
            :min="0"
            step="0.01"
          >
            <template #prepend>¥</template>
          </el-input>
        </el-form-item>
        
        <el-form-item v-if="editingBudget" label="已使用" prop="spent">
          <el-input
            v-model.number="form.spent"
            type="number"
            placeholder="请输入已使用金额"
            :min="0"
            step="0.01"
          >
            <template #prepend>¥</template>
          </el-input>
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
import { ref, reactive, computed } from 'vue'
import { useDataStore } from '@/stores/data'
import { Plus } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'

const dataStore = useDataStore()
const formRef = ref()
const loading = ref(false)
const showAddDialog = ref(false)
const editingBudget = ref(null)

// 快速添加表单
const quickForm = reactive({
  category: '',
  amount: null
})

// 主表单
const form = reactive({
  category: '',
  amount: null,
  spent: 0
})

// 表单验证规则
const rules = {
  category: [
    { required: true, message: '请选择分类', trigger: 'change' }
  ],
  amount: [
    { required: true, message: '请输入预算金额', trigger: 'blur' },
    { type: 'number', min: 0.01, message: '预算金额必须大于0', trigger: 'blur' }
  ],
  spent: [
    { type: 'number', min: 0, message: '已使用金额不能为负数', trigger: 'blur' }
  ]
}

// 可用分类
const availableCategories = computed(() => {
  const allCategories = [
    { value: 'food', label: '餐饮' },
    { value: 'transport', label: '交通' },
    { value: 'entertainment', label: '娱乐' },
    { value: 'shopping', label: '购物' },
    { value: 'utilities', label: '水电费' },
    { value: 'healthcare', label: '医疗' },
    { value: 'education', label: '教育' },
    { value: 'other', label: '其他' }
  ]
  
  // 如果是编辑模式，显示所有分类
  if (editingBudget.value) {
    return allCategories
  }
  
  // 添加模式下，过滤掉已有预算的分类
  const existingCategories = dataStore.budgets.map(b => b.category)
  return allCategories.filter(c => !existingCategories.includes(c.value))
})

// 格式化货币
const formatCurrency = (amount) => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY'
  }).format(amount || 0)
}

// 获取分类名称
const getCategoryName = (category) => {
  const categoryMap = {
    'food': '餐饮',
    'transport': '交通',
    'entertainment': '娱乐',
    'shopping': '购物',
    'utilities': '水电费',
    'healthcare': '医疗',
    'education': '教育',
    'other': '其他'
  }
  return categoryMap[category] || category
}

// 获取进度条颜色
const getProgressColor = (percentage) => {
  if (percentage >= 90) return '#F56C6C'
  if (percentage >= 70) return '#E6A23C'
  return '#67C23A'
}

// 重置表单
const resetForm = () => {
  form.category = ''
  form.amount = null
  form.spent = 0
  
  if (formRef.value) {
    formRef.value.clearValidate()
  }
}

// 快速添加预算
const handleQuickAdd = () => {
  if (!quickForm.category || !quickForm.amount) {
    ElMessage.warning('请填写完整信息')
    return
  }
  
  if (quickForm.amount <= 0) {
    ElMessage.warning('预算金额必须大于0')
    return
  }
  
  // 检查是否已存在该分类的预算
  const existingBudget = dataStore.budgets.find(b => b.category === quickForm.category)
  if (existingBudget) {
    ElMessage.warning('该分类已存在预算，请选择其他分类')
    return
  }
  
  const budget = {
    category: quickForm.category,
    amount: quickForm.amount
  }
  
  dataStore.addBudget(budget)
  ElMessage.success('预算添加成功')
  
  // 重置快速添加表单
  quickForm.category = ''
  quickForm.amount = null
}

// 编辑预算
const editBudget = (budget) => {
  editingBudget.value = budget
  form.category = budget.category
  form.amount = budget.amount
  form.spent = budget.spent
  showAddDialog.value = true
}

// 删除预算
const deleteBudget = async (budget) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除「${getCategoryName(budget.category)}」的预算吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    dataStore.deleteBudget(budget.id)
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
    
    if (editingBudget.value) {
      // 编辑模式
      dataStore.updateBudget(editingBudget.value.id, {
        category: form.category,
        amount: form.amount,
        spent: form.spent
      })
      ElMessage.success('预算更新成功')
    } else {
      // 添加模式
      const budget = {
        category: form.category,
        amount: form.amount
      }
      dataStore.addBudget(budget)
      ElMessage.success('预算添加成功')
    }
    
    handleDialogClose()
  } catch (error) {
    console.error('保存预算失败:', error)
    ElMessage.error('保存失败，请重试')
  } finally {
    loading.value = false
  }
}

// 处理对话框关闭
const handleDialogClose = () => {
  resetForm()
  editingBudget.value = null
  showAddDialog.value = false
}
</script>

<style lang="scss" scoped>
.budget {
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
  
  .overview-row {
    margin-bottom: 24px;
    
    .overview-card {
      .overview-content {
        .overview-stats {
          display: flex;
          justify-content: space-around;
          margin-bottom: 24px;
          
          .stat-item {
            text-align: center;
            
            .stat-value {
              font-size: 24px;
              font-weight: 600;
              margin-bottom: 4px;
              
              &.expense {
                color: var(--el-color-danger);
              }
              
              &.positive {
                color: var(--el-color-success);
              }
              
              &.negative {
                color: var(--el-color-danger);
              }
            }
            
            .stat-label {
              font-size: 14px;
              color: var(--el-text-color-regular);
            }
          }
        }
        
        .progress-section {
          .progress-info {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            
            .percentage {
              font-weight: 600;
              color: var(--el-color-primary);
            }
          }
        }
      }
    }
    
    .quick-add-card {
      .el-form {
        .el-form-item {
          margin-bottom: 16px;
          
          &:last-child {
            margin-bottom: 0;
          }
        }
      }
    }
  }
  
  .budget-list-card {
    .card-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      
      .card-title {
        font-size: 16px;
        font-weight: 600;
      }
    }
    
    .budget-list {
      .empty-state {
        text-align: center;
        padding: 40px 0;
      }
      
      .budget-items {
        display: grid;
        gap: 16px;
        
        .budget-item {
          border: 1px solid var(--el-border-color-lighter);
          border-radius: 8px;
          padding: 20px;
          transition: all 0.3s ease;
          
          &:hover {
            border-color: var(--el-color-primary-light-7);
            box-shadow: 0 2px 12px rgba(64, 158, 255, 0.1);
          }
          
          .budget-info {
            margin-bottom: 16px;
            
            .budget-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 12px;
              
              .budget-category {
                font-size: 18px;
                font-weight: 600;
                color: var(--el-text-color-primary);
                margin: 0;
              }
              
              .budget-actions {
                display: flex;
                gap: 8px;
              }
            }
            
            .budget-details {
              display: flex;
              gap: 24px;
              
              .amount-info {
                display: flex;
                flex-direction: column;
                gap: 4px;
                
                .label {
                  font-size: 12px;
                  color: var(--el-text-color-secondary);
                }
                
                .value {
                  font-size: 16px;
                  font-weight: 500;
                  
                  &.expense {
                    color: var(--el-color-danger);
                  }
                  
                  &.positive {
                    color: var(--el-color-success);
                  }
                  
                  &.negative {
                    color: var(--el-color-danger);
                  }
                }
              }
            }
          }
          
          .budget-progress {
            .progress-header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              margin-bottom: 8px;
              
              .progress-label {
                font-size: 14px;
                color: var(--el-text-color-regular);
              }
              
              .progress-percentage {
                font-size: 14px;
                font-weight: 600;
                color: var(--el-color-primary);
              }
            }
          }
        }
      }
    }
  }
  
  .card-title {
    font-size: 16px;
    font-weight: 600;
    color: var(--el-text-color-primary);
  }
  
  .dialog-footer {
    display: flex;
    justify-content: flex-end;
    gap: 12px;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .budget {
    .overview-row {
      .overview-card {
        .overview-content {
          .overview-stats {
            flex-direction: column;
            gap: 16px;
            
            .stat-item {
              .stat-value {
                font-size: 20px;
              }
            }
          }
        }
      }
    }
    
    .budget-list-card {
      .budget-list {
        .budget-items {
          .budget-item {
            padding: 16px;
            
            .budget-info {
              .budget-header {
                flex-direction: column;
                align-items: flex-start;
                gap: 8px;
              }
              
              .budget-details {
                flex-direction: column;
                gap: 12px;
              }
            }
          }
        }
      }
    }
  }
}
</style>