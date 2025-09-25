import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import dayjs from 'dayjs'
import { useSalesStore } from './sales'
import api from '@/api'
import { ElMessage } from 'element-plus'

export const useDataStore = defineStore('data', () => {
  // 交易数据
  const transactions = ref([])
  
  // 物流数据
  const logistics = ref([])
  
  // 库存数据
  const inventory = ref([])
  
  // 加载状态
  const loading = ref({
    transactions: false,
    logistics: false,
    inventory: false
  })
  
  // 错误信息
  const error = ref({
    transactions: null,
    logistics: null,
    inventory: null
  })

  // 初始化方法 - 加载所有数据
  async function initialize() {
    await fetchTransactions()
    await fetchLogistics()
    await fetchInventory()
  }
  
  // 获取交易数据
  async function fetchTransactions(params = {}) {
    loading.value.transactions = true
    error.value.transactions = null
    
    try {
      const response = await api.transactions.getAll(params)
      
      // 交易API需要认证，返回格式为 {success: true, data: [...]}
      if (response && response.success && Array.isArray(response.data)) {
        transactions.value = response.data
      } else if (Array.isArray(response)) {
        // 兼容直接返回数组的情况
        transactions.value = response
      } else {
        console.warn('获取交易数据格式不正确，使用空数组')
        transactions.value = []
      }
    } catch (err) {
      console.error('获取交易数据失败:', err)
      error.value.transactions = '获取交易数据失败'
      transactions.value = []
    } finally {
      loading.value.transactions = false
    }
  }
  
  // 获取物流数据
  async function fetchLogistics(params = {}) {
    loading.value.logistics = true
    error.value.logistics = null
    
    try {
      const response = await api.logistics.getAll(params)
      
      // 物流API需要认证，返回格式为 {success: true, data: [...]}
      if (response && response.success && Array.isArray(response.data)) {
        logistics.value = response.data
      } else if (Array.isArray(response)) {
        // 兼容直接返回数组的情况
        logistics.value = response
      } else {
        console.warn('获取物流数据格式不正确，使用空数组')
        logistics.value = []
      }
    } catch (err) {
      console.error('获取物流数据失败:', err)
      error.value.logistics = '获取物流数据失败'
      logistics.value = []
    } finally {
      loading.value.logistics = false
    }
  }
  
  // 获取库存数据
  async function fetchInventory(params = {}) {
    loading.value.inventory = true
    error.value.inventory = null
    
    try {
      const response = await api.inventory.getAll(params)
      
      // 库存API不需要认证，直接返回数组
      if (Array.isArray(response)) {
        inventory.value = response
      } else if (response && response.success && Array.isArray(response.data)) {
        // 兼容认证API的响应格式
        inventory.value = response.data
      } else {
        console.warn('获取库存数据格式不正确，使用空数组')
        inventory.value = []
      }
    } catch (err) {
      console.error('获取库存数据失败:', err)
      error.value.inventory = '获取库存数据失败'
      inventory.value = []
    } finally {
      loading.value.inventory = false
    }
  }
  

  
  // 计算属性 - 财务概览
  const financialOverview = computed(() => {
    // 获取销售数据
    const salesStore = useSalesStore()
    
    // 使用当前年月
    const currentDate = dayjs()
    const currentMonth = currentDate.month()
    const currentYear = currentDate.year()
    
    const currentMonthTransactions = transactions.value.filter(t => {
      const date = dayjs(t.date)
      return date.month() === currentMonth && date.year() === currentYear
    })
    
    const previousMonthTransactions = transactions.value.filter(t => {
      const date = dayjs(t.date)
      return date.month() === currentMonth - 1 && date.year() === currentYear
    })
    
    // 计算销售数据
    const allSalesRecords = Object.values(salesStore.salesRecords || {}) || []
    const currentMonthSales = allSalesRecords.filter(sale => {
      if (!sale || !sale.saleDate) return false
      const date = dayjs(sale.saleDate)
      return date.month() === currentMonth && date.year() === currentYear
    })
    
    const previousMonthSales = allSalesRecords.filter(sale => {
      if (!sale || !sale.saleDate) return false
      const date = dayjs(sale.saleDate)
      return date.month() === currentMonth - 1 && date.year() === currentYear
    })
    
    const calculateTotals = (transactions = [], sales = []) => {
      // 确保参数是数组
      const safeTransactions = Array.isArray(transactions) ? transactions : []
      const safeSales = Array.isArray(sales) ? sales : []
      
      // 只计算交易中的收入，不再加上销售收入，避免重复计算
      const transactionIncome = safeTransactions.filter(t => t && t.type === 'income').reduce((sum, t) => sum + (t.amount || 0), 0)
      const salesRevenue = safeSales.reduce((sum, sale) => sum + (sale && sale.totalAmount || 0), 0)
      const expense = safeTransactions.filter(t => t && t.type === 'expense').reduce((sum, t) => sum + (t.amount || 0), 0)
      // 总收入只使用交易收入，不再加上销售收入
      const totalIncome = transactionIncome
      const net = totalIncome - expense
      return { transactionIncome, salesRevenue, totalIncome, expense, net }
    }
    
    const current = calculateTotals(currentMonthTransactions, currentMonthSales)
    const previous = calculateTotals(previousMonthTransactions, previousMonthSales)
    
    // 计算总资产（历史累积净收入）
    const allTransactions = transactions.value || []
    const allSales = Object.values(salesStore.salesRecords || {}) || []
    const allTotals = calculateTotals(allTransactions, allSales)
    
    return {
      totalAssets: allTotals.net > 0 ? allTotals.net : 0,
      totalExpenses: current.expense,
      totalIncome: current.totalIncome,
      salesRevenue: current.salesRevenue,
      otherIncome: current.transactionIncome,
      netIncome: current.net,
      salesCount: currentMonthSales.length,
      assetChange: previous.totalIncome !== 0 ? ((current.totalIncome - previous.totalIncome) / previous.totalIncome * 100).toFixed(1) : '0.0',
      expenseChange: previous.expense !== 0 ? ((current.expense - previous.expense) / previous.expense * 100).toFixed(1) : '0.0',
      incomeChange: previous.totalIncome !== 0 ? ((current.totalIncome - previous.totalIncome) / previous.totalIncome * 100).toFixed(1) : '0.0',
      salesChange: previous.salesRevenue !== 0 ? ((current.salesRevenue - previous.salesRevenue) / previous.salesRevenue * 100).toFixed(1) : '0.0'
    }
  })



  // 计算属性 - 库存统计
  const inventoryStats = computed(() => {
    const inventoryArray = inventory.value || []
    const total = inventoryArray.length
    const lowStock = inventoryArray.filter(item => item && item.status === 'low').length
    const outOfStock = inventoryArray.filter(item => item && item.status === 'out').length
    
    return {
      total,
      lowStock,
      outOfStock,
      normal: total - lowStock - outOfStock
    }
  })

  // 交易相关方法
  const addTransaction = async (transaction) => {
    try {
      const newTransaction = {
        ...transaction,
        date: transaction.date || dayjs().format('YYYY-MM-DD')
      }
      
      const response = await api.transactions.create(newTransaction)
      
      // 检查API响应格式
      if (!response || !response.success || !response.data) {
        console.error('API响应格式错误:', response)
        return null
      }
      
      const createdTransaction = response.data
      
      // 更新本地数据
      transactions.value.push(createdTransaction)
      return createdTransaction
    } catch (error) {
      console.error('添加交易记录失败:', error)
      return null
    }
  }

  const updateTransaction = async (id, updates) => {
    try {
      const response = await api.transactions.update(id, updates)
      
      // 检查API响应格式
      if (!response || !response.success || !response.data) {
        console.error('API响应格式错误:', response)
        return null
      }
      
      const updatedTransaction = response.data
      
      // 更新本地数据 - 支持id和_id两种字段
      const index = transactions.value.findIndex(t => 
        t.id === id || t._id === id || 
        t.id === updatedTransaction.id || t._id === updatedTransaction._id
      )
      
      if (index !== -1) {
        // 更新现有记录，保持原有的id字段
        transactions.value[index] = { 
          ...transactions.value[index], 
          ...updatedTransaction,
          id: transactions.value[index].id || updatedTransaction.id,
          _id: transactions.value[index]._id || updatedTransaction._id
        }
        return transactions.value[index]
      } else {
        // 如果本地没有这条记录，添加到本地
        transactions.value.push(updatedTransaction)
        return updatedTransaction
      }
    } catch (error) {
      console.error('更新交易记录失败:', error)
      return null
    }
  }

  const deleteTransaction = async (id) => {
    try {
      await api.transactions.delete(id)
      
      // 更新本地数据
      const index = transactions.value.findIndex(t => t.id === id)
      if (index !== -1) {
        transactions.value.splice(index, 1)
        return true
      }
      return false
    } catch (error) {
      console.error('删除交易记录失败:', error)
      return false
    }
  }



  // 库存相关方法
  const checkInventoryStatus = (item) => {
    if (!item) return 'unknown'
    
    if (item.quantity <= 0) return 'out'
    if (item.quantity <= item.reorderPoint) return 'low'
    return 'normal'
  }
  
  const addInventory = async (inventoryData) => {
    try {
      // 准备数据
      const newInventory = {
        ...inventoryData,
        status: 'normal'
      }
      
      // 调用API创建库存
      const response = await api.inventory.create(newInventory)
      
      // 更新本地数据
      inventory.value.push(response)
      
      ElMessage.success('库存添加成功')
      return response.id
    } catch (error) {
      console.error('添加库存失败:', error)
      ElMessage.error('添加库存失败')
      return null
    }
  }
  
  const updateInventory = async (id, data) => {
    try {
      console.log('更新库存，ID:', id)
      console.log('更新数据:', data)
      
      // 查找当前库存 (支持id或_id)
      const currentItem = inventory.value.find(i => 
        (i.id && i.id === id) || (i._id && i._id === id)
      )
      
      if (!currentItem) {
        console.error('找不到库存项，ID:', id)
        console.log('当前库存列表:', inventory.value)
        ElMessage.error('库存不存在')
        return false
      }
      
      console.log('找到库存项:', currentItem)
      const oldQuantity = currentItem.quantity
      
      // 调用API更新库存
      const response = await api.inventory.update(id, data)
      console.log('API响应:', response)
      
      // 更新本地数据
      // 根据响应中的_id或id查找索引
      const responseId = response._id || response.id;
      console.log('API响应中的ID:', responseId);
      
      const index = inventory.value.findIndex(i => 
        (i._id && i._id === responseId) || (i.id && i.id === responseId)
      );
      
      console.log('找到的索引:', index);
      
      if (index !== -1) {
        // 保留原有的id和_id字段，以防API响应中缺少这些字段
        const originalId = inventory.value[index].id;
        const original_id = inventory.value[index]._id;
        
        // 更新项目，但保留原有的ID字段
        inventory.value[index] = {
          ...response,
          id: response.id || originalId,
          _id: response._id || original_id
        };
        
        console.log('更新后的项目:', inventory.value[index]);
      } else {
        console.log('未找到匹配项，添加新项目');
        inventory.value.push(response);
      }
      

      
      ElMessage.success('库存更新成功')
      return true
    } catch (error) {
      console.error('更新库存失败:', error)
      ElMessage.error('更新库存失败')
      return false
    }
  }

  const deleteInventory = async (id) => {
    try {
      // 查找当前库存
      const item = inventory.value.find(item => item.id === id)
      if (!item) {
        ElMessage.error('库存不存在')
        return false
      }
      

      
      // 调用API删除库存
      await api.inventory.delete(id)
      
      // 更新本地数据
      const index = inventory.value.findIndex(i => i.id === id)
      if (index !== -1) {
        inventory.value.splice(index, 1)
      }
      
      ElMessage.success('库存删除成功')
      return true
    } catch (error) {
      console.error('删除库存失败:', error)
      ElMessage.error('删除库存失败')
      return false
    }
  }



  // 物流相关方法
  const addLogistics = async (item) => {
    try {
      // 准备数据
      const newItem = {
        ...item,
        status: 'pending'
      }
      
      // 调用API创建物流
      const response = await api.logistics.create(newItem)
      
      // 更新本地数据
      logistics.value.push(response)
      
      ElMessage.success('物流信息添加成功')
      return response
    } catch (error) {
      console.error('添加物流信息失败:', error)
      ElMessage.error('添加物流信息失败')
      return null
    }
  }

  const updateLogisticsStatus = async (id, newStatus) => {
    try {
      // 查找当前物流
      const item = logistics.value.find(l => l.id === id)
      if (!item) {
        ElMessage.error('物流信息不存在')
        return null
      }
      
      // 如果没有提供新状态，则自动更新到下一个状态
      if (!newStatus) {
        const statusOrder = ['pending', 'transit', 'delivered']
        const currentIndex = statusOrder.indexOf(item.status)
        if (currentIndex < statusOrder.length - 1) {
          newStatus = statusOrder[currentIndex + 1]
        } else {
          newStatus = item.status
        }
      }
      
      // 调用API更新物流状态
      const response = await api.logistics.update(id, { status: newStatus })
      
      // 更新本地数据
      const index = logistics.value.findIndex(l => l.id === id)
      if (index !== -1) {
        logistics.value[index] = response
      }
      
      ElMessage.success('物流状态更新成功')
      return response
    } catch (error) {
      console.error('更新物流状态失败:', error)
      ElMessage.error('更新物流状态失败')
      return null
    }
  }

  const deleteLogistics = async (id) => {
    try {
      // 调用API删除物流
      await api.logistics.delete(id)
      
      // 更新本地数据
      const index = logistics.value.findIndex(l => l.id === id)
      if (index !== -1) {
        logistics.value.splice(index, 1)
      }
      
      ElMessage.success('物流信息删除成功')
      return true
    } catch (error) {
      console.error('删除物流信息失败:', error)
      ElMessage.error('删除物流信息失败')
      return false
    }
  }

  return {
    // 数据
    transactions,
    logistics,
    inventory,
    
    // 计算属性
    financialOverview,
    inventoryStats,
    
    // 方法
    initialize,
    fetchTransactions,
    fetchLogistics,
    fetchInventory,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addInventory,
    updateInventory,
    deleteInventory,
    addLogistics,
    updateLogisticsStatus,
    deleteLogistics,
    checkInventoryStatus
  }
})