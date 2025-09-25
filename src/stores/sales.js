import { defineStore } from 'pinia'
import { ElMessage } from 'element-plus'
import { useDataStore } from './data'
import { useAuthStore } from './auth'
import api from '@/api'

export const useSalesStore = defineStore('sales', {
  state: () => ({
    // 代理数据
    agents: {},
    
    // 销售记录
    salesRecords: {},
    
    // 加载状态
    loading: {
      agents: false,
      sales: false
    },
    
    // 错误信息
    error: {
      agents: null,
      sales: null
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
    // 根据当前用户权限过滤代理列表
    filteredAgents() {
      const authStore = useAuthStore()
      
      // 如果未登录，返回空对象
      if (!authStore.isLoggedIn) return {}
      
      // 管理员可以看到所有代理
      if (authStore.userInfo.role === 'admin') {
        return this.agents
      }
      
      // 获取当前用户可访问的代理ID列表
      const accessibleAgentIds = authStore.getAccessibleAgentIds()
      
      // 过滤出可访问的代理
      const result = {}
      accessibleAgentIds.forEach(agentId => {
        if (this.agents[agentId]) {
          result[agentId] = this.agents[agentId]
        }
      })
      
      return result
    },
    
    // 根据当前用户权限过滤销售记录
    filteredSalesRecords() {
      const authStore = useAuthStore()
      
      // 如果未登录，返回空对象
      if (!authStore.isLoggedIn) return {}
      
      // 管理员可以看到所有销售记录
      if (authStore.userInfo.role === 'admin') {
        return this.salesRecords
      }
      
      // 获取当前用户可访问的代理ID列表
      const accessibleAgentIds = authStore.getAccessibleAgentIds()
      
      // 过滤出可访问的销售记录
      return Object.values(this.salesRecords)
        .filter(record => accessibleAgentIds.includes(record.agentId))
        .reduce((acc, record) => {
          acc[record.id] = record
          return acc
        }, {})
    },
    // 获取代理层级名称
    getAgentLevelName: () => (level) => {
      const levelNames = {
        1: '州总代理',
        2: '城市代理', 
        3: '销售员'
      }
      return levelNames[level] || '未知'
    },
    
    // 获取代理的下级成员
    getSubAgents: (state) => (parentId) => {
      return Object.values(state.agents).filter(agent => agent.parentId === parentId)
    },
    
    // 获取代理的团队结构树
    getTeamTree: (state) => {
      const authStore = useAuthStore()
      
      // 获取过滤后的代理
      let agentsToUse = state.agents
      
      // 如果不是管理员，使用过滤后的数据
      if (authStore.isLoggedIn && authStore.userInfo.role !== 'admin') {
        const accessibleAgentIds = authStore.getAccessibleAgentIds()
        agentsToUse = accessibleAgentIds.reduce((acc, agentId) => {
          if (state.agents[agentId]) {
            acc[agentId] = state.agents[agentId]
          }
          return acc
        }, {})
      }
      
      // 找出所有顶级代理（没有上级的代理）或当前用户的代理（如果是代理登录）
      let rootId = null
      
      if (authStore.isLoggedIn && authStore.userInfo.agentId) {
        // 如果是代理登录，只显示自己为根节点的树
        rootId = authStore.userInfo.agentId
      }
      
      const buildTree = (parentId = rootId) => {
        return Object.values(agentsToUse)
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
      const authStore = useAuthStore()
      
      // 获取过滤后的销售记录
      let salesRecordsToUse = state.salesRecords
      let agentsToUse = state.agents
      
      // 如果不是管理员，使用过滤后的数据
      if (authStore.isLoggedIn && authStore.userInfo.role !== 'admin') {
        const accessibleAgentIds = authStore.getAccessibleAgentIds()
        salesRecordsToUse = Object.values(state.salesRecords)
          .filter(record => accessibleAgentIds.includes(record.agentId))
          .reduce((acc, record) => {
            acc[record.id] = record
            return acc
          }, {})
          
        agentsToUse = accessibleAgentIds.reduce((acc, agentId) => {
          if (state.agents[agentId]) {
            acc[agentId] = state.agents[agentId]
          }
          return acc
        }, {})
      }
      
      const agentStats = Object.values(agentsToUse).map(agent => {
        const sales = Object.values(salesRecordsToUse).filter(sale => sale.agentId === agent.id)
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
    // 初始化 - 加载代理数据
    async fetchAgents(options = {}) {
      this.loading.agents = true
      this.error.agents = null
      
      try {
        // 添加强制刷新参数
        const params = options.forceRefresh ? { _force: Date.now() } : {};
        const response = await api.agents.getAll(params)
        
        console.log('获取到的代理数据:', response)
        
        // 将数组转换为对象，以ID为键
        const agentsObj = {}
        if (response && response.data && Array.isArray(response.data)) {
          response.data.forEach(agent => {
            // 使用agent.id作为键，而不是_id
            agentsObj[agent.id] = {
              ...agent,
              // 确保id字段存在
              id: agent.id || agent._id,
              // 添加region和city字段，如果不存在
              region: agent.region || '未知区域',
              city: agent.city || '未知城市'
            }
          })
          console.log('处理后的代理数据:', agentsObj)
        } else {
          console.warn('获取代理数据格式不正确，使用空对象')
        }
        
        this.agents = agentsObj
      } catch (error) {
        console.error('获取代理数据失败:', error)
        this.error.agents = '获取代理数据失败'
        ElMessage.error('获取代理数据失败')
      } finally {
        this.loading.agents = false
      }
    },
    
    // 初始化 - 加载销售记录
    async fetchSales(params = {}) {
      this.loading.sales = true
      this.error.sales = null
      
      // 合并日期范围和筛选条件
      const queryParams = {
        ...params,
        startDate: this.dateRange.start || undefined,
        endDate: this.dateRange.end || undefined,
        ...this.filters,
        // 添加强制刷新参数
        _force: params.forceRefresh ? Date.now() : undefined
      }
      
      try {
        const response = await api.sales.getAll(queryParams)
        
        // 将数组转换为对象，以ID为键
        const salesObj = {}
        if (response && response.data && Array.isArray(response.data)) {
          response.data.forEach(sale => {
            salesObj[sale._id] = sale
          })
        } else {
          console.warn('获取销售记录格式不正确，使用空对象')
        }
        
        this.salesRecords = salesObj
      } catch (error) {
        console.error('获取销售记录失败:', error)
        this.error.sales = '获取销售记录失败'
        ElMessage.error('获取销售记录失败')
      } finally {
        this.loading.sales = false
      }
    },
    
    // 添加代理
    async addAgent(agentData) {
      try {
        const response = await api.agents.create(agentData)
        
        // 确保response有id属性
        const agentId = response.id || response._id
        
        if (!agentId) {
          console.error('添加代理返回的数据缺少ID')
          ElMessage.error('添加代理失败：返回数据格式错误')
          return null
        }
        
        // 更新本地存储 - 确保使用响应式更新
        this.agents = {
          ...this.agents,
          [agentId]: {
            ...response,
            id: agentId // 确保id字段存在
          }
        }
        
        ElMessage.success('代理添加成功')
        return agentId
      } catch (error) {
        console.error('添加代理失败:', error)
        ElMessage.error('添加代理失败')
        return null
      }
    },
    
    // 获取代理层级关系（当前代理及其所有下属代理）
    async getAgentHierarchy(agentId) {
      try {
        // 先检查本地是否有该代理
        if (!this.agents[agentId]) {
          // 尝试从API获取
          const agent = await api.agents.getById(agentId)
          if (!agent) return []
          
          // 更新本地存储
          this.agents[agent.id] = agent
        }
        
        // 递归获取所有下属代理
        const getAllSubordinates = (id) => {
          let result = [id]
          
          // 查找直接下属
          const directSubordinates = Object.values(this.agents)
            .filter(agent => agent.parentId === id)
            .map(agent => agent.id)
          
          // 递归获取每个直接下属的下属
          directSubordinates.forEach(subId => {
            result = result.concat(getAllSubordinates(subId))
          })
          
          return result
        }
        
        return getAllSubordinates(agentId)
      } catch (error) {
        console.error('获取代理层级关系失败:', error)
        ElMessage.error('获取代理层级关系失败')
        return []
      }
    },
    
    // 更新代理信息
    async updateAgent(agentId, agentData) {
      try {
        const response = await api.agents.update(agentId, agentData)
        
        // 更新本地存储
        this.agents[agentId] = { ...this.agents[agentId], ...response }
        
        ElMessage.success('代理信息更新成功')
        return true
      } catch (error) {
        console.error('更新代理信息失败:', error)
        ElMessage.error('更新代理信息失败')
        return false
      }
    },
    
    // 删除代理
    async deleteAgent(agentId) {
      try {
        // 检查是否有下级代理
        const hasSubAgents = Object.values(this.agents).some(agent => agent.parentId === agentId)
        if (hasSubAgents) {
          ElMessage.error('该代理下还有下级成员，无法删除')
          return false
        }
        
        await api.agents.delete(agentId)
        
        // 更新本地存储
        delete this.agents[agentId]
        
        ElMessage.success('代理删除成功')
        return true
      } catch (error) {
        console.error('删除代理失败:', error)
        ElMessage.error('删除代理失败')
        return false
      }
    },
    
    // 添加销售记录
    async addSaleRecord(saleData) {
      try {
        // 确保有销售日期
        const dataToSend = {
          ...saleData,
          saleDate: saleData.saleDate || new Date().toISOString().split('T')[0],
          status: saleData.status || 'completed'
        }
        
        const response = await api.sales.create(dataToSend)
        
        // 更新本地存储
        this.salesRecords[response.id] = response
        
        // 同步到账单管理
        await this.syncSaleToTransaction(response)
        
        ElMessage.success('销售记录添加成功')
        return response.id
      } catch (error) {
        console.error('添加销售记录失败:', error)
        ElMessage.error('添加销售记录失败')
        return null
      }
    },
    
    // 同步销售记录到账单管理
    async syncSaleToTransaction(sale) {
      try {
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
        
        await dataStore.addTransaction(transaction)
        return true
      } catch (error) {
        console.error('同步销售记录到账单失败:', error)
        return false
      }
     },
     
     // 删除销售对应的账单记录
     async removeSaleTransaction(saleId) {
       try {
         const dataStore = useDataStore()
         
         // 查找并删除对应的交易记录
         const transactions = dataStore.transactions
         const transactionToDelete = transactions.find(t => 
           t.metadata && t.metadata.sourceType === 'sales' && t.metadata.sourceId === saleId
         )
         
         if (transactionToDelete) {
           await dataStore.deleteTransaction(transactionToDelete.id)
         }
         return true
       } catch (error) {
         console.error('删除销售对应账单记录失败:', error)
         return false
       }
     },
     
     // 更新销售记录
    async updateSaleRecord(saleId, saleData) {
      try {
        const response = await api.sales.update(saleId, saleData)
        
        // 更新本地存储
        this.salesRecords[saleId] = { ...this.salesRecords[saleId], ...response }
        
        ElMessage.success('销售记录更新成功')
        return true
      } catch (error) {
        console.error('更新销售记录失败:', error)
        ElMessage.error('更新销售记录失败')
        return false
      }
    },
    
    // 删除销售记录
    async deleteSaleRecord(saleId) {
      try {
        // 先删除对应的账单记录
        await this.removeSaleTransaction(saleId)
        
        // 删除销售记录
        await api.sales.delete(saleId)
        
        // 更新本地存储
        delete this.salesRecords[saleId]
        
        ElMessage.success('销售记录删除成功')
        return true
      } catch (error) {
        console.error('删除销售记录失败:', error)
        ElMessage.error('删除销售记录失败')
        return false
      }
    },
    
    // 设置时间范围
    async setDateRange(start, end) {
      this.dateRange = { start, end }
      // 更新数据
      await this.fetchSales()
    },
    
    // 设置筛选条件
    async setFilters(filters) {
      this.filters = { ...this.filters, ...filters }
      // 更新数据
      await this.fetchSales()
    },
    
    // 重置筛选条件
    async resetFilters() {
      this.filters = {
        region: '',
        city: '',
        agentLevel: '',
        status: 'all'
      }
      // 更新数据
      await this.fetchSales()
    },
    
    // 初始化数据
    async initialize() {
      try {
        console.log('开始初始化销售数据...')
        
        // 加载代理数据
        await this.fetchAgents({forceRefresh: true})
        console.log('代理数据加载完成:', Object.keys(this.agents).length)
        
        // 加载销售记录
        await this.fetchSales({forceRefresh: true})
        console.log('销售记录加载完成:', Object.keys(this.salesRecords).length)
        
        // 同步销售记录到账单管理
        await this.initializeSalesSync()
        console.log('销售记录同步完成')
      } catch (error) {
        console.error('初始化数据失败:', error)
      }
    },
    
    // 强制刷新所有数据
    async refreshAllData() {
      try {
        console.log('强制刷新所有数据...')
        
        // 清空现有数据
        this.agents = {}
        this.salesRecords = {}
        
        // 重新加载所有数据
        await this.initialize()
        
        ElMessage.success('数据刷新成功')
        return true
      } catch (error) {
        console.error('数据刷新失败:', error)
        ElMessage.error('数据刷新失败')
        return false
      }
    },
    
    // 初始化时同步现有销售记录到账单管理
    async initializeSalesSync() {
      try {
        const dataStore = useDataStore()
        
        // 检查是否已经同步过
        const existingSalesTransactions = dataStore.transactions.filter(t => 
          t.metadata && t.metadata.sourceType === 'sales'
        )
        
        // 如果没有销售相关的交易记录，则同步所有现有销售记录
        if (existingSalesTransactions.length === 0) {
          const promises = Object.values(this.salesRecords).map(sale => 
            this.syncSaleToTransaction(sale)
          )
          
          await Promise.all(promises)
        }
        
        return true
      } catch (error) {
        console.error('初始化销售记录同步失败:', error)
        return false
      }
    }
  }
})