<template>
  <div class="sales-container">
    <!-- 页面标题和操作栏 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">
          <el-icon><TrendCharts /></el-icon>
          销售统计
        </h1>
        <p class="page-subtitle">代理销售追踪 · 团队管理 · 销量统计分析</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" :icon="Plus" @click="showAddSaleDialog = true">
          添加销售记录
        </el-button>
        <el-button type="success" :icon="Plus" @click="showAddAgentDialog = true">
          添加代理
        </el-button>
      </div>
    </div>

    <!-- 筛选条件 -->
    <el-card class="filter-card" shadow="never">
      <div class="filter-row">
        <div class="filter-item">
          <label>时间范围：</label>
          <el-date-picker
            v-model="dateRange"
            type="daterange"
            range-separator="至"
            start-placeholder="开始日期"
            end-placeholder="结束日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            @change="handleDateRangeChange"
          />
        </div>
        <div class="filter-item">
          <label>代理级别：</label>
          <el-select v-model="filters.agentLevel" placeholder="选择级别" clearable>
            <el-option label="州总代理" value="1" />
            <el-option label="城市代理" value="2" />
            <el-option label="团队长" value="3" />
            <el-option label="销售员" value="4" />
          </el-select>
        </div>
        <div class="filter-item">
          <label>州属：</label>
          <el-select v-model="filters.region" placeholder="选择州属" clearable>
            <el-option label="Sarawak" value="Sarawak" />
            <el-option label="Sabah" value="Sabah" />
            <el-option label="Kuala Lumpur" value="Kuala Lumpur" />
            <el-option label="Selangor" value="Selangor" />
            <el-option label="Penang" value="Penang" />
            <el-option label="Johor" value="Johor" />
          </el-select>
        </div>
        <div class="filter-actions">
          <el-button @click="resetFilters">重置</el-button>
          <el-button type="primary" @click="applyFilters">筛选</el-button>
        </div>
      </div>
    </el-card>

    <!-- 统计概览卡片 -->
    <div class="stats-overview">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon total-sales">
                <el-icon><ShoppingCart /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ salesStatistics.total.totalSales }}</div>
                <div class="stat-label">总销售订单</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon total-amount">
                <el-icon><Money /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">¥{{ formatNumber(salesStatistics.total.totalAmount) }}</div>
                <div class="stat-label">总销售金额</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon total-quantity">
                <el-icon><Box /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ salesStatistics.total.totalQuantity }}</div>
                <div class="stat-label">总销售数量</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon total-agents">
                <el-icon><User /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ Object.keys(salesStore.agents).length }}</div>
                <div class="stat-label">代理总数</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 主要内容区域 -->
    <el-row :gutter="20" class="main-content-row">
      <!-- 左侧：团队结构和排行榜 -->
      <el-col :span="10">
        <!-- 团队结构树 -->
        <el-card class="team-tree-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">
                <el-icon><Share /></el-icon>
                团队结构
              </span>
            </div>
          </template>
          <div class="team-tree-container">
            <el-tree
              :data="teamTree"
              :props="treeProps"
              node-key="id"
              :expand-on-click-node="false"
              :default-expand-all="true"
              @node-click="handleNodeClick"
            >
              <template #default="{ node, data }">
                <div class="tree-node">
                  <div class="node-info">
                    <el-avatar :size="24" class="node-avatar">
                      {{ data.name.charAt(0) }}
                    </el-avatar>
                    <span class="node-name">{{ data.name }}</span>
                    <el-tag :type="getLevelTagType(data.level)" size="small">
                      {{ salesStore.getAgentLevelName(data.level) }}
                    </el-tag>
                  </div>
                  <div class="node-stats">
                    <span class="stat-item">销量: {{ getAgentSalesCount(data.id) }}</span>
                  </div>
                </div>
              </template>
            </el-tree>
          </div>
        </el-card>

        <!-- 销售排行榜 -->
        <el-card class="ranking-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">
                <el-icon><Trophy /></el-icon>
                销售排行榜
              </span>
              <el-radio-group v-model="rankingType" size="small">
                <el-radio-button label="amount">按金额</el-radio-button>
                <el-radio-button label="quantity">按数量</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div class="ranking-list">
            <div 
              v-for="(agent, index) in sortedRanking.slice(0, 5)" 
              :key="agent.id" 
              class="ranking-item"
              :class="{ 'top-three': index < 3 }"
            >
              <div class="rank-number">
                <el-icon v-if="index === 0" class="gold"><Trophy /></el-icon>
                <el-icon v-else-if="index === 1" class="silver"><Medal /></el-icon>
                <el-icon v-else-if="index === 2" class="bronze"><Medal /></el-icon>
                <span v-else class="rank-text">{{ index + 1 }}</span>
              </div>
              <el-avatar :size="28" class="agent-avatar">
                {{ agent.name.charAt(0) }}
              </el-avatar>
              <div class="agent-info">
                <div class="agent-name">{{ agent.name }}</div>
                <div class="agent-level">{{ salesStore.getAgentLevelName(agent.level) }}</div>
              </div>
              <div class="agent-stats">
                <div class="stat-value">
                  {{ rankingType === 'amount' ? '¥' + formatNumber(agent.totalAmount) : agent.totalQuantity + '件' }}
                </div>
                <div class="stat-label">
                  {{ rankingType === 'amount' ? '销售金额' : '销售数量' }}
                </div>
              </div>
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 右侧：销售趋势图表 -->
      <el-col :span="14">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">
                <el-icon><TrendCharts /></el-icon>
                销售趋势分析
              </span>
              <div class="chart-actions">
                <el-radio-group v-model="chartType" size="small">
                  <el-radio-button label="line">趋势图</el-radio-button>
                  <el-radio-button label="bar">柱状图</el-radio-button>
                </el-radio-group>
              </div>
            </div>
          </template>
          <div class="chart-container">
            <canvas ref="salesChartRef" width="400" height="300"></canvas>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 销售记录表格 -->
    <el-card class="table-card">
      <template #header>
        <div class="card-header">
          <span class="card-title">
            <el-icon><Document /></el-icon>
            销售记录
          </span>
          <div class="header-actions">
            <el-input
              v-model="searchKeyword"
              placeholder="搜索客户姓名或代理姓名"
              :prefix-icon="Search"
              style="width: 200px; margin-right: 10px;"
            />
            <el-button :icon="Download" @click="exportData">导出</el-button>
          </div>
        </div>
      </template>
      <el-table :data="filteredSalesRecords" stripe>
        <el-table-column prop="saleDate" label="销售日期" width="120" />
        <el-table-column label="代理信息" width="150">
          <template #default="{ row }">
            <div class="agent-cell">
              <div>{{ getAgentName(row.agentId) }}</div>
              <el-tag size="small" :type="getLevelTagType(getAgentLevel(row.agentId))">
                {{ salesStore.getAgentLevelName(getAgentLevel(row.agentId)) }}
              </el-tag>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="productName" label="产品名称" />
        <el-table-column prop="quantity" label="数量" width="80" />
        <el-table-column label="单价" width="100">
          <template #default="{ row }">
            ¥{{ row.unitPrice }}
          </template>
        </el-table-column>
        <el-table-column label="总金额" width="120">
          <template #default="{ row }">
            <span class="amount-text">¥{{ formatNumber(row.totalAmount) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="customerName" label="客户姓名" width="120" />
        <el-table-column prop="region" label="州属" width="100" />
        <el-table-column label="状态" width="80">
          <template #default="{ row }">
            <el-tag :type="row.status === 'completed' ? 'success' : 'warning'">
              {{ row.status === 'completed' ? '已完成' : '进行中' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="120" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="editSaleRecord(row)">编辑</el-button>
            <el-button size="small" type="danger" @click="deleteSaleRecord(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!-- 添加销售记录对话框 -->
    <el-dialog v-model="showAddSaleDialog" title="添加销售记录" width="600px">
      <el-form :model="saleForm" :rules="saleRules" ref="saleFormRef" label-width="100px">
        <el-form-item label="销售代理" prop="agentId">
          <el-select v-model="saleForm.agentId" placeholder="选择销售代理" style="width: 100%">
            <el-option
              v-for="agent in Object.values(salesStore.agents)"
              :key="agent.id"
              :label="`${agent.name} (${salesStore.getAgentLevelName(agent.level)})`"
              :value="agent.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="产品名称" prop="productName">
          <el-input v-model="saleForm.productName" placeholder="请输入产品名称" />
        </el-form-item>
        <el-form-item label="销售数量" prop="quantity">
          <el-input-number v-model="saleForm.quantity" :min="1" style="width: 100%" />
        </el-form-item>
        <el-form-item label="单价" prop="unitPrice">
          <el-input-number v-model="saleForm.unitPrice" :min="0" :precision="2" style="width: 100%" />
        </el-form-item>
        <el-form-item label="客户姓名" prop="customerName">
          <el-input v-model="saleForm.customerName" placeholder="请输入客户姓名" />
        </el-form-item>
        <el-form-item label="客户电话" prop="customerPhone">
          <el-input v-model="saleForm.customerPhone" placeholder="请输入客户电话" />
        </el-form-item>
        <el-form-item label="销售日期" prop="saleDate">
          <el-date-picker
            v-model="saleForm.saleDate"
            type="date"
            placeholder="选择销售日期"
            format="YYYY-MM-DD"
            value-format="YYYY-MM-DD"
            style="width: 100%"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddSaleDialog = false">取消</el-button>
        <el-button type="primary" @click="submitSaleForm">确定</el-button>
      </template>
    </el-dialog>

    <!-- 添加代理对话框 -->
    <el-dialog v-model="showAddAgentDialog" title="添加代理" width="600px">
      <el-form :model="agentForm" :rules="agentRules" ref="agentFormRef" label-width="100px">
        <el-form-item label="代理姓名" prop="name">
          <el-input v-model="agentForm.name" placeholder="请输入代理姓名" />
        </el-form-item>
        <el-form-item label="代理级别" prop="level">
          <el-select v-model="agentForm.level" placeholder="选择代理级别" style="width: 100%">
            <el-option label="州总代理" :value="1" />
            <el-option label="城市代理" :value="2" />
            <el-option label="团队长" :value="3" />
            <el-option label="销售员" :value="4" />
          </el-select>
        </el-form-item>
        <el-form-item label="上级代理" prop="parentId">
          <el-select v-model="agentForm.parentId" placeholder="选择上级代理" clearable style="width: 100%">
            <el-option
              v-for="agent in Object.values(salesStore.agents)"
              :key="agent.id"
              :label="`${agent.name} (${salesStore.getAgentLevelName(agent.level)})`"
              :value="agent.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item label="手机号码" prop="phone">
          <el-input v-model="agentForm.phone" placeholder="请输入手机号码" />
        </el-form-item>
        <el-form-item label="邮箱" prop="email">
          <el-input v-model="agentForm.email" placeholder="请输入邮箱" />
        </el-form-item>
        <el-form-item label="州属" prop="region">
          <el-select v-model="agentForm.region" placeholder="选择州属" style="width: 100%">
            <el-option label="Sarawak" value="Sarawak" />
            <el-option label="Sabah" value="Sabah" />
            <el-option label="Kuala Lumpur" value="Kuala Lumpur" />
            <el-option label="Selangor" value="Selangor" />
            <el-option label="Penang" value="Penang" />
            <el-option label="Johor" value="Johor" />
          </el-select>
        </el-form-item>
        <el-form-item label="城市" prop="city">
          <el-input v-model="agentForm.city" placeholder="请输入城市" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddAgentDialog = false">取消</el-button>
        <el-button type="primary" @click="submitAgentForm">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, nextTick } from 'vue'
import { useSalesStore } from '@/stores/sales'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  TrendCharts, Plus, ShoppingCart, Money, Box, User,
  Share, Trophy, Medal, Document, Search, Download
} from '@element-plus/icons-vue'
import { Chart, registerables } from 'chart.js'

// 注册 Chart.js 组件
Chart.register(...registerables)

// 状态管理
const salesStore = useSalesStore()

// 响应式数据
const dateRange = ref([salesStore.dateRange.start, salesStore.dateRange.end])
const filters = reactive({ ...salesStore.filters })
const searchKeyword = ref('')
const rankingType = ref('amount')
const chartType = ref('line')
const showAddSaleDialog = ref(false)
const showAddAgentDialog = ref(false)
const salesChartRef = ref(null)
const saleFormRef = ref()
const agentFormRef = ref()

// 表单数据
const saleForm = reactive({
  agentId: '',
  productName: 'TangTaiRan小分子肽',
  quantity: 1,
  unitPrice: 299,
  customerName: '',
  customerPhone: '',
  saleDate: new Date().toISOString().split('T')[0]
})

const agentForm = reactive({
  name: '',
  level: 4,
  parentId: '',
  phone: '',
  email: '',
  region: 'Sarawak',
  city: ''
})

// 表单验证规则
const saleRules = {
  agentId: [{ required: true, message: '请选择销售代理', trigger: 'change' }],
  productName: [{ required: true, message: '请输入产品名称', trigger: 'blur' }],
  quantity: [{ required: true, message: '请输入销售数量', trigger: 'blur' }],
  unitPrice: [{ required: true, message: '请输入单价', trigger: 'blur' }],
  customerName: [{ required: true, message: '请输入客户姓名', trigger: 'blur' }],
  customerPhone: [{ required: true, message: '请输入客户电话', trigger: 'blur' }]
}

const agentRules = {
  name: [{ required: true, message: '请输入代理姓名', trigger: 'blur' }],
  level: [{ required: true, message: '请选择代理级别', trigger: 'change' }],
  phone: [{ required: true, message: '请输入手机号码', trigger: 'blur' }],
  email: [{ required: true, message: '请输入邮箱', trigger: 'blur' }],
  region: [{ required: true, message: '请选择地区', trigger: 'change' }],
  city: [{ required: true, message: '请输入城市', trigger: 'blur' }]
}

// 计算属性
const salesStatistics = computed(() => salesStore.getSalesStatistics)
const teamTree = computed(() => salesStore.getTeamTree)
const salesRanking = computed(() => salesStore.getSalesRanking)
const agentList = computed(() => Object.values(salesStore.filteredAgents))

const sortedRanking = computed(() => {
  return [...salesRanking.value].sort((a, b) => {
    if (rankingType.value === 'amount') {
      return b.totalAmount - a.totalAmount
    } else {
      return b.totalQuantity - a.totalQuantity
    }
  })
})

const filteredSalesRecords = computed(() => {
  let records = Object.values(salesStore.filteredSalesRecords)
  
  // 搜索过滤
  if (searchKeyword.value) {
    const keyword = searchKeyword.value.toLowerCase()
    records = records.filter(record => 
      record.customerName.toLowerCase().includes(keyword) ||
      getAgentName(record.agentId).toLowerCase().includes(keyword)
    )
  }
  
  return records.sort((a, b) => new Date(b.saleDate) - new Date(a.saleDate))
})

// 树形组件配置
const treeProps = {
  children: 'children',
  label: 'name'
}

// 方法
const formatNumber = (num) => {
  return num.toLocaleString()
}

const getLevelTagType = (level) => {
  const types = { 1: 'danger', 2: 'warning', 3: 'info', 4: 'success' }
  return types[level] || ''
}

const getAgentName = (agentId) => {
  return salesStore.agents[agentId]?.name || '未知代理'
}

const getAgentLevel = (agentId) => {
  return salesStore.agents[agentId]?.level || 0
}

const getAgentSalesCount = (agentId) => {
  return salesStore.getAgentSales(agentId).length
}

const handleDateRangeChange = (dates) => {
  if (dates && dates.length === 2) {
    salesStore.setDateRange(dates[0], dates[1])
  }
}

const resetFilters = () => {
  Object.assign(filters, {
    region: '',
    city: '',
    agentLevel: '',
    status: 'all'
  })
  salesStore.resetFilters()
}

const applyFilters = () => {
  salesStore.setFilters(filters)
}

const handleNodeClick = (data) => {
  console.log('选中代理:', data)
}

const submitSaleForm = async () => {
  try {
    await saleFormRef.value.validate()
    const totalAmount = saleForm.quantity * saleForm.unitPrice
    const agent = salesStore.agents[saleForm.agentId]
    
    salesStore.addSaleRecord({
      ...saleForm,
      totalAmount,
      region: agent.region,
      city: agent.city
    })
    
    showAddSaleDialog.value = false
    resetSaleForm()
  } catch (error) {
    console.error('表单验证失败:', error)
  }
}

const submitAgentForm = async () => {
  try {
    await agentFormRef.value.validate()
    salesStore.addAgent(agentForm)
    showAddAgentDialog.value = false
    resetAgentForm()
  } catch (error) {
    console.error('表单验证失败:', error)
  }
}

const resetSaleForm = () => {
  Object.assign(saleForm, {
    agentId: '',
    productName: 'TangTaiRan小分子肽',
    quantity: 1,
    unitPrice: 299,
    customerName: '',
    customerPhone: '',
    saleDate: new Date().toISOString().split('T')[0]
  })
}

const resetAgentForm = () => {
  Object.assign(agentForm, {
    name: '',
    level: 4,
    parentId: '',
    phone: '',
    email: '',
    region: 'Sarawak',
    city: ''
  })
}

const editSaleRecord = (record) => {
  Object.assign(saleForm, record)
  showAddSaleDialog.value = true
}

const deleteSaleRecord = async (saleId) => {
  try {
    await ElMessageBox.confirm('确定要删除这条销售记录吗？', '确认删除', {
      type: 'warning'
    })
    salesStore.deleteSaleRecord(saleId)
  } catch {
    // 用户取消删除
  }
}

const exportData = () => {
  ElMessage.info('导出功能开发中...')
}

// 初始化销售趋势图表
const initSalesChart = () => {
  if (!salesChartRef.value) return
  
  const ctx = salesChartRef.value.getContext('2d')
  const monthlyStats = salesStatistics.value.monthly
  
  const labels = Object.keys(monthlyStats).sort()
  const data = labels.map(month => monthlyStats[month].amount)
  
  new Chart(ctx, {
    type: 'line',
    data: {
      labels: labels,
      datasets: [{
        label: '销售金额',
        data: data,
        borderColor: '#409EFF',
        backgroundColor: 'rgba(64, 158, 255, 0.1)',
        tension: 0.4,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: {
        y: {
          beginAtZero: true,
          ticks: {
            callback: function(value) {
              return '¥' + value.toLocaleString()
            }
          }
        }
      },
      plugins: {
        legend: {
          display: false
        }
      }
    }
  })
}

// 生命周期
onMounted(() => {
  nextTick(() => {
    initSalesChart()
  })
})
</script>

<style lang="scss" scoped>
.sales-container {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: calc(100vh - 60px);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  
  .header-left {
    .page-title {
      display: flex;
      align-items: center;
      gap: 8px;
      font-size: 24px;
      font-weight: 600;
      color: #303133;
      margin: 0 0 8px 0;
    }
    
    .page-subtitle {
      color: #909399;
      margin: 0;
    }
  }
  
  .header-actions {
    display: flex;
    gap: 12px;
  }
}

.filter-card {
  margin-bottom: 20px;
  
  .filter-row {
    display: flex;
    align-items: center;
    gap: 20px;
    flex-wrap: wrap;
    
    .filter-item {
      display: flex;
      align-items: center;
      gap: 8px;
      
      label {
        font-weight: 500;
        color: #606266;
        white-space: nowrap;
      }
    }
    
    .filter-actions {
      margin-left: auto;
      display: flex;
      gap: 8px;
    }
  }
}

.stats-overview {
  margin-bottom: 20px;
  
  .stat-card {
    .stat-content {
      display: flex;
      align-items: center;
      gap: 16px;
      
      .stat-icon {
        width: 48px;
        height: 48px;
        border-radius: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 24px;
        color: white;
        
        &.total-sales {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        &.total-amount {
          background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
        }
        
        &.total-quantity {
          background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
        }
        
        &.total-agents {
          background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
        }
      }
      
      .stat-info {
        .stat-value {
          font-size: 24px;
          font-weight: 600;
          color: #303133;
          line-height: 1;
        }
        
        .stat-label {
          font-size: 14px;
          color: #909399;
          margin-top: 4px;
        }
      }
    }
  }
}

.main-content-row {
  margin-bottom: 20px;
}

.team-tree-card {
  height: 350px;
  margin-bottom: 20px;
  
  .team-tree-container {
    height: 270px;
    overflow-y: auto;
    
    .tree-node {
      display: flex;
      align-items: center;
      justify-content: space-between;
      width: 100%;
      padding: 6px 0;
      
      .node-info {
        display: flex;
        align-items: center;
        gap: 8px;
        
        .node-avatar {
          background: #409EFF;
          color: white;
          font-size: 12px;
        }
        
        .node-name {
          font-weight: 500;
          font-size: 14px;
        }
      }
      
      .node-stats {
        .stat-item {
          font-size: 12px;
          color: #909399;
        }
      }
    }
  }
}

.ranking-card {
  height: 350px;
  
  .ranking-list {
    height: 270px;
    overflow-y: auto;
    
    .ranking-item {
      display: flex;
      align-items: center;
      padding: 10px;
      border-radius: 8px;
      margin-bottom: 6px;
      transition: all 0.3s ease;
      
      &:hover {
        background-color: #f5f7fa;
        transform: translateY(-1px);
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      }
      
      &.top-three {
        background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
        
        &:first-child {
          background: linear-gradient(135deg, #ffd89b 0%, #19547b 100%);
          color: white;
        }
      }
      
      .rank-number {
        width: 35px;
        display: flex;
        justify-content: center;
        align-items: center;
        
        .gold {
          color: #FFD700;
          font-size: 18px;
        }
        
        .silver {
          color: #C0C0C0;
          font-size: 16px;
        }
        
        .bronze {
          color: #CD7F32;
          font-size: 14px;
        }
        
        .rank-text {
          font-weight: 600;
          font-size: 14px;
        }
      }
      
      .agent-avatar {
        margin: 0 10px;
        background: #409EFF;
        color: white;
      }
      
      .agent-info {
        flex: 1;
        
        .agent-name {
          font-weight: 500;
          margin-bottom: 2px;
          font-size: 14px;
        }
        
        .agent-level {
          font-size: 11px;
          color: #909399;
        }
      }
      
      .agent-stats {
        text-align: right;
        
        .stat-value {
          font-weight: 600;
          font-size: 14px;
          color: #303133;
        }
        
        .stat-label {
          font-size: 11px;
          color: #909399;
        }
      }
    }
  }
}

.chart-card {
  height: 720px;
  
  .chart-container {
    height: 620px;
    position: relative;
    padding: 20px;
  }
  
  .chart-actions {
    display: flex;
    align-items: center;
  }
}

.table-card {
  margin-top: 20px;
  
  .agent-cell {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }
  
  .amount-text {
    font-weight: 600;
    color: #E6A23C;
  }
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  .card-title {
    display: flex;
    align-items: center;
    gap: 8px;
    font-weight: 600;
  }
  
  .header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }
}

// 响应式设计
@media (max-width: 768px) {
  .sales-container {
    padding: 10px;
  }
  
  .page-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 16px;
  }
  
  .filter-row {
    flex-direction: column;
    align-items: flex-start !important;
    
    .filter-actions {
      margin-left: 0 !important;
      width: 100%;
    }
  }
  
  .stats-overview {
    :deep(.el-col) {
      margin-bottom: 16px;
    }
  }
}
</style>