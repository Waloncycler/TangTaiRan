import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import dayjs from 'dayjs'

export const useDataStore = defineStore('data', () => {
  // 交易数据
  const transactions = ref([
    { id: 1, type: 'income', amount: 5000, category: 'salary', date: '2024-01-15', note: '工资收入' },
    { id: 2, type: 'expense', amount: 1200, category: 'food', date: '2024-01-16', note: '餐饮支出' },
    { id: 3, type: 'expense', amount: 800, category: 'transport', date: '2024-01-17', note: '交通费用' }
  ])

  // 预算数据
  const budgets = ref([
    { id: 1, category: 'food', amount: 2000, spent: 1200 },
    { id: 2, category: 'transport', amount: 1000, spent: 800 },
    { id: 3, category: 'entertainment', amount: 500, spent: 200 }
  ])

  // 物流数据
  const logistics = ref([
    { id: 1, company: 'sf', orderNumber: 'SF123456789', product: '唐肽燃胶囊', quantity: 100, recipient: '张三', contact: '13800138000', status: 'pending' },
    { id: 2, company: 'ems', orderNumber: 'EMS987654321', product: '唐肽燃口服液', quantity: 50, recipient: '李四', contact: '13900139000', status: 'transit' }
  ])

  // 库存数据
  const inventory = ref([
    { id: 1, name: '唐肽燃胶囊', quantity: 500, unit: '盒', location: 'A区-01', status: 'normal', createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-15T10:30:00.000Z' },
    { id: 2, name: '唐肽燃口服液', quantity: 8, unit: '瓶', location: 'B区-02', status: 'low', createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-16T14:20:00.000Z' },
    { id: 3, name: '唐肽燃片剂', quantity: 0, unit: '盒', location: 'C区-03', status: 'out', createdAt: '2024-01-01T00:00:00.000Z', updatedAt: '2024-01-17T09:15:00.000Z' }
  ])

  // 库存变动日志
  const inventoryLogs = ref([
    { id: 1, timestamp: '2024-01-15T10:30:00.000Z', productName: '唐肽燃胶囊', changeType: 'edit', oldQuantity: 520, newQuantity: 500, quantityChange: -20, operator: '系统管理员' },
    { id: 2, timestamp: '2024-01-16T14:20:00.000Z', productName: '唐肽燃口服液', changeType: 'edit', oldQuantity: 15, newQuantity: 8, quantityChange: -7, operator: '系统管理员' }
  ])

  // 计算属性 - 财务概览
  const financialOverview = computed(() => {
    const currentMonth = dayjs().month()
    const currentYear = dayjs().year()
    
    const currentMonthTransactions = transactions.value.filter(t => {
      const date = dayjs(t.date)
      return date.month() === currentMonth && date.year() === currentYear
    })
    
    const previousMonthTransactions = transactions.value.filter(t => {
      const date = dayjs(t.date)
      return date.month() === currentMonth - 1 && date.year() === currentYear
    })
    
    const calculateTotals = (transactions) => {
      const income = transactions.filter(t => t.type === 'income').reduce((sum, t) => sum + t.amount, 0)
      const expense = transactions.filter(t => t.type === 'expense').reduce((sum, t) => sum + t.amount, 0)
      const net = income - expense
      return { income, expense, net }
    }
    
    const current = calculateTotals(currentMonthTransactions)
    const previous = calculateTotals(previousMonthTransactions)
    
    return {
      totalAssets: current.income,
      totalExpenses: current.expense,
      totalIncome: current.income,
      netIncome: current.net,
      assetChange: previous.income !== 0 ? ((current.income - previous.income) / previous.income * 100).toFixed(1) : '0.0',
      expenseChange: previous.expense !== 0 ? ((current.expense - previous.expense) / previous.expense * 100).toFixed(1) : '0.0',
      incomeChange: previous.income !== 0 ? ((current.income - previous.income) / previous.income * 100).toFixed(1) : '0.0'
    }
  })

  // 计算属性 - 预算概览
  const budgetOverview = computed(() => {
    const totalBudget = budgets.value.reduce((sum, b) => sum + b.amount, 0)
    const totalSpent = budgets.value.reduce((sum, b) => sum + b.spent, 0)
    const remaining = totalBudget - totalSpent
    const percentage = totalBudget > 0 ? (totalSpent / totalBudget * 100).toFixed(1) : 0
    
    return {
      totalBudget,
      totalSpent,
      remaining,
      percentage: parseFloat(percentage)
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

  // 预算相关方法
  const addBudget = (budget) => {
    const newBudget = {
      id: Date.now(),
      ...budget,
      spent: 0
    }
    budgets.value.push(newBudget)
    return newBudget
  }

  const updateBudget = (id, updates) => {
    const index = budgets.value.findIndex(b => b.id === id)
    if (index !== -1) {
      budgets.value[index] = { ...budgets.value[index], ...updates }
      return budgets.value[index]
    }
    return null
  }

  const deleteBudget = (id) => {
    const index = budgets.value.findIndex(b => b.id === id)
    if (index !== -1) {
      budgets.value.splice(index, 1)
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
    budgets,
    logistics,
    inventory,
    inventoryLogs,
    
    // 计算属性
    financialOverview,
    budgetOverview,
    inventoryStats,
    
    // 方法
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addBudget,
    updateBudget,
    deleteBudget,
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