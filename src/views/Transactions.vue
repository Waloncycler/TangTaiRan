<template>
  <div class="transactions">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">账单管理</h1>
      <p class="page-subtitle">管理收入和支出记录</p>
    </div>

    <!-- 操作栏 -->
    <div class="action-bar">
      <div class="action-left">
        <el-button type="primary" :icon="Plus" @click="showAddDialog = true">
          添加交易
        </el-button>
        <el-button :icon="Download" @click="exportData">
          导出数据
        </el-button>
      </div>
      <div class="action-right">
        <el-input
          v-model="searchText"
          placeholder="搜索交易记录..."
          :prefix-icon="Search"
          style="width: 300px"
          clearable
        />
      </div>
    </div>

    <!-- 筛选器 -->
    <el-card class="filter-card" shadow="never">
      <el-form :model="filters" inline>
        <el-form-item label="交易类型">
          <el-select v-model="filters.type" placeholder="全部" clearable style="width: 120px">
            <el-option label="收入" value="income" />
            <el-option label="支出" value="expense" />
          </el-select>
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="filters.category" placeholder="全部" clearable style="width: 150px">
            <el-option
              v-for="category in allCategories"
              :key="category.value"
              :label="category.label"
              :value="category.value"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="日期范围">
          <el-date-picker
            v-model="filters.dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 240px"
          />
        </el-form-item>
        <el-form-item>
          <el-button @click="resetFilters">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :xs="24" :sm="8">
        <div class="stat-card income">
          <div class="stat-icon">
            <el-icon size="24"><TrendCharts /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatCurrency(filteredStats.totalIncome) }}</div>
            <div class="stat-label">总收入</div>
          </div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="8">
        <div class="stat-card expense">
          <div class="stat-icon">
            <el-icon size="24"><Money /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatCurrency(filteredStats.totalExpense) }}</div>
            <div class="stat-label">总支出</div>
          </div>
        </div>
      </el-col>
      <el-col :xs="24" :sm="8">
        <div class="stat-card net">
          <div class="stat-icon">
            <el-icon size="24"><DataAnalysis /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value" :class="filteredStats.netIncome >= 0 ? 'positive' : 'negative'">
              {{ formatCurrency(filteredStats.netIncome) }}
            </div>
            <div class="stat-label">净收入</div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 交易列表 -->
    <el-card class="table-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span class="card-title">交易记录</span>
          <span class="record-count">共 {{ filteredTransactions.length }} 条记录</span>
        </div>
      </template>
      
      <el-table
        :data="paginatedTransactions"
        stripe
        style="width: 100%"
        v-loading="loading"
      >
        <el-table-column prop="date" label="日期" width="120" sortable />
        <el-table-column prop="type" label="类型" width="80">
          <template #default="{ row }">
            <el-tag :type="row.type === 'income' ? 'success' : 'danger'" size="small">
              {{ row.type === 'income' ? '收入' : '支出' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="category" label="分类" width="120">
          <template #default="{ row }">
            {{ getCategoryName(row.category) }}
          </template>
        </el-table-column>
        <el-table-column prop="amount" label="金额" width="120" sortable>
          <template #default="{ row }">
            <span :class="row.type === 'income' ? 'amount-income' : 'amount-expense'">
              {{ formatCurrency(row.amount) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="note" label="备注" show-overflow-tooltip />
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button type="primary" link size="small" @click="editTransaction(row)">
              编辑
            </el-button>
            <el-button type="danger" link size="small" @click="deleteTransaction(row)">
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
          :total="filteredTransactions.length"
          layout="total, sizes, prev, pager, next, jumper"
          background
        />
      </div>
    </el-card>

    <!-- 添加/编辑交易对话框 -->
    <AddTransactionDialog 
      v-model="showAddDialog" 
      :transaction="editingTransaction"
      @success="handleTransactionSaved"
    />
  </div>
</template>

<script setup>
import { ref, computed, reactive, onMounted } from 'vue'
import { useDataStore } from '@/stores/data'
import { 
  Plus, 
  Download, 
  Search, 
  TrendCharts, 
  Money, 
  DataAnalysis 
} from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import AddTransactionDialog from '@/components/AddTransactionDialog.vue'

const dataStore = useDataStore()
const loading = ref(false)
const showAddDialog = ref(false)
const editingTransaction = ref(null)
const searchText = ref('')
const currentPage = ref(1)
const pageSize = ref(20)

// 筛选条件
const filters = reactive({
  type: '',
  category: '',
  dateRange: null
})

// 所有分类选项
const allCategories = computed(() => {
  const categories = [
    // 收入分类
    { value: 'salary', label: '工资' },
    { value: 'bonus', label: '奖金' },
    { value: 'investment', label: '投资收益' },
    { value: 'freelance', label: '自由职业' },
    { value: 'rental', label: '租金收入' },
    // 支出分类
    { value: 'food', label: '餐饮' },
    { value: 'transport', label: '交通' },
    { value: 'entertainment', label: '娱乐' },
    { value: 'shopping', label: '购物' },
    { value: 'utilities', label: '水电费' },
    { value: 'healthcare', label: '医疗' },
    { value: 'education', label: '教育' },
    { value: 'other', label: '其他' }
  ]
  return categories
})

// 过滤后的交易记录
const filteredTransactions = computed(() => {
  let result = dataStore.transactions
  
  // 搜索过滤
  if (searchText.value) {
    const search = searchText.value.toLowerCase()
    result = result.filter(t => 
      t.note.toLowerCase().includes(search) ||
      getCategoryName(t.category).toLowerCase().includes(search)
    )
  }
  
  // 类型过滤
  if (filters.type) {
    result = result.filter(t => t.type === filters.type)
  }
  
  // 分类过滤
  if (filters.category) {
    result = result.filter(t => t.category === filters.category)
  }
  
  // 日期范围过滤
  if (filters.dateRange && filters.dateRange.length === 2) {
    const [startDate, endDate] = filters.dateRange
    result = result.filter(t => t.date >= startDate && t.date <= endDate)
  }
  
  // 按日期倒序排序
  return result.sort((a, b) => new Date(b.date) - new Date(a.date))
})

// 分页后的交易记录
const paginatedTransactions = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return filteredTransactions.value.slice(start, end)
})

// 过滤后的统计数据
const filteredStats = computed(() => {
  const transactions = filteredTransactions.value
  const totalIncome = transactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0)
  const totalExpense = transactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0)
  const netIncome = totalIncome - totalExpense
  
  return {
    totalIncome,
    totalExpense,
    netIncome
  }
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
    'other': '其他',
    'salary': '工资',
    'bonus': '奖金',
    'investment': '投资收益',
    'freelance': '自由职业',
    'rental': '租金收入'
  }
  return categoryMap[category] || category
}

// 重置筛选条件
const resetFilters = () => {
  filters.type = ''
  filters.category = ''
  filters.dateRange = null
  searchText.value = ''
  currentPage.value = 1
}

// 编辑交易
const editTransaction = (transaction) => {
  editingTransaction.value = { ...transaction }
  showAddDialog.value = true
}

// 删除交易
const deleteTransaction = async (transaction) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除这条交易记录吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    dataStore.deleteTransaction(transaction.id)
    ElMessage.success('删除成功')
  } catch {
    // 用户取消删除
  }
}

// 处理交易保存成功
const handleTransactionSaved = () => {
  editingTransaction.value = null
  ElMessage.success('保存成功')
}

// 导出数据
const exportData = () => {
  ElMessage.info('导出功能开发中...')
}

// 初始化数据
onMounted(async () => {
  // 只在数据未初始化时才获取数据，避免重复请求
  if (!dataStore.initialized) {
    await dataStore.fetchTransactions()
  }
})
</script>

<style lang="scss" scoped>
.transactions {
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
  
  .action-bar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
    
    .action-left {
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
  
  .filter-card {
    margin-bottom: 16px;
    
    :deep(.el-card__body) {
      padding: 16px;
    }
    
    .el-form {
      margin: 0;
      
      .el-form-item {
        margin-bottom: 0;
      }
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
      
      &.income .stat-icon {
        background: linear-gradient(135deg, #67C23A, #85CE61);
      }
      
      &.expense .stat-icon {
        background: linear-gradient(135deg, #F56C6C, #F78989);
      }
      
      &.net .stat-icon {
        background: linear-gradient(135deg, #409EFF, #66B1FF);
      }
      
      .stat-content {
        flex: 1;
        
        .stat-value {
          font-size: 20px;
          font-weight: 600;
          margin-bottom: 4px;
          
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
  }
  
  .table-card {
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
    
    .amount-income {
      color: var(--el-color-success);
      font-weight: 500;
    }
    
    .amount-expense {
      color: var(--el-color-danger);
      font-weight: 500;
    }
    
    .pagination-wrapper {
      display: flex;
      justify-content: center;
      margin-top: 20px;
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .transactions {
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
            font-size: 18px;
          }
        }
      }
    }
  }
}
</style>