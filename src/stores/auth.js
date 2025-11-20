import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ElMessage } from 'element-plus'
import api from '@/api'

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
    name: '销售员',
    level: 3,
    permissions: ['view_own_team', 'manage_own_sales']
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
      
      // 调用API进行登录验证
      const response = await api.auth.login({ username, password })
      
      // 登录成功
      if (response && response.success) {
        // 兼容后端返回结构：优先使用 response.user，其次 response.data
        const userData = response.user || response.data || {}
        
        isLoggedIn.value = true
        userInfo.value = {
          username: userData.username || username,
          role: userData.role || 'user',
          agentId: userData.agentId || null
        }
        
        // 保存到本地存储
        sessionStorage.setItem('isLoggedIn', 'true')
        sessionStorage.setItem('userInfo', JSON.stringify(userInfo.value))
        sessionStorage.setItem('token', response.token)
        
        // 设置API请求头的认证令牌
        api.setAuthToken(response.token)
        
        ElMessage.success(`${userInfo.value.username}登录成功`)
        return true
      } else {
        console.error('登录失败:', response?.message || '用户名或密码错误')
        ElMessage.error(response?.message || '用户名或密码错误')
        return false
      }
    } catch (error) {
      console.error('登录错误:', error)
      ElMessage.error('登录失败，请重试')
      return false
    }
        
  }

  // 登出
  const logout = async () => {
    try {
      // 调用API登出
      if (isLoggedIn.value) {
        await api.auth.logout()
      }
    } catch (error) {
      console.error('登出API调用失败:', error)
    } finally {
      // 无论API调用成功与否，都重置本地状态
      isLoggedIn.value = false
      userInfo.value = {
        username: '',
        role: 'admin',
        agentId: null
      }
      
      // 清除本地存储
      sessionStorage.removeItem('isLoggedIn')
      sessionStorage.removeItem('userInfo')
      sessionStorage.removeItem('token')
      
      // 清除API认证令牌
      api.clearAuthToken()
      
      ElMessage.success('已退出登录')
    }
  }

  // 检查登录状态
  const checkLoginStatus = async () => {
    const loginStatus = sessionStorage.getItem('isLoggedIn')
    const savedUserInfo = sessionStorage.getItem('userInfo')
    const token = sessionStorage.getItem('token')
    
    console.log('检查登录状态:', loginStatus, savedUserInfo)
    
    if (loginStatus === 'true' && savedUserInfo && token) {
      try {
        // 设置API请求头的认证令牌
        api.setAuthToken(token)
        
        try {
          // 验证令牌有效性
          const response = await api.auth.verify()
          
          if (response && response.success) {
            // 尝试解析用户信息
            let parsedUserInfo
            try {
              parsedUserInfo = JSON.parse(savedUserInfo)
            } catch (e) {
              console.error('解析用户信息失败:', e)
              parsedUserInfo = { username: 'unknown', role: 'user' }
            }
            console.log('恢复用户信息:', parsedUserInfo)
            
            isLoggedIn.value = true
            userInfo.value = parsedUserInfo
          
            console.log('登录状态已恢复:', isLoggedIn.value, userInfo.value)
            return true
          } else {
            console.error('令牌验证失败，需要重新登录')
            // 清除无效的存储数据
            sessionStorage.removeItem('isLoggedIn')
            sessionStorage.removeItem('userInfo')
            sessionStorage.removeItem('token')
            return false
          }
        } catch (error) {
          console.error('验证登录状态失败:', error)
          // 清除无效的存储数据
          sessionStorage.removeItem('isLoggedIn')
          sessionStorage.removeItem('userInfo')
          sessionStorage.removeItem('token')
          return false
        }
      } catch (error) {
        console.error('登录状态检查失败:', error)
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
  

  
  // 获取用户角色名称
  const getRoleName = () => {
    if (!isLoggedIn.value || !userInfo.value || !userInfo.value.role) return ''
    return roles.value[userInfo.value.role]?.name || userInfo.value.role || ''
  }

  return {
    isLoggedIn,
    userInfo,
    roles,
    login,
    logout,
    checkLoginStatus,
    hasPermission,
    getRoleName
  }
})