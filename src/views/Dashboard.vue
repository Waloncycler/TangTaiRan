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
            <div class="stat-value">{{ dataStore.inventoryStats?.total || 0 }}</div>
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
            <div class="stat-value">{{ logisticsStats?.total || 0 }}</div>
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
      <!-- 收入支出趋势图 -->
      <el-col :xs="24" :lg="16">
        <el-card class="chart-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span class="card-title">收入支出趋势</span>
              <span class="card-subtitle">最近6个月数据对比</span>
            </div>
          </template>
          <div class="chart-container">
            <canvas ref="trendChartRef" width="400" height="200"></canvas>
          </div>
        </el-card>
      </el-col>
      
      <!-- 收入分类分布 -->
      <el-col :xs="24" :lg="8">
        <el-card class="chart-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span class="card-title">收入分类</span>
              <span class="card-subtitle">按来源分布</span>
            </div>
          </template>
          <div class="chart-container">
            <canvas ref="incomeChartRef" width="300" height="300"></canvas>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-row :gutter="20" class="charts-row">
      <!-- 支出分类分布 -->
      <el-col :xs="24" :lg="8">
        <el-card class="chart-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span class="card-title">支出分类</span>
              <span class="card-subtitle">按类型分布</span>
            </div>
          </template>
          <div class="chart-container">
            <canvas ref="expenseChartRef" width="300" height="300"></canvas>
          </div>
        </el-card>
      </el-col>
      
      <!-- 财务概览 -->
      <el-col :xs="24" :lg="16">
        <el-card class="chart-card" shadow="hover">
          <template #header>
            <div class="card-header">
              <span class="card-title">财务概览</span>
              <span class="card-subtitle">{{ getPeriodLabel() }}数据汇总</span>
            </div>
          </template>
          <div class="financial-overview">
            <div class="overview-item">
              <div class="overview-label">净收益</div>
              <div class="overview-value" :class="periodFinancialData.totalIncome - periodFinancialData.totalExpenses >= 0 ? 'positive' : 'negative'">
                {{ formatCurrency(periodFinancialData.totalIncome - periodFinancialData.totalExpenses) }}
              </div>
            </div>
            <div class="overview-item">
              <div class="overview-label">收支比</div>
              <div class="overview-value">
                {{ periodFinancialData.totalExpenses > 0 ? (periodFinancialData.totalIncome / periodFinancialData.totalExpenses).toFixed(2) : '∞' }}
              </div>
            </div>
            <div class="overview-item">
              <div class="overview-label">平均日收入</div>
              <div class="overview-value">
                {{ formatCurrency(periodFinancialData.totalIncome / 30) }}
              </div>
            </div>
            <div class="overview-item">
              <div class="overview-label">平均日支出</div>
              <div class="overview-value">
                {{ formatCurrency(periodFinancialData.totalExpenses / 30) }}
              </div>
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
          <div>
            <el-button type="success" size="small" @click="openAddTransactionDialog">
              <el-icon><Plus /></el-icon>添加交易
            </el-button>
            <el-button type="primary" link @click="$router.push('/transactions')">
              查看全部
            </el-button>
          </div>
        </div>
      </template>
      <el-table :data="recentTransactions" style="width: 100%; padding-left: 0; margin-left: 0;" stripe>
        <el-table-column label="日期" width="300">
          <template #default="{ row }">
            {{ formatDate(row.date) }}
          </template>
        </el-table-column>
        <el-table-column prop="category" label="分类" width="300">
          <template #default="{ row }">
            {{ getCategoryName(row.category, row.type) }}
          </template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="300">
          <template #default="{ row }">
            <el-tag :type="row.type === 'income' ? 'success' : 'danger'" size="small">
              {{ row.type === 'income' ? '收入' : '支出' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="amount" label="金额" width="300">
          <template #default="{ row }">
            <span :class="row.type === 'income' ? 'amount-income' : 'amount-expense'">
              {{ formatCurrency(row.amount) }}
            </span>
          </template>
        </el-table-column>
        <el-table-column prop="note" label="备注" min-width="300" show-overflow-tooltip />
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

// 添加交易对话框显示状态
const showAddTransaction = ref(false)

// 注册 Chart.js 组件
Chart.register(...registerables)

const dataStore = useDataStore()
const router = useRouter()
const chartRef = ref()
const chartInstance = ref(null)
const chartType = ref('line')
const chartPeriod = ref('year')

// 图表引用
const trendChartRef = ref()
const incomeChartRef = ref()
const expenseChartRef = ref()

// 图表实例
const trendChartInstance = ref(null)
const incomeChartInstance = ref(null)
const expenseChartInstance = ref(null)

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
  
  // 计算同比变化率（与上一个相同周期比较）
  let previousPeriodTransactions = [];
  
  if (currentPeriod === 'month') {
    // 上个月的数据
    previousPeriodTransactions = transactions.filter(t => {
      const transactionDate = dayjs(t.date);
      return transactionDate.isAfter(dayjs().subtract(2, 'month')) && 
             transactionDate.isBefore(dayjs().subtract(1, 'month'));
    });
  } else if (currentPeriod === 'quarter') {
    // 上个季度的数据
    previousPeriodTransactions = transactions.filter(t => {
      const transactionDate = dayjs(t.date);
      return transactionDate.isAfter(dayjs().subtract(6, 'month')) && 
             transactionDate.isBefore(dayjs().subtract(3, 'month'));
    });
  } else if (currentPeriod === 'year') {
    // 去年同期的数据
    previousPeriodTransactions = transactions.filter(t => {
      const transactionDate = dayjs(t.date);
      return transactionDate.isAfter(dayjs().subtract(2, 'year')) && 
             transactionDate.isBefore(dayjs().subtract(1, 'year'));
    });
  } else {
    // 全部周期时，比较前半年和后半年
    const halfPoint = Math.floor(transactions.length / 2);
    previousPeriodTransactions = transactions.slice(0, halfPoint);
  }
  
  // 计算上一周期的收入和支出
  const previousIncome = previousPeriodTransactions
    .filter(t => t.type === 'income')
    .reduce((sum, t) => sum + t.amount, 0);
    
  const previousExpenses = previousPeriodTransactions
    .filter(t => t.type === 'expense')
    .reduce((sum, t) => sum + t.amount, 0);
  
  // 计算变化率
  incomeChange = previousIncome > 0 ? 
    ((totalIncome - previousIncome) / previousIncome) * 100 : 
    (totalIncome > 0 ? 100 : 0);
    
  expenseChange = previousExpenses > 0 ? 
    ((totalExpenses - previousExpenses) / previousExpenses) * 100 : 
    (totalExpenses > 0 ? 100 : 0);
  
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

// 格式化日期为年月日
const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

// 获取分类名称
const getCategoryName = (category, type = null) => {
  // 收入分类
  const incomeCategories = {
    'self_employed': '自营',  
    'online_store': '网店',
    'live_streaming': '直播',
    'agency': '代理',
    'other': '其它'
  }
  
  // 支出分类
  const expenseCategories = {
    'purchase': '进货',
    'salary': '员工工资',
    'rent_utilities': '房租水电',
    'other': '其它支出'
  }
  
  // 如果指定了类型，使用对应的分类映射
  if (type === 'income') {
    return incomeCategories[category] || category
  } else if (type === 'expense') {
    return expenseCategories[category] || category
  }
  
  // 兼容旧版本，先尝试收入分类，再尝试支出分类
  return incomeCategories[category] || expenseCategories[category] || category
}

// 获取变化样式类
const getChangeClass = (change) => {
  return change >= 0 ? 'positive' : 'negative'
}

// 计算最近6个月的收入支出趋势数据
const monthlyTrendData = computed(() => {
  const months = [];
  const incomeData = [];
  const expenseData = [];
  
  // 生成最近6个月的数据
  for (let i = 5; i >= 0; i--) {
    const month = dayjs().subtract(i, 'month');
    const monthStr = month.format('YYYY-MM');
    months.push(month.format('MM月'));
    
    // 计算该月的收入和支出
    const monthTransactions = dataStore.transactions.filter(t => {
      return dayjs(t.date).format('YYYY-MM') === monthStr;
    });
    
    const monthIncome = monthTransactions
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0);
      
    const monthExpense = monthTransactions
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0);
    
    incomeData.push(monthIncome);
    expenseData.push(monthExpense);
  }
  
  return {
    labels: months,
    datasets: [
      {
        label: '收入',
        data: incomeData,
        borderColor: '#67C23A',
        backgroundColor: 'rgba(103, 194, 58, 0.1)',
        tension: 0.4
      },
      {
        label: '支出',
        data: expenseData,
        borderColor: '#F56C6C',
        backgroundColor: 'rgba(245, 108, 108, 0.1)',
        tension: 0.4
      }
    ]
  };
});

// 检查是否有收入数据
const hasIncomeData = computed(() => {
  const incomeTransactions = dataStore.transactions.filter(t => t.type === 'income');
  return incomeTransactions.length > 0;
});

// 检查是否有支出数据
const hasExpenseData = computed(() => {
  const expenseTransactions = dataStore.transactions.filter(t => t.type === 'expense');
  return expenseTransactions.length > 0;
});

// 计算收入分类饼图数据
const incomeDistributionData = computed(() => {
  const incomeTransactions = dataStore.transactions.filter(t => t.type === 'income');
  const categoryTotals = {};
  
  incomeTransactions.forEach(t => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
  });
  
  const labels = Object.keys(categoryTotals).map(cat => getCategoryName(cat, 'income'));
  const data = Object.values(categoryTotals);
  const colors = ['#409EFF', '#67C23A', '#E6A23C', '#F56C6C', '#909399'];
  
  return {
    labels,
    datasets: [{
      data,
      backgroundColor: colors.slice(0, labels.length),
      borderWidth: 2,
      borderColor: '#fff'
    }]
  };
});

// 计算支出分类饼图数据
const expenseDistributionData = computed(() => {
  const expenseTransactions = dataStore.transactions.filter(t => t.type === 'expense');
  const categoryTotals = {};
  
  expenseTransactions.forEach(t => {
    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
  });
  
  const labels = Object.keys(categoryTotals).map(cat => getCategoryName(cat, 'expense'));
  const data = Object.values(categoryTotals);
  const colors = ['#F56C6C', '#E6A23C', '#909399', '#C0C4CC', '#A0CFFF'];
  
  return {
    labels,
    datasets: [{
      data,
      backgroundColor: colors.slice(0, labels.length),
      borderWidth: 2,
      borderColor: '#fff'
    }]
  };
});


// 初始化趋势图表
const initTrendChart = () => {
  if (trendChartRef.value && monthlyTrendData.value) {
    const ctx = trendChartRef.value.getContext('2d')
    
    if (trendChartInstance.value) {
      trendChartInstance.value.destroy()
    }
    
    trendChartInstance.value = new Chart(ctx, {
      type: 'line',
      data: monthlyTrendData.value,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: {
              generateLabels: function(chart) {
                const datasets = chart.data.datasets;
                const labels = [];
                
                datasets.forEach((dataset, i) => {
                  // 计算每个数据集的最新值（最后一个非空值）
                  let latestValue = 0;
                  for (let j = dataset.data.length - 1; j >= 0; j--) {
                    if (dataset.data[j] !== null && dataset.data[j] !== undefined) {
                      latestValue = dataset.data[j];
                      break;
                    }
                  }
                  
                  labels.push({
                    text: `${dataset.label}: ${formatCurrency(latestValue)}`,
                    fillStyle: dataset.borderColor,
                    strokeStyle: dataset.borderColor,
                    lineWidth: 2,
                    hidden: dataset.hidden,
                    index: i,
                    datasetIndex: i
                  });
                });
                
                return labels;
              }
            }
          },
          tooltip: {
            enabled: true,
            callbacks: {
              label: function(context) {
                return context.dataset.label + ': ' + formatCurrency(context.parsed.y)
              }
            }
          },
          datalabels: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function(value) {
                return ''  // 不显示Y轴刻度值
              }
            }
          }
        }
      }
    })
  }
}

// 初始化收入饼图
const initIncomeChart = () => {
  if (incomeChartRef.value && incomeDistributionData.value) {
    const ctx = incomeChartRef.value.getContext('2d')
    
    if (incomeChartInstance.value) {
      incomeChartInstance.value.destroy()
    }
    
    incomeChartInstance.value = new Chart(ctx, {
      type: 'doughnut',
      data: incomeDistributionData.value,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              generateLabels: function(chart) {
                const data = chart.data;
                if (data.labels.length && data.datasets.length) {
                  const dataset = data.datasets[0];
                  const total = dataset.data.reduce((a, b) => a + b, 0);
                  
                  return data.labels.map(function(label, i) {
                    const value = dataset.data[i];
                    const percentage = ((value / total) * 100).toFixed(1);
                    return {
                      text: `${label}: ${formatCurrency(value)} (${percentage}%)`,
                      fillStyle: dataset.backgroundColor[i],
                      hidden: false,
                      index: i,
                      datasetIndex: 0
                    };
                  });
                }
                return [];
              }
            }
          },
          tooltip: {
            enabled: true,
            mode: 'nearest',
            intersect: true,
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.raw || 0;
                const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: ${formatCurrency(value)} (${percentage}%)`;
              }
            }
          },
          datalabels: {
            display: false
          }
        }
      }
    })
  }
}

// 初始化支出饼图
const initExpenseChart = () => {
  if (expenseChartRef.value && expenseDistributionData.value) {
    const ctx = expenseChartRef.value.getContext('2d')
    
    if (expenseChartInstance.value) {
      expenseChartInstance.value.destroy()
    }
    
    expenseChartInstance.value = new Chart(ctx, {
      type: 'doughnut',
      data: expenseDistributionData.value,
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              generateLabels: function(chart) {
                const data = chart.data;
                if (data.labels.length && data.datasets.length) {
                  const dataset = data.datasets[0];
                  const total = dataset.data.reduce((a, b) => a + b, 0);
                  
                  return data.labels.map(function(label, i) {
                    const value = dataset.data[i];
                    const percentage = ((value / total) * 100).toFixed(1);
                    return {
                      text: `${label}: ${formatCurrency(value)} (${percentage}%)`,
                      fillStyle: dataset.backgroundColor[i],
                      hidden: false,
                      index: i,
                      datasetIndex: 0
                    };
                  });
                }
                return [];
              }
            }
          },
          tooltip: {
            enabled: true,
            mode: 'nearest',
            intersect: true,
            callbacks: {
              label: function(context) {
                const label = context.label || '';
                const value = context.raw || 0;
                const total = context.chart.data.datasets[0].data.reduce((a, b) => a + b, 0);
                const percentage = ((value / total) * 100).toFixed(1);
                return `${label}: ${formatCurrency(value)} (${percentage}%)`;
              }
            }
          },
          datalabels: {
            display: false
          }
        }
      }
    })
  }
}

// 初始化所有图表
const initAllCharts = () => {
  initTrendChart()
  initIncomeChart()
  initExpenseChart()
}

// 打开添加交易对话框
const openAddTransactionDialog = () => {
  showAddTransaction.value = true
}

// 处理交易添加成功
const handleTransactionAdded = () => {
  // 刷新数据和图表
  console.log('交易添加成功')
  nextTick(() => {
    initAllCharts()
  })
}

onMounted(async () => {
  await nextTick()
  initAllCharts()
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
      
      .financial-overview {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 20px;
        padding: 20px 0;
        
        .overview-item {
          text-align: center;
          padding: 16px;
          background: var(--el-fill-color-lighter);
          border-radius: 8px;
          
          .overview-label {
            font-size: 14px;
            color: var(--el-text-color-regular);
            margin-bottom: 8px;
          }
          
          .overview-value {
            font-size: 20px;
            font-weight: 600;
            color: var(--el-text-color-primary);
            
            &.positive {
              color: var(--el-color-success);
            }
            
            &.negative {
              color: var(--el-color-danger);
            }
          }
        }
      }
      
      .card-header {
        .card-title {
          font-size: 16px;
          font-weight: 600;
          color: var(--el-text-color-primary);
        }
        
        .card-subtitle {
          font-size: 12px;
          color: var(--el-text-color-regular);
          margin-left: 8px;
        }
        
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