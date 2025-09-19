import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import { useSalesStore } from './sales'

// 角色定义及其权限
const ROLES = {
  admin: {
    name: '管理员',
    level: 0,
    permissions: ['view_all', 'edit_all', 'manage_agents', 'manage_system']
  },
  generalAgent: {
    name: '州总代理',
    level: 1,
    permissions: ['view_own_hierarchy', 'manage_own_agents', 'view_own_sales']
  },
  cityAgent: {
    name: '城市代理',
    level: 2,
    permissions: ['view_own_hierarchy', 'manage_own_agents', 'view_own_sales']
  },
  teamLeader: {
    name: '团队长',
    level: 3,
    permissions: ['view_own_team', 'manage_own_sales']
  },
  salesPerson: {
    name: '销售员',
    level: 4,
    permissions: ['view_own_sales', 'create_sales']
  }
}

export const useAuthStore = defineStore('auth', () => {
  const isLoggedIn = ref(false)
  const userInfo = ref({
    username: '',
    role: 'admin',
    agentId: null // 如果是代理，则关联到代理ID
  })
  
  // 角色定义
  const roles = ref(ROLES)

  // 登录
  const login = async (username, password) => {
    try {
      console.log('登录尝试:', username, password)
      
      // 模拟登录验证
      // 管理员登录
      if (username === 'admin' && password === 'admin123') {
        isLoggedIn.value = true
        userInfo.value = {
          username: username,
          role: 'admin',
          agentId: null
        }
        
        // 保存到本地存储
        sessionStorage.setItem('isLoggedIn', 'true')
        sessionStorage.setItem('userInfo', JSON.stringify(userInfo.value))
        
        ElMessage.success('管理员登录成功')
        return true
      } 
      // 代理登录 - 使用agent开头的账号
      else if (username.startsWith('agent') && password === 'agent123') {
        const salesStore = useSalesStore()
        // 确保代理ID格式正确（例如：agent001）
        const agentId = username.trim()
        
        console.log('检查代理:', agentId, '存在于:', Object.keys(salesStore.agents))
        const agent = salesStore.agents[agentId]
        
        if (!agent) {
          console.error('代理账号不存在:', agentId)
          ElMessage.error(`代理账号不存在: ${agentId}，请使用正确的代理账号（例如：agent001）`)
          return false
        }
        
        // 根据代理级别设置角色
        let role = 'salesPerson'
        if (agent.level === 1) role = 'generalAgent'
        else if (agent.level === 2) role = 'cityAgent'
        else if (agent.level === 3) role = 'teamLeader'
        
        console.log('代理角色:', role, '级别:', agent.level)
        
        isLoggedIn.value = true
        userInfo.value = {
          username: agent.name,
          role: role,
          agentId: agentId
        }
        
        // 保存到本地存储
        sessionStorage.setItem('isLoggedIn', 'true')
        sessionStorage.setItem('userInfo', JSON.stringify(userInfo.value))
        
        ElMessage.success(`${agent.name}登录成功`)
        return true
      } else {
        console.error('用户名或密码错误:', username, password)
        ElMessage.error('用户名或密码错误')
        return false
      }
    } catch (error) {
      console.error('登录错误:', error)
      ElMessage.error('登录失败，请重试')
      return false
    }
  }

  // 登出
  const logout = () => {
    isLoggedIn.value = false
    userInfo.value = {
      username: '',
      role: 'admin'
    }
    
    // 清除本地存储
    sessionStorage.removeItem('isLoggedIn')
    sessionStorage.removeItem('userInfo')
    
    ElMessage.success('已退出登录')
  }

  // 检查登录状态
  const checkLoginStatus = () => {
    const loginStatus = sessionStorage.getItem('isLoggedIn')
    const savedUserInfo = sessionStorage.getItem('userInfo')
    
    console.log('检查登录状态:', loginStatus, savedUserInfo)
    
    if (loginStatus === 'true' && savedUserInfo) {
      try {
        const parsedUserInfo = JSON.parse(savedUserInfo)
        console.log('恢复用户信息:', parsedUserInfo)
        
        isLoggedIn.value = true
        userInfo.value = parsedUserInfo
        
        console.log('登录状态已恢复:', isLoggedIn.value, userInfo.value)
        return true
      } catch (error) {
        console.error('解析用户信息失败:', error)
        // 清除无效的存储数据
        sessionStorage.removeItem('isLoggedIn')
        sessionStorage.removeItem('userInfo')
        return false
      }
    }
    
    return false
  }

  // 检查用户是否有特定权限
  const hasPermission = (permission) => {
    if (!isLoggedIn.value) return false
    
    const userRole = userInfo.value.role
    return roles.value[userRole].permissions.includes(permission)
  }
  
  // 获取用户可访问的代理ID列表
  const getAccessibleAgentIds = () => {
    if (!isLoggedIn.value) return []
    
    const salesStore = useSalesStore()
    const userRole = userInfo.value.role
    const agentId = userInfo.value.agentId
    
    // 管理员可以访问所有代理
    if (userRole === 'admin') {
      return Object.keys(salesStore.agents)
    }
    
    // 如果不是代理，返回空数组
    if (!agentId) return []
    
    // 获取当前代理及其下属代理
    return salesStore.getAgentHierarchy(agentId)
  }
  
  // 获取用户角色名称
  const getRoleName = () => {
    if (!isLoggedIn.value) return ''
    return roles.value[userInfo.value.role].name
  }
  
  return {
    isLoggedIn,
    userInfo,
    roles,
    login,
    logout,
    checkLoginStatus,
    hasPermission,
    getAccessibleAgentIds,
    getRoleName
  }
})