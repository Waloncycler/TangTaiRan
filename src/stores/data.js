import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import dayjs from 'dayjs'
import { useSalesStore } from './sales'

export const useDataStore = defineStore('data', () => {
  // 交易数据
  const transactions = ref([
    { id: 1, type: 'income', amount: 5000, category: 'salary', date: '2025-01-15', note: '工资收入' },
    { id: 2, type: 'expense', amount: 1200, category: 'food', date: '2025-01-16', note: '餐饮支出' },
    { id: 3, type: 'expense', amount: 800, category: 'transport', date: '2025-01-17', note: '交通费用' }
  ])



  // 物流数据
  const logistics = ref([
    { id: 1, company: 'sf', orderNumber: 'SF123456789', product: '唐肽燃胶囊', quantity: 100, recipient: '张三', contact: '13800138000', status: 'pending' },
    { id: 2, company: 'ems', orderNumber: 'EMS987654321', product: '唐肽燃口服液', quantity: 50, recipient: '李四', contact: '13900139000', status: 'transit' }
  ])

  // 库存数据
  const inventory = ref([
    { id: 1, name: '勺子', quantity: 150, unit: '个', location: 'Bintulu', status: 'normal', createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-15T10:30:00.000Z' },
    { id: 2, name: '贴纸', quantity: 8, unit: '包', location: 'KL', status: 'low', createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-16T14:20:00.000Z' },
    { id: 3, name: '瓶子', quantity: 0, unit: '个', location: 'Bintulu', status: 'out', createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-17T09:15:00.000Z' },
    { id: 4, name: '唐肽燃', quantity: 200, unit: '盒', location: 'KL', status: 'normal', createdAt: '2025-01-01T00:00:00.000Z', updatedAt: '2025-01-18T15:45:00.000Z' }
  ])

  // 库存变动日志
  const inventoryLogs = ref([
    { id: 1, timestamp: '2025-01-15T10:30:00.000Z', productName: '勺子', changeType: 'edit', oldQuantity: 170, newQuantity: 150, quantityChange: -20, operator: '系统管理员' },
    { id: 2, timestamp: '2025-01-16T14:20:00.000Z', productName: '贴纸', changeType: 'edit', oldQuantity: 15, newQuantity: 8, quantityChange: -7, operator: '系统管理员' },
    { id: 3, timestamp: '2025-01-17T09:15:00.000Z', productName: '瓶子', changeType: 'edit', oldQuantity: 5, newQuantity: 0, quantityChange: -5, operator: '系统管理员' },
    { id: 4, timestamp: '2025-01-18T15:45:00.000Z', productName: '唐肽燃', changeType: 'add', oldQuantity: 0, newQuantity: 200, quantityChange: 200, operator: '系统管理员' }
  ])

  // 计算属性 - 财务概览
  const financialOverview = computed(() => {
    // 获取销售数据
    const salesStore = useSalesStore()
    
    // 使用示例数据的年月，而不是当前年月
    // 从第一条交易记录中获取年月
    const sampleDate = transactions.value.length > 0 ? dayjs(transactions.value[0].date) : dayjs()
    const currentMonth = sampleDate.month()
    const currentYear = sampleDate.year()
    
    const currentMonthTransactions = transactions.value.filter(t => {
      const date = dayjs(t.date)
      return date.month() === currentMonth && date.year() === currentYear
    })
    
    const previousMonthTransactions = transactions.value.filter(t => {
      const date = dayjs(t.date)
      return date.month() === currentMonth - 1 && date.year() === currentYear
    })
    
    // 计算销售数据
    const currentMonthSales = Object.values(salesStore.salesRecords || {}).filter(sale => {
      const date = dayjs(sale.saleDate)
      return date.month() === currentMonth && date.year() === currentYear
    })
    
    const previousMonthSales = Object.values(salesStore.salesRecords || {}).filter(sale => {
      const date = dayjs(sale.saleDate)
      return date.month() === currentMonth - 1 && date.year() === currentYear
    })
    
    const calculateTotals = (transactions, sales = []) => {
      // 只计算交易中的收入，不再加上销售收入，避免重复计算
      const transactionIncome = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
      const salesRevenue = sales.reduce((sum, sale) => sum + (sale.totalAmount || 0), 0)
      const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
      // 总收入只使用交易收入，不再加上销售收入
      const totalIncome = transactionIncome
      const net = totalIncome - expense
      return { transactionIncome, salesRevenue, totalIncome, expense, net }
    }
    
    const current = calculateTotals(currentMonthTransactions, currentMonthSales)
    const previous = calculateTotals(previousMonthTransactions, previousMonthSales)
    
    // 计算总资产（历史累积净收入）
    const allTransactions = transactions.value
    const allSales = Object.values(salesStore.salesRecords || {})
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
    const total = inventory.value.length
    const lowStock = inventory.value.filter(item => item.status === 'low').length
    const outOfStock = inventory.value.filter(item => item.status === 'out').length
    
    return {
      total,
      lowStock,
      outOfStock,
      normal: total - lowStock - outOfStock
    }
  })

  // 交易相关方法
  const addTransaction = (transaction) => {
    const newTransaction = {
      id: Date.now(),
      ...transaction,
      date: transaction.date || dayjs().format('YYYY-MM-DD')
    }
    transactions.value.push(newTransaction)
    return newTransaction
  }

  const updateTransaction = (id, updates) => {
    const index = transactions.value.findIndex(t => t.id === id)
    if (index !== -1) {
      transactions.value[index] = { ...transactions.value[index], ...updates }
      return transactions.value[index]
    }
    return null
  }

  const deleteTransaction = (id) => {
    const index = transactions.value.findIndex(t => t.id === id)
    if (index !== -1) {
      transactions.value.splice(index, 1)
      return true
    }
    return false
  }



  // 库存相关方法
  const checkInventoryStatus = (quantity) => {
    if (quantity <= 0) return 'out'
    if (quantity <= 10) return 'low'
    return 'normal'
  }

  const addInventory = (item) => {
    const newItem = {
      id: Date.now(),
      ...item,
      status: checkInventoryStatus(item.quantity),
      createdAt: dayjs().toISOString(),
      updatedAt: dayjs().toISOString()
    }
    inventory.value.push(newItem)
    
    // 记录变动日志
    logInventoryChange({
      productName: newItem.name,
      changeType: 'add',
      oldQuantity: 0,
      newQuantity: newItem.quantity,
      quantityChange: newItem.quantity,
      operator: '系统管理员'
    })
    
    return newItem
  }

  const updateInventory = (id, updates) => {
    const index = inventory.value.findIndex(item => item.id === id)
    if (index !== -1) {
      const oldItem = inventory.value[index]
      const oldQuantity = oldItem.quantity
      
      inventory.value[index] = {
        ...oldItem,
        ...updates,
        status: checkInventoryStatus(updates.quantity || oldItem.quantity),
        updatedAt: dayjs().toISOString()
      }
      
      // 记录变动日志
      if (updates.quantity !== undefined && updates.quantity !== oldQuantity) {
        logInventoryChange({
          productName: inventory.value[index].name,
          changeType: 'edit',
          oldQuantity,
          newQuantity: updates.quantity,
          quantityChange: updates.quantity - oldQuantity,
          operator: '系统管理员'
        })
      }
      
      return inventory.value[index]
    }
    return null
  }

  const deleteInventory = (id) => {
    const index = inventory.value.findIndex(item => item.id === id)
    if (index !== -1) {
      const deletedItem = inventory.value[index]
      inventory.value.splice(index, 1)
      
      // 记录变动日志
      logInventoryChange({
        productName: deletedItem.name,
        changeType: 'delete',
        oldQuantity: deletedItem.quantity,
        newQuantity: 0,
        quantityChange: -deletedItem.quantity,
        operator: '系统管理员'
      })
      
      return true
    }
    return false
  }

  const logInventoryChange = (changeData) => {
    const logEntry = {
      id: Date.now(),
      timestamp: dayjs().toISOString(),
      ...changeData
    }
    inventoryLogs.value.push(logEntry)
    return logEntry
  }

  // 物流相关方法
  const addLogistics = (item) => {
    const newItem = {
      id: Date.now(),
      ...item,
      status: 'pending'
    }
    logistics.value.push(newItem)
    return newItem
  }

  const updateLogisticsStatus = (id) => {
    const item = logistics.value.find(l => l.id === id)
    if (item) {
      const statusOrder = ['pending', 'transit', 'delivered']
      const currentIndex = statusOrder.indexOf(item.status)
      if (currentIndex < statusOrder.length - 1) {
        item.status = statusOrder[currentIndex + 1]
      }
      return item
    }
    return null
  }

  const deleteLogistics = (id) => {
    const index = logistics.value.findIndex(l => l.id === id)
    if (index !== -1) {
      logistics.value.splice(index, 1)
      return true
    }
    return false
  }

  return {
    // 数据
    transactions,
    logistics,
    inventory,
    inventoryLogs,
    
    // 计算属性
    financialOverview,
    inventoryStats,
    
    // 方法
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addInventory,
    updateInventory,
    deleteInventory,
    logInventoryChange,
    addLogistics,
    updateLogisticsStatus,
    deleteLogistics,
    checkInventoryStatus
  }
})