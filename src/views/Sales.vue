<template>
  <div class="sales-container">
    <!-- 页面标题和操作栏 -->
    <div class="page-header">
      <div class="header-left">
        <h1 class="page-title">
          <el-icon><TrendCharts /></el-icon>
          销售统计
        </h1>
        <p class="page-subtitle">销售数据分析 · 代理管理 · 业绩统计</p>
      </div>
      <div class="header-actions">
        <el-button type="primary" :icon="Plus" @click="showAddSaleDialog = true">
          添加销售记录
        </el-button>
        <el-button type="success" :icon="Refresh" @click="refreshData" :loading="isLoading">
          刷新数据
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
          <label>代理：</label>
          <el-select v-model="selectedAgentId" placeholder="选择代理" clearable filterable>
            <el-option
              v-for="agent in salesStore.flatAgentsList"
              :key="agent._id"
              :label="`${agent.name} (${getAgentLevelName(agent.level)})`"
              :value="agent._id"
            />
          </el-select>
        </div>
        <div class="filter-item">
          <label>支付方式：</label>
          <el-select v-model="selectedPaymentMethod" placeholder="选择支付方式" clearable>
            <el-option label="现金" value="cash" />
            <el-option label="银行转账" value="bank_transfer" />
            <el-option label="支付宝" value="alipay" />
            <el-option label="微信支付" value="wechat" />
            <el-option label="信用卡" value="credit_card" />
          </el-select>
        </div>
        <div class="filter-item">
          <label>支付状态：</label>
          <el-select v-model="selectedPaymentStatus" placeholder="选择支付状态" clearable>
            <el-option label="已支付" value="paid" />
            <el-option label="待支付" value="pending" />
            <el-option label="已取消" value="cancelled" />
          </el-select>
        </div>
        <div class="filter-actions">
          <el-button @click="resetFilters">重置</el-button>
          <el-button type="primary" @click="applyFilters">筛选</el-button>
        </div>
      </div>
    </el-card>

    <!-- 统计概览卡片 -->
    <div class="stats-overview" v-loading="salesStore.salesStatsLoading">
      <el-row :gutter="20">
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon total-sales">
                <el-icon><ShoppingCart /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ salesStatsSummary?.totalOrders || 0 }}</div>
                <div class="stat-label">总订单数</div>
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
                <div class="stat-value">{{ formatCurrency(salesStatsSummary?.totalSales || 0) }}</div>
                <div class="stat-label">总销售金额</div>
              </div>
            </div>
          </el-card>
        </el-col>
        <el-col :span="6">
          <el-card class="stat-card">
            <div class="stat-content">
              <div class="stat-icon average-order">
                <el-icon><Money /></el-icon>
              </div>
              <div class="stat-info">
                <div class="stat-value">{{ formatCurrency(salesStatsSummary?.averageOrderValue || 0) }}</div>
                <div class="stat-label">平均订单金额</div>
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
                <div class="stat-value">{{ salesStore.flatAgentsList?.length || 0 }}</div>
                <div class="stat-label">代理总数</div>
              </div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- 主要内容区域 -->
    <el-row :gutter="20" class="main-content-row">
      <!-- 左侧：代理层级和排行榜 -->
      <el-col :span="10">
        <!-- 代理层级结构 -->
        <el-card class="team-tree-card" v-loading="salesStore.agentsLoading">
          <template #header>
            <div class="card-header">
              <span class="card-title">
                <el-icon><Share /></el-icon>
                代理层级结构
              </span>
            </div>
          </template>
          <div class="team-tree-container">
            <el-tree
              :data="salesStore.agentHierarchy"
              :props="treeProps"
              node-key="_id"
              :expand-on-click-node="false"
              :default-expand-all="true"
              @node-click="handleAgentClick"
            >
              <template #default="{ data }">
                <div class="tree-node">
                  <div class="node-info">
                    <el-avatar :size="28" class="node-avatar">
                      {{ data.name?.charAt(0) || 'A' }}
                    </el-avatar>
                    <div class="node-details">
                      <div class="node-title">
                        <span class="node-name">{{ data.name }}</span>
                        <el-tag :type="getLevelTagType(data.level)" size="small">
                          {{ getAgentLevelName(data.level) }}
                        </el-tag>
                      </div>
                      <div class="node-stats">
                        <span class="stat-item">
                          <el-icon><Phone /></el-icon> 
                          {{ data.phone || '未设置' }}
                        </span>
                        <span class="stat-item">
                          <el-icon><Location /></el-icon> 
                          {{ data.city || '未设置' }}
                        </span>
                      </div>
                    </div>
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
            </div>
          </template>
          <div class="ranking-list" v-loading="salesStore.salesStatsLoading">
            <div 
              v-for="(agent, index) in topAgents" 
              :key="agent._id" 
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
                {{ getAgentName(agent._id)?.charAt(0) || 'A' }}
              </el-avatar>
              <div class="agent-info">
                <div class="agent-name">{{ getAgentName(agent._id) || '未知代理' }}</div>
                <div class="agent-stats">
                  <span class="sales-amount">{{ formatCurrency(agent?.total || 0) }}</span>
                  <span class="sales-count">{{ agent.count }}单</span>
                </div>
              </div>
            </div>
            <div v-if="!(topAgents?.length)" class="no-data">
              暂无销售数据
            </div>
          </div>
        </el-card>
      </el-col>

      <!-- 右侧：图表和数据表格 -->
      <el-col :span="14">
        <!-- 图表区域 -->
        <el-card class="charts-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">
                <el-icon><DataAnalysis /></el-icon>
                销售趋势分析
              </span>
              <el-radio-group v-model="chartType" size="small">
                <el-radio-button label="monthly">月度趋势</el-radio-button>
                <el-radio-button label="payment">支付方式</el-radio-button>
              </el-radio-group>
            </div>
          </template>
          <div class="chart-container" v-loading="salesStore.salesStatsLoading">
            <!-- 月度销售趋势图 -->
            <div v-if="chartType === 'monthly'" class="monthly-chart">
              <div v-if="monthlySalesTrend?.length" class="chart-content">
                <div class="chart-placeholder">
                  <el-icon><DataLine /></el-icon>
                  <p>月度销售趋势图</p>
                  <div class="trend-data">
                    <div v-for="month in monthlySalesTrend" :key="month.month" class="trend-item">
                      <span class="month">{{ month.formattedMonth }}</span>
                      <span class="amount">{{ formatCurrency(month.sales) }}</span>
                      <span class="orders">{{ month.orders }}单</span>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="no-chart-data">
                <el-icon><DataLine /></el-icon>
                <p>暂无月度数据</p>
              </div>
            </div>

            <!-- 支付方式分布图 -->
            <div v-if="chartType === 'payment'" class="payment-chart">
              <div v-if="paymentMethodDistribution?.length" class="chart-content">
                <div class="chart-placeholder">
                  <el-icon><PieChart /></el-icon>
                  <p>支付方式分布</p>
                  <div class="payment-data">
                    <div v-for="method in paymentMethodDistribution" :key="method.method" class="payment-item">
                      <span class="method">{{ getPaymentMethodName(method.method) }}</span>
                      <span class="amount">{{ formatCurrency(method.amount) }}</span>
                      <span class="percentage">{{ method.percentage }}%</span>
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="no-chart-data">
                <el-icon><PieChart /></el-icon>
                <p>暂无支付数据</p>
              </div>
            </div>
          </div>
        </el-card>

        <!-- 销售记录表格 -->
        <el-card class="table-card">
          <template #header>
            <div class="card-header">
              <span class="card-title">
                <el-icon><List /></el-icon>
                销售记录
              </span>
              <div class="table-actions">
                <el-button size="small" @click="exportData">导出数据</el-button>
              </div>
            </div>
          </template>
          <el-table
            :data="salesStore.formattedSalesRecords"
            v-loading="salesStore.salesRecordsLoading"
            stripe
            style="width: 100%"
            @selection-change="handleSelectionChange"
          >
            <el-table-column type="selection" width="55" />
            <el-table-column prop="saleDate" label="销售日期" width="120">
              <template #default="{ row }">
                {{ row.formattedDate }}
              </template>
            </el-table-column>
            <el-table-column prop="agentId" label="代理" width="120">
              <template #default="{ row }">
                {{ getAgentName(row.agentId) || '未知代理' }}
              </template>
            </el-table-column>
            <el-table-column prop="customerName" label="客户" width="120" />
            <el-table-column prop="products" label="产品" min-width="200">
              <template #default="{ row }">
                <div v-if="row.products && row.products?.length">
                  <div v-for="product in row.products" :key="product._id" class="product-item">
                    {{ product.name }} x{{ product.quantity }}
                  </div>
                </div>
                <span v-else>-</span>
              </template>
            </el-table-column>
            <el-table-column prop="totalAmount" label="总金额" width="120">
              <template #default="{ row }">
                {{ row.formattedAmount }}
              </template>
            </el-table-column>
            <el-table-column prop="paymentMethod" label="支付方式" width="100">
              <template #default="{ row }">
                {{ getPaymentMethodName(row.paymentMethod) }}
              </template>
            </el-table-column>
            <el-table-column prop="paymentStatus" label="支付状态" width="100">
              <template #default="{ row }">
                <el-tag :type="getPaymentStatusType(row.paymentStatus)">
                  {{ getPaymentStatusName(row.paymentStatus) }}
                </el-tag>
              </template>
            </el-table-column>
            <el-table-column label="操作" width="200" fixed="right">
              <template #default="{ row }">
                <el-button size="small" type="primary" @click="viewSaleRecord(row)">查看</el-button>
                <el-button size="small" @click="editSaleRecord(row)">编辑</el-button>
                <el-button size="small" type="danger" @click="deleteSaleRecord(row)">删除</el-button>
              </template>
            </el-table-column>
          </el-table>
          
          <!-- 分页 -->
          <div class="pagination-container">
            <el-pagination
              v-model:current-page="currentPage"
              v-model:page-size="pageSize"
              :page-sizes="[10, 20, 50, 100]"
              :total="salesStore.salesRecordsPagination?.total || 0"
              layout="total, sizes, prev, pager, next, jumper"
              @size-change="handleSizeChange"
              @current-change="handleCurrentChange"
            />
          </div>
        </el-card>
      </el-col>
    </el-row>

    <!-- 添加销售记录对话框 -->
    <el-dialog
      v-model="showAddSaleDialog"
      :title="isEditMode ? '编辑销售记录' : '添加销售记录'"
      width="800px"
      :before-close="handleCloseAddSaleDialog"
    >
      <el-form ref="saleFormRef" :model="saleForm" :rules="saleFormRules" label-width="100px">
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="选择代理" prop="agentId">
              <el-select v-model="saleForm.agentId" placeholder="请选择代理" filterable style="width: 100%;">
                <el-option
                  v-for="agent in salesStore.flatAgentsList"
                  :key="agent._id"
                  :label="agent.name"
                  :value="agent._id"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="销售日期" prop="saleDate">
              <el-date-picker
                v-model="saleForm.saleDate"
                type="date"
                placeholder="选择销售日期"
                format="YYYY-MM-DD"
                value-format="YYYY-MM-DD"
                style="width: 100%;"
              />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="客户姓名" prop="customerName">
              <el-input v-model="saleForm.customerName" placeholder="请输入客户姓名" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="客户电话" prop="customerPhone">
              <el-input v-model="saleForm.customerPhone" placeholder="请输入客户电话" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item label="客户地址" prop="customerAddress">
          <el-input v-model="saleForm.customerAddress" placeholder="请输入客户地址" />
        </el-form-item>

        <el-divider>产品信息</el-divider>

        <div v-for="(product, index) in saleForm.products" :key="index" class="product-row">
          <el-row :gutter="10">
            <el-col :span="8">
              <el-form-item :label="`产品 ${index + 1}`" :prop="`products.${index}.name`" :rules="{ required: true, message: '请输入产品名称', trigger: 'blur' }">
                <el-input v-model="product.name" placeholder="产品名称" />
              </el-form-item>
            </el-col>
            <el-col :span="5">
              <el-form-item label-width="0" :prop="`products.${index}.quantity`" :rules="{ required: true, message: '请输入数量', trigger: 'blur' }">
                <el-input-number v-model="product.quantity" :min="1" placeholder="数量" style="width: 100%;" />
              </el-form-item>
            </el-col>
            <el-col :span="5">
              <el-form-item label-width="0" :prop="`products.${index}.price`" :rules="{ required: true, message: '请输入单价', trigger: 'blur' }">
                <el-input-number v-model="product.price" :min="0" :precision="2" placeholder="单价" style="width: 100%;" />
              </el-form-item>
            </el-col>
            <el-col :span="4">
              <el-button type="danger" @click="removeProduct(index)" plain>删除</el-button>
            </el-col>
          </el-row>
        </div>
        <el-form-item>
          <el-button type="primary" @click="addProduct" plain>添加产品</el-button>
        </el-form-item>

        <el-divider>支付信息</el-divider>

        <el-row :gutter="20">
          <el-col :span="12">
            <el-form-item label="支付方式" prop="paymentMethod">
              <el-select v-model="saleForm.paymentMethod" placeholder="请选择支付方式" style="width: 100%;">
                <el-option label="现金" value="cash" />
                <el-option label="银行转账" value="bank_transfer" />
                <el-option label="支付宝" value="alipay" />
                <el-option label="微信支付" value="wechat" />
                <el-option label="信用卡" value="credit_card" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="支付状态" prop="paymentStatus">
              <el-select v-model="saleForm.paymentStatus" placeholder="请选择支付状态" style="width: 100%;">
                <el-option label="已支付" value="paid" />
                <el-option label="待支付" value="pending" />
                <el-option label="已取消" value="cancelled" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>

        <el-form-item label="备注">
          <el-input v-model="saleForm.notes" type="textarea" placeholder="请输入备注信息" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showAddSaleDialog = false">取消</el-button>
          <el-button type="primary" @click="submitSaleForm" :loading="submitting">{{ isEditMode ? '更新' : '确定' }}</el-button>
        </span>
      </template>
    </el-dialog>

    <!-- 查看销售记录对话框 -->
    <el-dialog
      v-model="showViewDialog"
      title="查看销售记录"
      width="600px"
    >
      <el-descriptions :column="2" border>
        <el-descriptions-item label="销售ID">
          {{ currentViewRecord._id }}
        </el-descriptions-item>
        <el-descriptions-item label="代理">
          {{ currentViewRecord.agentName }}
        </el-descriptions-item>
        <el-descriptions-item label="客户姓名">
          {{ currentViewRecord.customerName }}
        </el-descriptions-item>
        <el-descriptions-item label="客户电话">
          {{ currentViewRecord.customerPhone }}
        </el-descriptions-item>
        <el-descriptions-item label="客户地址" :span="2">
          {{ currentViewRecord.customerAddress }}
        </el-descriptions-item>
        <el-descriptions-item label="销售日期">
          {{ formatDate(currentViewRecord.saleDate) }}
        </el-descriptions-item>
        <el-descriptions-item label="总金额">
          ¥{{ (currentViewRecord?.totalAmount || 0).toFixed(2) }}
        </el-descriptions-item>
        <el-descriptions-item label="支付方式">
          {{ getPaymentMethodName(currentViewRecord.paymentMethod) }}
        </el-descriptions-item>
        <el-descriptions-item label="支付状态">
          <el-tag :type="getPaymentStatusType(currentViewRecord.paymentStatus)">
            {{ getPaymentStatusName(currentViewRecord.paymentStatus) }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="产品信息" :span="2">
          <div v-if="currentViewRecord.products && currentViewRecord.products?.length > 0">
            <div v-for="(product, index) in currentViewRecord.products" :key="index" class="product-item">
              <span>{{ product.name }} × {{ product.quantity }} = ¥{{ (product.price * product.quantity).toFixed(2) }}</span>
            </div>
          </div>
          <span v-else>暂无产品信息</span>
        </el-descriptions-item>
        <el-descriptions-item label="备注" :span="2">
          {{ currentViewRecord.notes || '无' }}
        </el-descriptions-item>
        <el-descriptions-item label="创建时间">
          {{ formatDate(currentViewRecord.createdAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="更新时间">
          {{ formatDate(currentViewRecord.updatedAt) }}
        </el-descriptions-item>
      </el-descriptions>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="showViewDialog = false">关闭</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { useSalesStore } from '@/stores/sales'
import {
  TrendCharts,
  Plus,
  Refresh,
  ShoppingCart,
  Money,
  User,
  Share,
  Trophy,
  Medal,
  DataAnalysis,
  DataLine,
  PieChart,
  List,
  Phone,
  Location
} from '@element-plus/icons-vue'

// Store
const salesStore = useSalesStore()

// 响应式数据
const dateRange = ref([])
const selectedAgentId = ref('')
const selectedPaymentMethod = ref('')
const selectedPaymentStatus = ref('')
const chartType = ref('monthly')
const currentPage = ref(1)
const pageSize = ref(10)
const showAddSaleDialog = ref(false)
const showViewDialog = ref(false)
const currentViewRecord = ref({})
const submitting = ref(false)
const selectedRecords = ref([])
const isEditMode = ref(false)
const editingRecordId = ref(null)

// 表单数据
const saleForm = ref({
  agentId: '',
  customerName: '',
  customerPhone: '',
  customerAddress: '',
  products: [{ name: '', quantity: 1, price: 0 }],
  paymentMethod: '',
  paymentStatus: 'pending',
  saleDate: new Date().toISOString().split('T')[0],
  notes: ''
})

const saleFormRef = ref()

// 表单验证规则
const saleFormRules = {
  agentId: [{ required: true, message: '请选择代理', trigger: 'change' }],
  customerName: [{ required: true, message: '请输入客户姓名', trigger: 'blur' }],
  customerPhone: [{ required: true, message: '请输入客户电话', trigger: 'blur' }],
  products: [{ required: true, message: '请添加产品信息', trigger: 'change' }],
  paymentMethod: [{ required: true, message: '请选择支付方式', trigger: 'change' }],
  saleDate: [{ required: true, message: '请选择销售日期', trigger: 'change' }]
}

// 树形组件配置
const treeProps = {
  children: 'children',
  label: 'name'
}

// 计算属性
const isLoading = computed(() => {
  return salesStore.salesStatsLoading || salesStore.salesRecordsLoading || salesStore.agentsLoading
})

const salesStatsSummary = computed(() => salesStore.salesStatsSummary)

const topAgents = computed(() => {
  return salesStore.salesStats?.salesByAgent?.slice(0, 5) || []
})
// 方法
const getAgentLevelName = (level) => {
  const levelNames = {
    1: '州总代理',
    2: '城市代理',
    3: '销售员'
  }
  return levelNames[level] || '未知级别'
}

const getLevelTagType = (level) => {
  const tagTypes = {
    1: 'danger',
    2: 'warning',
  }
  return tagTypes[level] || 'info'
}

const getAgentName = (agentId) => {
  const agent = salesStore.agentsMap[agentId]
  return agent?.name || '未知代理'
}

const getPaymentMethodName = (method) => {
  const methodNames = {
    cash: '现金',
    bank_transfer: '银行转账',
    alipay: '支付宝',
    wechat: '微信支付',
    credit_card: '信用卡'
  }
  return methodNames[method] || '未知'
}

const getPaymentStatusType = (status) => {
  const statusTypes = {
    paid: 'success',
    pending: 'warning',
    cancelled: 'danger'
  }
  return statusTypes[status] || 'info'
}

const getPaymentStatusName = (status) => {
  const statusNames = {
    paid: '已支付',
    pending: '待支付',
    cancelled: '已取消'
  }
  return statusNames[status] || '未知'
}

const formatCurrency = (amount) => {
  return new Intl.NumberFormat('zh-CN', { style: 'currency', currency: 'CNY' }).format(amount || 0);
}

const handleDateRangeChange = (dates) => {
  if (dates && dates.length === 2) {
    salesStore.setFilters({
      startDate: dates[0],
      endDate: dates[1]
    })
  } else {
    salesStore.setFilters({
      startDate: null,
      endDate: null
    })
  }
}

const applyFilters = async () => {
  const filters = {}
  
  if (selectedAgentId.value) {
    filters.agentId = selectedAgentId.value
  }
  if (selectedPaymentMethod.value) {
    filters.paymentMethod = selectedPaymentMethod.value
  }
  if (selectedPaymentStatus.value) {
    filters.paymentStatus = selectedPaymentStatus.value
  }
  
  salesStore.setFilters(filters)
  
  // 重新获取数据
  await Promise.all([
    salesStore.fetchSalesRecords({ page: 1, limit: pageSize.value }),
    salesStore.fetchSalesStats()
  ])
  
  currentPage.value = 1
}

const resetFilters = async () => {
  dateRange.value = []
  selectedAgentId.value = ''
  selectedPaymentMethod.value = ''
  selectedPaymentStatus.value = ''
  
  salesStore.clearFilters()
  
  // 重新获取数据
  await Promise.all([
    salesStore.fetchSalesRecords({ page: 1, limit: pageSize.value }),
    salesStore.fetchSalesStats()
  ])
  
  currentPage.value = 1
}

const refreshData = async () => {
  await salesStore.initialize()
}

const handleAgentClick = (agent) => {
  salesStore.setSelectedAgent(agent)
  // 可以在这里添加更多的代理点击逻辑
}

const handleSelectionChange = (selection) => {
  selectedRecords.value = selection
}

const handleSizeChange = async (size) => {
  pageSize.value = size
  await salesStore.fetchSalesRecords({ page: currentPage.value, limit: size })
}

const handleCurrentChange = async (page) => {
  currentPage.value = page
  await salesStore.fetchSalesRecords({ page, limit: pageSize.value })
}

const addProduct = () => {
  saleForm.value.products.push({ name: '', quantity: 1, price: 0 })
}

const removeProduct = (index) => {
  saleForm.value.products.splice(index, 1)
}

const calculateTotalAmount = () => {
  return saleForm.value.products.reduce((total, product) => {
    return total + (product.quantity * product.price)
  }, 0)
}

const submitSaleForm = async () => {
  if (!saleFormRef.value) return

  try {
    await saleFormRef.value.validate()
    submitting.value = true

    const saleData = {
      ...saleForm.value,
      totalAmount: calculateTotalAmount()
    }

    if (isEditMode.value) {
      await salesStore.updateSaleRecord(editingRecordId.value, saleData)
      ElMessage.success('销售记录更新成功')
    } else {
      await salesStore.createSaleRecord(saleData)
      ElMessage.success('销售记录添加成功')
    }

    showAddSaleDialog.value = false
    resetSaleForm()

  } catch (error) {
    const action = isEditMode.value ? '更新' : '添加'
    console.error(`${action}销售记录失败:`, error)
    ElMessage.error(error.message || `${action}销售记录失败`)
  } finally {
    submitting.value = false
  }
}

const resetSaleForm = () => {
  isEditMode.value = false
  editingRecordId.value = null
  saleForm.value = {
    agentId: '',
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    products: [{ name: '', quantity: 1, price: 0 }],
    paymentMethod: '',
    paymentStatus: 'pending',
    saleDate: new Date().toISOString().split('T')[0],
    notes: ''
  }
  if (saleFormRef.value) {
    saleFormRef.value.clearValidate()
  }
}

const handleCloseAddSaleDialog = (done) => {
  resetSaleForm()
  done()
}

const viewSaleRecord = (record) => {
  currentViewRecord.value = { ...record }
  showViewDialog.value = true
}

const editSaleRecord = (record) => {
  isEditMode.value = true
  editingRecordId.value = record._id
  // 深拷贝以避免直接修改列表中的数据
  saleForm.value = JSON.parse(JSON.stringify(record))
  showAddSaleDialog.value = true
}

const deleteSaleRecord = async (record) => {
  try {
    await ElMessageBox.confirm('确定要删除这条销售记录吗？', '确认删除', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await salesStore.deleteSaleRecord(record._id)
    ElMessage.success('删除成功')
    
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除销售记录失败:', error)
      ElMessage.error(error.message || '删除失败')
    }
  }
}

const exportData = () => {
  // TODO: 实现导出功能
  ElMessage.info('导出功能开发中...')
}

// 生命周期
onMounted(async () => {
  // 只在数据未初始化时才初始化，避免重复请求
  if (!salesStore.initialized) {
    await salesStore.initialize()
  }
})

// 监听分页变化
watch([currentPage, pageSize], async () => {
  await salesStore.fetchSalesRecords({ 
    page: currentPage.value, 
    limit: pageSize.value 
  })
})
</script>

<style scoped>
.sales-container {
  padding: 20px;
  background-color: #f5f7fa;
  min-height: 100vh;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  background: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.header-left {
  flex: 1;
}

.page-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 8px 0;
}

.stats-overview {
  margin-bottom: 20px;
}

.stat-card {
  height: 100px;
}

.stat-content {
  display: flex;
  align-items: center;
  height: 100%;
}

.stat-icon {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 16px;
  font-size: 24px;
  color: white;
}

.stat-icon.total-sales {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.stat-icon.total-amount {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.stat-icon.average-order {
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
}

.stat-icon.total-agents {
  background: linear-gradient(135deg, #43e97b 0%, #38f9d7 100%);
}

.stat-info {
  flex: 1;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 4px;
}

.stat-label {
  font-size: 14px;
  color: #909399;
}

.main-content-row {
  margin-bottom: 20px;
}

.team-tree-card,
.ranking-card,
.charts-card,
.table-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.card-title {
  font-weight: 600;
  color: #303133;
  display: flex;
  align-items: center;
  gap: 8px;
}

.team-tree-container {
  max-height: 700px;
  overflow-y: auto;
  padding: 8px 12px;
}

.tree-node {
  flex: 1;
  display: flex;
  align-items: center;
  padding: 12px 0;
}

.node-info {
  display: flex;
  align-items: center;
  flex: 1;
  gap: 12px;
}

.node-avatar {
  margin-right: 12px;
  background-color: #409eff;
  color: white;
  flex-shrink: 0;
}

.node-details {
  flex: 1;
  min-width: 0;
}

.node-title {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
  flex-wrap: wrap;
  row-gap: 4px;
}

.node-name {
  font-weight: 500;
  color: #303133;
  word-break: break-word;
}

.node-stats {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #909399;
  flex-wrap: wrap;
  row-gap: 4px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 4px;
  white-space: nowrap;
}

.ranking-list {
  max-height: 300px;
  overflow-y: auto;
}

.ranking-item {
  display: flex;
  align-items: center;
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.ranking-item:last-child {
  border-bottom: none;
}

.ranking-item.top-three {
  background-color: #fafafa;
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 8px;
}

.rank-number {
  width: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-right: 12px;
}

.rank-number .gold {
  color: #ffd700;
  font-size: 20px;
}

.rank-number .silver {
  color: #c0c0c0;
  font-size: 18px;
}

.rank-number .bronze {
  color: #cd7f32;
  font-size: 16px;
}

.rank-text {
  font-weight: 600;
  color: #606266;
}

.agent-avatar {
  margin-right: 12px;
  background-color: #409eff;
  color: white;
}

.agent-info {
  flex: 1;
}

.agent-name {
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
}

.agent-stats {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #909399;
}

.sales-amount {
  font-weight: 600;
  color: #f56c6c;
}

.sales-count {
  color: #909399;
}

.chart-container {
  min-height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.chart-placeholder,
.no-chart-data {
  text-align: center;
  color: #909399;
}

.chart-placeholder .el-icon,
.no-chart-data .el-icon {
  font-size: 48px;
  margin-bottom: 16px;
  color: #dcdfe6;
}

.trend-data,
.payment-data {
  margin-top: 20px;
  text-align: left;
}

.trend-item,
.payment-item {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #f0f0f0;
}

.trend-item:last-child,
.payment-item:last-child {
  border-bottom: none;
}

.month,
.method {
  font-weight: 500;
  color: #303133;
}

.amount {
  color: #f56c6c;
  font-weight: 600;
}

.orders,
.percentage {
  color: #909399;
  font-size: 12px;
}

.table-actions {
  display: flex;
  gap: 8px;
}

.pagination-container {
  margin-top: 20px;
  display: flex;
  justify-content: center;
}

.products-container {
  width: 100%;
}

.product-row {
  display: flex;
  align-items: center;
  margin-bottom: 10px;
}

.product-item {
  padding: 4px 0;
  border-bottom: 1px solid #f0f0f0;
}

.product-item:last-child {
  border-bottom: none;
}

.no-data {
  text-align: center;
  color: #909399;
  padding: 20px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>