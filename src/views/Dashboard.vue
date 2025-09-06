<template>
  <div class="dashboard">
    <!-- 页面标题 -->
    <div class="page-header">
      <h1 class="page-title">系统概览</h1>
      <p class="page-subtitle">实时监控企业运营状况</p>
    </div>

    <!-- 统计卡片 -->
    <el-row :gutter="20" class="stats-row">
      <el-col :xs="24" :sm="12" :lg="6">
        <div class="stat-card">
          <div class="stat-icon sales">
            <el-icon size="24"><ShoppingCart /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ formatCurrency(periodFinancialData.totalIncome) }}</div>
            <div class="stat-label">总收入</div>
            <div class="stat-detail">
              订单数: {{ periodFinancialData.salesCount }}
            </div>
            <div class="stat-change" :class="getChangeClass(periodFinancialData.incomeChange)">
              <el-icon><ArrowUp v-if="periodFinancialData.incomeChange >= 0" /><ArrowDown v-else /></el-icon>
              {{ Math.abs(periodFinancialData.incomeChange) }}%
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
            <div class="stat-value">{{ formatCurrency(periodFinancialData.totalExpenses) }}</div>
            <div class="stat-label">总支出</div>
            <div class="stat-detail">
              {{ getPeriodLabel() }}支出统计
            </div>
            <div class="stat-change" :class="getChangeClass(-periodFinancialData.expenseChange)">
              <el-icon><ArrowUp v-if="periodFinancialData.expenseChange <= 0" /><ArrowDown v-else /></el-icon>
              {{ Math.abs(periodFinancialData.expenseChange) }}%
            </div>
          </div>
        </div>
      </el-col>
      
      <el-col :xs="24" :sm="12" :lg="6">
        <div class="stat-card clickable" @click="navigateTo('/inventory')">
          <div class="stat-icon inventory">
            <el-icon size="24"><Box /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ dataStore.inventoryStats.total }}</div>
            <div class="stat-label">库存状态</div>
            <div class="stat-detail">
              低库存: {{ dataStore.inventoryStats.lowStock }} | 缺货: {{ dataStore.inventoryStats.outOfStock }}
            </div>
            <div class="stat-change" :class="dataStore.inventoryStats.lowStock > 0 ? 'negative' : 'positive'">
              <el-icon><Box /></el-icon>
              {{ dataStore.inventoryStats.normal }}正常
            </div>
          </div>
        </div>
      </el-col>
      
      <el-col :xs="24" :sm="12" :lg="6">
        <div class="stat-card clickable" @click="navigateTo('/logistics')">
          <div class="stat-icon logistics">
            <el-icon size="24"><Van /></el-icon>
          </div>
          <div class="stat-content">
            <div class="stat-value">{{ logisticsStats.total }}</div>
            <div class="stat-label">物流订单</div>
            <div class="stat-detail">
              待发货: {{ logisticsStats.pending }} | 运输中: {{ logisticsStats.transit }}
            </div>
            <div class="stat-change positive">
              <el-icon><Van /></el-icon>
              本月
            </div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 业务分析图表 -->
    <el-row :gutter="20" class="charts-row">
      <el-col :span="24">
        <el-card class="chart-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span class="card-title">业务分析</span>
              <div class="chart-controls">
                <el-radio-group v-model="chartType" size="small" @change="switchChartType" class="chart-type-selector">
                  <el-radio-button label="line">趋势图</el-radio-button>
                  <el-radio-button label="bar">对比图</el-radio-button>
                  <el-radio-button label="pie">分布图</el-radio-button>
                </el-radio-group>
                <el-radio-group v-model="chartPeriod" size="small" @change="updateChart" class="chart-period-selector" v-if="chartType !== 'pie'">
                  <el-radio-button label="month">本月</el-radio-button>
                  <el-radio-button label="quarter">本季度</el-radio-button>
                  <el-radio-button label="year">本年</el-radio-button>
                  <el-radio-button label="all">全周期</el-radio-button>
                </el-radio-group>
              </div>
            </div>
          </template>
          <div class="chart-container">
            <canvas ref="chartRef" width="400" height="200"></canvas>
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
import { useSalesStore } from '@/stores/sales'
import { useRouter } from 'vue-router'
import dayjs from 'dayjs'
import { 
  TrendCharts, 
  Money, 
  Wallet, 
  DataAnalysis, 
  ArrowUp, 
  ArrowDown,
  Plus,
  Box,
  Van,
  ShoppingCart
} from '@element-plus/icons-vue'
import { Chart, registerables } from 'chart.js'
import AddTransactionDialog from '@/components/AddTransactionDialog.vue'

// 注册 Chart.js 组件
Chart.register(...registerables)

const dataStore = useDataStore()
const router = useRouter()
const chartRef = ref()
const chartInstance = ref(null)
const chartType = ref('line')
const chartPeriod = ref('year')

// 导航到指定路由
const navigateTo = (path) => {
  router.push(path)
}

// 最近交易记录
const recentTransactions = computed(() => {
  return dataStore.transactions
    .slice()
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 5)
})

// 物流统计
const logisticsStats = computed(() => {
  const logistics = dataStore.logistics
  const total = logistics.length
  const pending = logistics.filter(item => item.status === 'pending').length
  const transit = logistics.filter(item => item.status === 'transit').length
  const delivered = logistics.filter(item => item.status === 'delivered').length
  
  return {
    total,
    pending,
    transit,
    delivered
  }
})

// 根据选择的周期计算财务数据
const periodFinancialData = computed(() => {
  // 默认值
  let totalIncome = 0;
  let totalExpenses = 0;
  let salesCount = 0;
  let incomeChange = 0;
  let expenseChange = 0;
  
  const transactions = dataStore.transactions;
  const currentPeriod = chartPeriod.value;
  
  // 根据周期筛选交易
  const periodTransactions = transactions.filter(t => {
    const transactionDate = dayjs(t.date);
    if (currentPeriod === 'month') {
      return transactionDate.isAfter(dayjs().subtract(1, 'month'));
    } else if (currentPeriod === 'quarter') {
      return transactionDate.isAfter(dayjs().subtract(3, 'month'));
    } else if (currentPeriod === 'year') {
      return transactionDate.isAfter(dayjs().subtract(1, 'year'));
    } else {
      return true; // 全部周期
    }
  });
  
  // 计算当前周期收入和支出
  totalIncome = periodTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
    
  totalExpenses = periodTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  // 计算销售订单数
  salesCount = periodTransactions
    .filter(t => t.type === 'income' && t.category === 'sales')
    .length;
  
  // 计算同比变化（简化计算，实际应用中可能需要更复杂的逻辑）
  incomeChange = 5.2;  // 示例值
  expenseChange = 3.8;  // 示例值
  
  return {
    totalIncome,
    totalExpenses,
    salesCount,
    incomeChange,
    expenseChange
  };
});

// 获取周期标签
const getPeriodLabel = () => {
  switch(chartPeriod.value) {
    case 'month':
      return '本月';
    case 'quarter':
      return '本季度';
    case 'year':
      return '本年';
    default:
      return '全部';
  }
}

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

// 获取饼图的类别数据
const getCategoryData = () => {
  // 获取所有交易
  const transactions = dataStore.transactions
  
  // 按类别分组收入和支出
  const incomeByCategory = {}
  const expenseByCategory = {}
  
  transactions.forEach(t => {
    if (t.type === 'income') {
      if (!incomeByCategory[t.category]) {
        incomeByCategory[t.category] = 0
      }
      incomeByCategory[t.category] += t.amount
    } else {
      if (!expenseByCategory[t.category]) {
        expenseByCategory[t.category] = 0
      }
      expenseByCategory[t.category] += t.amount
    }
  })
  
  // 准备饼图数据
  const labels = []
  const data = []
  const colors = []
  const borderColors = []
  
  // 收入类别颜色
  const incomeColors = [
    'rgba(103, 194, 58, 0.7)',
    'rgba(103, 194, 58, 0.6)',
    'rgba(103, 194, 58, 0.5)',
    'rgba(103, 194, 58, 0.4)',
    'rgba(103, 194, 58, 0.3)'
  ]
  
  // 支出类别颜色
  const expenseColors = [
    'rgba(245, 108, 108, 0.7)',
    'rgba(245, 108, 108, 0.6)',
    'rgba(245, 108, 108, 0.5)',
    'rgba(245, 108, 108, 0.4)',
    'rgba(245, 108, 108, 0.3)'
  ]
  
  // 添加收入类别
  Object.entries(incomeByCategory)
    .sort((a, b) => b[1] - a[1])
    .forEach(([category, amount], index) => {
      labels.push(`${getCategoryName(category)}(收入)`)
      data.push(amount)
      colors.push(incomeColors[index % incomeColors.length])
      borderColors.push('#67C23A')
    })
  
  // 添加支出类别
  Object.entries(expenseByCategory)
    .sort((a, b) => b[1] - a[1])
    .forEach(([category, amount], index) => {
      labels.push(`${getCategoryName(category)}(支出)`)
      data.push(amount)
      colors.push(expenseColors[index % expenseColors.length])
      borderColors.push('#F56C6C')
    })
  
  return { labels, data, colors, borderColors }
}

// 获取本年1月到12月的数据
const getLast6MonthsData = () => {
  const months = []
  const incomeData = []
  const expenseData = []
  
  // 生成1月到12月的标签
  const currentYear = dayjs().year()
  for (let month = 0; month < 12; month++) {
    const date = dayjs().year(currentYear).month(month)
    months.push(date.format('M月'))
    
    const monthTransactions = dataStore.transactions.filter(t => {
      return dayjs(t.date).format('YYYY-MM') === date.format('YYYY-MM')
    })
    
    // 计算当月收入（所有交易收入，包括已同步的销售收入）
    const totalIncome = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)
    
    // 计算当月支出
    const totalExpense = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)
    
    incomeData.push(totalIncome)
    expenseData.push(totalExpense)
  }
  
  return { months, incomeData, expenseData }
}

// 图表配置选项
const getChartOptions = (type) => {
  const baseOptions = {
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
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false
    }
  }
  
  // 根据图表类型返回不同的配置
  if (type === 'pie') {
    return {
      ...baseOptions,
      plugins: {
        ...baseOptions.plugins,
        tooltip: {
          callbacks: {
            label: function(context) {
              const label = context.label || '';
              const value = context.raw || 0;
              const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
              const percentage = Math.round((value / total) * 100);
              return `${label}: ${formatCurrency(value)} (${percentage}%)`;
            }
          }
        }
      }
    }
  } else {
    return {
      ...baseOptions,
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
      }
    }
  }
}

// 初始化图表
const initChart = () => {
  if (!chartRef.value) return
  
  const ctx = chartRef.value.getContext('2d')
  const { months, incomeData, expenseData } = getLast6MonthsData()
  
  // 使用真实数据
  const data = {
    labels: months,
    datasets: [
      {
        label: '收入',
        data: incomeData,
        borderColor: '#67C23A',
        backgroundColor: 'rgba(103, 194, 58, 0.1)',
        tension: 0.4,
        fill: true
      },
      {
        label: '支出',
        data: expenseData,
        borderColor: '#F56C6C',
        backgroundColor: 'rgba(245, 108, 108, 0.1)',
        tension: 0.4,
        fill: true
      }
    ]
  }
  
  // 初始化渲染图表
  const options = getChartOptions(chartType.value)
  
  chartInstance.value = new Chart(ctx, {
    type: chartType.value,
    data,
    options
  })
}

// 根据周期获取数据
const getDataByPeriod = (period) => {
  let periods = []
  let incomeData = []
  let expenseData = []
  
  if (period === 'month') {
    // 最近4周，按周显示
    for (let i = 3; i >= 0; i--) {
      const startDate = dayjs().subtract((i + 1) * 7, 'day')
      const endDate = dayjs().subtract(i * 7, 'day')
      periods.push(`第${4-i}周`)
      
      const weekTransactions = dataStore.transactions.filter(t => {
        const date = dayjs(t.date)
        return date.isAfter(startDate) && date.isBefore(endDate)
      })
      
      const totalIncome = weekTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
      const totalExpense = weekTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
      
      incomeData.push(totalIncome)
      expenseData.push(totalExpense)
    }
  } else if (period === 'quarter') {
    // 最近3个月
    for (let i = 2; i >= 0; i--) {
      const date = dayjs().subtract(i, 'month')
      periods.push(date.format('M月'))
      
      const monthTransactions = dataStore.transactions.filter(t => {
        return dayjs(t.date).format('YYYY-MM') === date.format('YYYY-MM')
      })
      
      const totalIncome = monthTransactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
      const totalExpense = monthTransactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
      
      incomeData.push(totalIncome)
      expenseData.push(totalExpense)
    }
  } else if (period === 'year') {
    // 年度数据，显示最近6个月
    return getLast6MonthsData()
  } else if (period === 'all') {
    // 全周期数据，按月显示所有数据
    const allTransactions = dataStore.transactions
    const monthlyData = {}
    
    // 按月分组所有交易数据
    allTransactions.forEach(t => {
      const monthKey = dayjs(t.date).format('YYYY-MM')
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = { income: 0, expense: 0 }
      }
      if (t.type === 'income') {
        monthlyData[monthKey].income += t.amount
      } else {
        monthlyData[monthKey].expense += t.amount
      }
    })
    
    // 按时间排序并生成数据
    const sortedMonths = Object.keys(monthlyData).sort()
    sortedMonths.forEach(monthKey => {
      periods.push(dayjs(monthKey).format('M月'))
      incomeData.push(monthlyData[monthKey].income)
      expenseData.push(monthlyData[monthKey].expense)
    })
  }
  
  return { months: periods, incomeData, expenseData }
}

// 渲染图表
const renderChart = (data, type) => {
  // 使用chartRef获取上下文
  const chartContext = chartRef.value.getContext('2d')
  const options = getChartOptions(type)
  
  // 销毁现有图表
  if (chartInstance.value) {
    chartInstance.value.destroy()
  }
  
  // 根据图表类型处理数据
  let chartData = data
  if (type === 'pie') {
    // 为饼图准备数据
    const categoryData = getCategoryData()
    
    chartData = {
      labels: categoryData.labels,
      datasets: [{
        data: categoryData.data,
        backgroundColor: categoryData.colors,
        borderColor: categoryData.borderColors,
        borderWidth: 1
      }]
    }
  }
  
  // 创建新图表
  chartInstance.value = new Chart(chartContext, {
    type: type === 'pie' ? 'pie' : type,
    data: chartData,
    options
  })
}

// 切换图表类型
const switchChartType = () => {
  const { months, incomeData, expenseData } = getDataByPeriod(chartPeriod.value)
  
  const data = {
    labels: months,
    datasets: [
      {
        label: '收入',
        data: incomeData,
        borderColor: '#67C23A',
        backgroundColor: type => type === 'line' ? 'rgba(103, 194, 58, 0.1)' : 'rgba(103, 194, 58, 0.7)',
        tension: 0.4,
        fill: chartType.value === 'line'
      },
      {
        label: '支出',
        data: expenseData,
        borderColor: '#F56C6C',
        backgroundColor: type => type === 'line' ? 'rgba(245, 108, 108, 0.1)' : 'rgba(245, 108, 108, 0.7)',
        tension: 0.4,
        fill: chartType.value === 'line'
      }
    ]
  }
  
  renderChart(data, chartType.value)
}

// 更新图表
const updateChart = () => {
  if (!chartRef.value) return
  
  // 获取数据
  const { months, incomeData, expenseData } = getDataByPeriod(chartPeriod.value)
  
  // 周期变化时，总收入和总支出会通过periodFinancialData计算属性自动更新
  
  const data = {
    labels: months,
    datasets: [
      {
        label: '收入',
        data: incomeData,
        borderColor: '#67C23A',
        backgroundColor: chartType.value === 'line' ? 'rgba(103, 194, 58, 0.1)' : 'rgba(103, 194, 58, 0.7)',
        tension: 0.4,
        fill: chartType.value === 'line'
      },
      {
        label: '支出',
        data: expenseData,
        borderColor: '#F56C6C',
        backgroundColor: chartType.value === 'line' ? 'rgba(245, 108, 108, 0.1)' : 'rgba(245, 108, 108, 0.7)',
        tension: 0.4,
        fill: chartType.value === 'line'
      }
    ]
  }
  
  renderChart(data, chartType.value)
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
      
      &.clickable {
        cursor: pointer;
        
        &:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
        }
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
        
        &.sales {
          background: linear-gradient(135deg, #E6A23C, #EEBE77);
        }
        
        &.inventory {
          background: linear-gradient(135deg, #67C23A, #85CE61);
        }
        
        &.logistics {
          background: linear-gradient(135deg, #409EFF, #66B1FF);
        }
        
        &.budget {
          background: linear-gradient(135deg, #909399, #B1B3B8);
        }
        
        &.expense {
          background: linear-gradient(135deg, #F56C6C, #F78989);
        }
        
        &.assets {
          background: linear-gradient(135deg, #E6A23C, #EEBE77);
        }
        
        &.net {
          background: linear-gradient(135deg, #409EFF, #66B1FF);
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
          margin-bottom: 4px;
        }
        
        .stat-detail {
          font-size: 12px;
          color: #C0C4CC;
          margin-bottom: 8px;
          line-height: 1.2;
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
      
      .card-header {
        .chart-controls {
          display: flex;
          gap: 10px;
          
          .chart-type-selector,
          .chart-period-selector {
            margin-left: 10px;
          }
        }
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