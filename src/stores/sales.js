import { defineStore } from 'pinia'
import { ElMessage } from 'element-plus'
import { useDataStore } from './data'

export const useSalesStore = defineStore('sales', {
  state: () => ({
    // 代理数据
    agents: {
      'agent001': {
        id: 'agent001',
        name: 'Ahmad Rahman',
        level: 1, // 1:州总代理, 2:城市代理, 3:团队长, 4:销售员
        parentId: null,
        phone: '+60123456001',
        email: 'ahmad.rahman@example.com',
        joinDate: '2024-01-01',
        status: 'active',
        region: 'Sarawak',
        city: 'Kuching'
      },
      'agent002': {
        id: 'agent002',
        name: 'Siti Nurhaliza',
        level: 2,
        parentId: 'agent001',
        phone: '+60123456002',
        email: 'siti.nurhaliza@example.com',
        joinDate: '2024-01-15',
        status: 'active',
        region: 'Sarawak',
        city: 'Miri'
      },
      'agent003': {
        id: 'agent003',
        name: 'Lim Wei Ming',
        level: 3,
        parentId: 'agent002',
        phone: '+60123456003',
        email: 'lim.weiming@example.com',
        joinDate: '2024-02-01',
        status: 'active',
        region: 'Sarawak',
        city: 'Bintulu'
      },
      'agent004': {
        id: 'agent004',
        name: 'Raj Kumar',
        level: 4,
        parentId: 'agent003',
        phone: '+60123456004',
        email: 'raj.kumar@example.com',
        joinDate: '2024-02-15',
        status: 'active',
        region: 'Sarawak',
        city: 'Sibu'
      }
    },
    
    // 销售记录
    salesRecords: {
      'sale001': {
        id: 'sale001',
        agentId: 'agent004',
        productName: 'TangTaiRan小分子肽',
        quantity: 10,
        unitPrice: 299,
        totalAmount: 2990,
        customerName: 'Tan Ah Kow',
        customerPhone: '+60198765001',
        saleDate: '2025-01-15',
        status: 'completed',
        region: 'Sarawak',
        city: 'Sibu'
      },
      'sale002': {
        id: 'sale002',
        agentId: 'agent004',
        productName: 'TangTaiRan小分子肽',
        quantity: 5,
        unitPrice: 299,
        totalAmount: 1495,
        customerName: 'Wong Mei Ling',
        customerPhone: '+60198765002',
        saleDate: '2025-01-20',
        status: 'completed',
        region: 'Sarawak',
        city: 'Sibu'
      },
      'sale003': {
        id: 'sale003',
        agentId: 'agent003',
        productName: 'TangTaiRan小分子肽',
        quantity: 20,
        unitPrice: 299,
        totalAmount: 5980,
        customerName: 'Fatimah Abdullah',
        customerPhone: '+60198765003',
        saleDate: '2025-01-25',
        status: 'completed',
        region: 'Sarawak',
        city: 'Bintulu'
      }
    },
    
    // 当前选中的时间范围
    dateRange: {
      start: '2025-01-01',
      end: '2025-01-31'
    },
    
    // 筛选条件
    filters: {
      region: '',
      city: '',
      agentLevel: '',
      status: 'all'
    }
  }),
  
  getters: {
    // 获取代理层级名称
    getAgentLevelName: () => (level) => {
      const levelNames = {
        1: '州总代理',
        2: '城市代理', 
        3: '团队长',
        4: '销售员'
      }
      return levelNames[level] || '未知'
    },
    
    // 获取代理的下级成员
    getSubAgents: (state) => (parentId) => {
      return Object.values(state.agents).filter(agent => agent.parentId === parentId)
    },
    
    // 获取代理的团队结构树
    getTeamTree: (state) => {
      const buildTree = (parentId = null) => {
        return Object.values(state.agents)
          .filter(agent => agent.parentId === parentId)
          .map(agent => ({
            ...agent,
            children: buildTree(agent.id)
          }))
      }
      return buildTree()
    },
    
    // 获取代理的销售记录
    getAgentSales: (state) => (agentId) => {
      return Object.values(state.salesRecords).filter(sale => sale.agentId === agentId)
    },
    
    // 获取代理及其团队的销售统计
    getAgentTeamStats: (state) => (agentId) => {
      const getTeamMembers = (id) => {
        const members = [id]
        const subAgents = Object.values(state.agents).filter(agent => agent.parentId === id)
        subAgents.forEach(agent => {
          members.push(...getTeamMembers(agent.id))
        })
        return members
      }
      
      const teamMembers = getTeamMembers(agentId)
      const teamSales = Object.values(state.salesRecords).filter(sale => 
        teamMembers.includes(sale.agentId)
      )
      
      return {
        totalSales: teamSales.length,
        totalAmount: teamSales.reduce((sum, sale) => sum + sale.totalAmount, 0),
        totalQuantity: teamSales.reduce((sum, sale) => sum + sale.quantity, 0),
        teamSize: teamMembers.length
      }
    },
    
    // 获取销售排行榜
    getSalesRanking: (state) => {
      const agentStats = Object.values(state.agents).map(agent => {
        const sales = Object.values(state.salesRecords).filter(sale => sale.agentId === agent.id)
        return {
          ...agent,
          salesCount: sales.length,
          totalAmount: sales.reduce((sum, sale) => sum + sale.totalAmount, 0),
          totalQuantity: sales.reduce((sum, sale) => sum + sale.quantity, 0)
        }
      })
      
      return agentStats.sort((a, b) => b.totalAmount - a.totalAmount)
    },
    
    // 获取销售统计数据
    getSalesStatistics: (state) => {
      const sales = Object.values(state.salesRecords)
      const totalSales = sales.length
      const totalAmount = sales.reduce((sum, sale) => sum + sale.totalAmount, 0)
      const totalQuantity = sales.reduce((sum, sale) => sum + sale.quantity, 0)
      
      // 按月份统计
      const monthlyStats = {}
      sales.forEach(sale => {
        const month = sale.saleDate.substring(0, 7) // YYYY-MM
        if (!monthlyStats[month]) {
          monthlyStats[month] = { count: 0, amount: 0, quantity: 0 }
        }
        monthlyStats[month].count++
        monthlyStats[month].amount += sale.totalAmount
        monthlyStats[month].quantity += sale.quantity
      })
      
      // 按地区统计
      const regionStats = {}
      sales.forEach(sale => {
        const region = sale.region
        if (!regionStats[region]) {
          regionStats[region] = { count: 0, amount: 0, quantity: 0 }
        }
        regionStats[region].count++
        regionStats[region].amount += sale.totalAmount
        regionStats[region].quantity += sale.quantity
      })
      
      return {
        total: { totalSales, totalAmount, totalQuantity },
        monthly: monthlyStats,
        region: regionStats
      }
    }
  },
  
  actions: {
    // 添加代理
    addAgent(agentData) {
      const id = 'agent' + String(Date.now()).slice(-6)
      const agent = {
        id,
        ...agentData,
        joinDate: new Date().toISOString().split('T')[0],
        status: 'active'
      }
      this.agents[id] = agent
      ElMessage.success('代理添加成功')
      return id
    },
    
    // 更新代理信息
    updateAgent(agentId, agentData) {
      if (this.agents[agentId]) {
        this.agents[agentId] = { ...this.agents[agentId], ...agentData }
        ElMessage.success('代理信息更新成功')
      }
    },
    
    // 删除代理
    deleteAgent(agentId) {
      if (this.agents[agentId]) {
        // 检查是否有下级代理
        const hasSubAgents = Object.values(this.agents).some(agent => agent.parentId === agentId)
        if (hasSubAgents) {
          ElMessage.error('该代理下还有下级成员，无法删除')
          return false
        }
        
        delete this.agents[agentId]
        ElMessage.success('代理删除成功')
        return true
      }
      return false
    },
    
    // 添加销售记录
    addSaleRecord(saleData) {
      const id = 'sale' + String(Date.now()).slice(-6)
      const sale = {
        id,
        ...saleData,
        saleDate: saleData.saleDate || new Date().toISOString().split('T')[0],
        status: 'completed'
      }
      this.salesRecords[id] = sale
      
      // 同步到账单管理
      this.syncSaleToTransaction(sale)
      
      ElMessage.success('销售记录添加成功')
      return id
    },
    
    // 同步销售记录到账单管理
    syncSaleToTransaction(sale) {
      const dataStore = useDataStore()
      
      // 创建收入交易记录
      const transaction = {
        type: 'income',
        amount: sale.totalAmount,
        category: 'sales',
        date: sale.saleDate,
        note: `销售收入 - ${sale.productName} x${sale.quantity} (客户: ${sale.customerName})`,
        metadata: {
          sourceType: 'sales',
          sourceId: sale.id,
          agentId: sale.agentId,
          productName: sale.productName,
          customerName: sale.customerName,
          region: sale.region,
          city: sale.city
        }
      }
      
      dataStore.addTransaction(transaction)
     },
     
     // 删除销售对应的账单记录
     removeSaleTransaction(saleId) {
       const dataStore = useDataStore()
       
       // 查找并删除对应的交易记录
       const transactions = dataStore.transactions
       const transactionToDelete = transactions.find(t => 
         t.metadata && t.metadata.sourceType === 'sales' && t.metadata.sourceId === saleId
       )
       
       if (transactionToDelete) {
         dataStore.deleteTransaction(transactionToDelete.id)
       }
     },
     
     // 更新销售记录
    updateSaleRecord(saleId, saleData) {
      if (this.salesRecords[saleId]) {
        this.salesRecords[saleId] = { ...this.salesRecords[saleId], ...saleData }
        ElMessage.success('销售记录更新成功')
      }
    },
    
    // 删除销售记录
    deleteSaleRecord(saleId) {
      if (this.salesRecords[saleId]) {
        // 删除对应的账单记录
        this.removeSaleTransaction(saleId)
        
        delete this.salesRecords[saleId]
        ElMessage.success('销售记录删除成功')
        return true
      }
      return false
    },
    
    // 设置时间范围
    setDateRange(start, end) {
      this.dateRange = { start, end }
    },
    
    // 设置筛选条件
    setFilters(filters) {
      this.filters = { ...this.filters, ...filters }
    },
    
    // 重置筛选条件
    resetFilters() {
      this.filters = {
        region: '',
        city: '',
        agentLevel: '',
        status: 'all'
      }
    },
    
    // 初始化时同步现有销售记录到账单管理
    initializeSalesSync() {
      const dataStore = useDataStore()
      
      // 检查是否已经同步过
      const existingSalesTransactions = dataStore.transactions.filter(t => 
        t.metadata && t.metadata.sourceType === 'sales'
      )
      
      // 如果没有销售相关的交易记录，则同步所有现有销售记录
      if (existingSalesTransactions.length === 0) {
        Object.values(this.salesRecords).forEach(sale => {
          this.syncSaleToTransaction(sale)
        })
      }
    }
  }
})