<template>
  <div class="dashboard">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">财务概览</h1>
      <p class="page-subtitle">实时监控企业财务状况</p>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :xs="24" :sm="12" :lg="6">
        <div class="stat-card">
          <div class="stat-icon income">
            <el-icon size="24"><TrendCharts /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatCurrency(dataStore.financialOverview.totalIncome) }}</div>
            <div class="stat-label">总收入</div>
            <div class="stat-change" :class="getChangeClass(dataStore.financialOverview.incomeChange)">
              <el-icon><ArrowUp v-if="dataStore.financialOverview.incomeChange >= 0" /><ArrowDown v-else /></el-icon>
              {{ Math.abs(dataStore.financialOverview.incomeChange) }}%
            </div>
          </div>
        </div>
      </el-col>
      
      <el-col :xs="24" :sm="12" :lg="6">
        <div class="stat-card">
          <div class="stat-icon expense">
            <el-icon size="24"><Money /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatCurrency(dataStore.financialOverview.totalExpenses) }}</div>
            <div class="stat-label">总支出</div>
            <div class="stat-change" :class="getChangeClass(-dataStore.financialOverview.expenseChange)">
              <el-icon><ArrowUp v-if="dataStore.financialOverview.expenseChange <= 0" /><ArrowDown v-else /></el-icon>
              {{ Math.abs(dataStore.financialOverview.expenseChange) }}%
            </div>
          </div>
        </div>
      </el-col>
      
      <el-col :xs="24" :sm="12" :lg="6">
        <div class="stat-card">
          <div class="stat-icon assets">
            <el-icon size="24"><Wallet /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatCurrency(dataStore.financialOverview.totalAssets) }}</div>
            <div class="stat-label">总资产</div>
            <div class="stat-change" :class="getChangeClass(dataStore.financialOverview.assetChange)">
              <el-icon><ArrowUp v-if="dataStore.financialOverview.assetChange >= 0" /><ArrowDown v-else /></el-icon>
              {{ Math.abs(dataStore.financialOverview.assetChange) }}%
            </div>
          </div>
        </div>
      </el-col>
      
      <el-col :xs="24" :sm="12" :lg="6">
        <div class="stat-card">
          <div class="stat-icon net">
            <el-icon size="24"><DataAnalysis /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatCurrency(dataStore.financialOverview.netIncome) }}</div>
            <div class="stat-label">净收入</div>
            <div class="stat-change positive">
              <el-icon><TrendCharts /></el-icon>
              本月
            </div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 图表和快速操作 -->
    <el-row :gutter="20" class="charts-row">
      <!-- 收支趋势图 -->
      <el-col :xs="24" :lg="16">
        <el-card class="chart-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span class="card-title">收支趋势</span>
              <el-radio-group v-model="chartPeriod" size="small" @change="updateChart">
                <el-radio-button label="month">本月</el-radio-button>
                <el-radio-button label="quarter">本季度</el-radio-button>
                <el-radio-button label="year">本年</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div class="chart-container">
            <canvas ref="chartRef" width="400" height="200"></canvas>
          </div>
        </el-card>
      </el-col>
      
      <!-- 快速操作 -->
      <el-col :xs="24" :lg="8">
        <el-card class="quick-actions-card" shadow="hover">
          <template #header>
            <span class="card-title">快速操作</span>
          </template>
          <div class="quick-actions">
            <el-button 
              type="primary" 
              :icon="Plus" 
              class="action-btn"
              @click="showAddTransaction = true"
            >
              添加交易
            </el-button>
            <el-button 
              type="success" 
              :icon="Box" 
              class="action-btn"
              @click="$router.push('/inventory')"
            >
              库存管理
            </el-button>
            <el-button 
              type="warning" 
              :icon="Van" 
              class="action-btn"
              @click="$router.push('/logistics')"
            >
              物流管理
            </el-button>
            <el-button 
              type="info" 
              :icon="Wallet" 
              class="action-btn"
              @click="$router.push('/budget')"
            >
              预算管理
            </el-button>
          </div>
        </el-card>
        
        <!-- 库存状态 -->
        <el-card class="inventory-status-card" shadow="hover">
          <template #header>
            <span class="card-title">库存状态</span>
          </template>
          <div class="inventory-stats">
            <div class="inventory-stat">
              <div class="stat-number">{{ dataStore.inventoryStats.total }}</div>
              <div class="stat-text">总商品</div>
            </div>
            <div class="inventory-stat warning">
              <div class="stat-number">{{ dataStore.inventoryStats.lowStock }}</div>
              <div class="stat-text">库存不足</div>
            </div>
            <div class="inventory-stat danger">
              <div class="stat-number">{{ dataStore.inventoryStats.outOfStock }}</div>
              <div class="stat-text">缺货</div>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 最近交易 -->
    <el-card class="recent-transactions-card" shadow="hover">
      <template #header>
        <div class="card-header">
          <span class="card-title">最近交易</span>
          <el-button type="primary" link @click="$router.push('/transactions')">
            查看全部
          </el-button>
        </div>
      </template>
      <el-table :data="recentTransactions" style="width: 100%" stripe>
        <el-table-column prop="date" label="日期" width="120" />
        <el-table-column prop="category" label="分类" width="120">
          <template #default="{ row }">
            {{ getCategoryName(row.category) }}
          </template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="80">
          <template #default="{ row }">
            <el-tag :type="row.type === 'income' ? 'success' : 'danger'" size="small">
              {{ row.type === 'income' ? '收入' : '支出' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="amount" label="金额" width="120">
          <template #default="{ row }">
            <span :class="row.type === 'income' ? 'amount-income' : 'amount-expense'">
              {{ formatCurrency(row.amount) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="note" label="备注" show-overflow-tooltip />
      </el-table>
    </el-card>

    <!-- 添加交易对话框 -->
    <AddTransactionDialog 
      v-model="showAddTransaction" 
      @success="handleTransactionAdded"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { useDataStore } from '@/stores/data'
import { 
  TrendCharts, 
  Money, 
  Wallet, 
  DataAnalysis, 
  ArrowUp, 
  ArrowDown,
  Plus,
  Box,
  Van
} from '@element-plus/icons-vue'
import { Chart, registerables } from 'chart.js'
import AddTransactionDialog from '@/components/AddTransactionDialog.vue'

// 注册 Chart.js 组件
Chart.register(...registerables)

const dataStore = useDataStore()
const chartRef = ref()
const chartInstance = ref(null)
const chartPeriod = ref('month')
const showAddTransaction = ref(false)

// 最近交易（最多显示5条）
const recentTransactions = computed(() => {
  return dataStore.transactions
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5)
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
  const categoryNames = {
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
  return categoryNames[category] || category
}

// 获取变化样式类
const getChangeClass = (change) => {
  return change >= 0 ? 'positive' : 'negative'
}

// 初始化图表
const initChart = () => {
  if (!chartRef.value) return
  
  const ctx = chartRef.value.getContext('2d')
  
  // 模拟数据
  const data = {
    labels: ['1月', '2月', '3月', '4月', '5月', '6月'],
    datasets: [
      {
        label: '收入',
        data: [5000, 5500, 4800, 6200, 5800, 6500],
        borderColor: '#67C23A',
        backgroundColor: 'rgba(103, 194, 58, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: '支出',
        data: [3200, 3800, 3500, 4100, 3900, 4200],
        borderColor: '#F56C6C',
        backgroundColor: 'rgba(245, 108, 108, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  }
  
  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      }
    },
    scales: {
      x: {
        display: true,
        grid: {
          display: false
        }
      },
      y: {
        display: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        },
        ticks: {
          callback: function(value) {
            return '¥' + value.toLocaleString()
          }
        }
      }
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  }
  
  chartInstance.value = new Chart(ctx, {
    type: 'line',
    data,
    options
  })
}

// 更新图表
const updateChart = () => {
  // 这里可以根据 chartPeriod 的值更新图表数据
  console.log('更新图表周期:', chartPeriod.value)
}

// 处理交易添加成功
const handleTransactionAdded = () => {
  // 刷新数据
  console.log('交易添加成功')
}

onMounted(async () => {
  await nextTick()
  initChart()
})
</script>

<style lang="scss" scoped>
.dashboard {
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
      padding: 24px;
      box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
      display: flex;
      align-items: center;
      gap: 16px;
      height: 120px;
      transition: transform 0.3s ease, box-shadow 0.3s ease;
      
      &:hover {
        transform: translateY(-2px);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
      }
      
      .stat-icon {
        width: 60px;
        height: 60px;
        border-radius: 12px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        
        &.income {
          background: linear-gradient(135deg, #67C23A, #85CE61);
        }
        
        &.expense {
          background: linear-gradient(135deg, #F56C6C, #F78989);
        }
        
        &.assets {
          background: linear-gradient(135deg, #409EFF, #66B1FF);
        }
        
        &.net {
          background: linear-gradient(135deg, #E6A23C, #EBB563);
        }
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
          margin-bottom: 8px;
        }
        
        .stat-change {
          font-size: 12px;
          display: flex;
          align-items: center;
          gap: 4px;
          
          &.positive {
            color: #67C23A;
          }
          
          &.negative {
            color: #F56C6C;
          }
        }
      }
    }
  }
  
  .charts-row {
    margin-bottom: 24px;
    
    .chart-card {
      height: 400px;
      
      .chart-container {
        height: 300px;
        position: relative;
      }
    }
    
    .quick-actions-card {
      margin-bottom: 16px;
      
      .quick-actions {
        display: flex;
        flex-direction: column;
        gap: 12px;
        
        .action-btn {
          width: 100%;
          height: 40px;
          justify-content: flex-start;
        }
      }
    }
    
    .inventory-status-card {
      .inventory-stats {
        display: flex;
        justify-content: space-between;
        
        .inventory-stat {
          text-align: center;
          
          .stat-number {
            font-size: 24px;
            font-weight: 600;
            color: var(--el-color-primary);
            
            .warning & {
              color: var(--el-color-warning);
            }
            
            .danger & {
              color: var(--el-color-danger);
            }
          }
          
          .stat-text {
            font-size: 12px;
            color: var(--el-text-color-regular);
            margin-top: 4px;
          }
        }
      }
    }
  }
  
  .recent-transactions-card {
    .amount-income {
      color: var(--el-color-success);
      font-weight: 500;
    }
    
    .amount-expense {
      color: var(--el-color-danger);
      font-weight: 500;
    }
  }
  
  .card-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .card-title {
      font-size: 16px;
      font-weight: 600;
      color: var(--el-text-color-primary);
    }
  }
}

// 响应式设计
@media (max-width: 768px) {
  .dashboard {
    .stats-row {
      .stat-card {
        height: auto;
        padding: 16px;
        
        .stat-icon {
          width: 48px;
          height: 48px;
        }
        
        .stat-content {
          .stat-value {
            font-size: 20px;
          }
        }
      }
    }
    
    .charts-row {
      .chart-card {
        height: 300px;
        
        .chart-container {
          height: 200px;
        }
      }
      
      .quick-actions {
        .action-btn {
          height: 36px;
        }
      }
    }
  }
}
</style>