import { defineStore } from 'pinia'
import { ref } from 'vue'
import { ElMessage } from 'element-plus'

export const useAuthStore = defineStore('auth', () => {
  const isLoggedIn = ref(false)
  const userInfo = ref({
    username: '',
    role: 'admin'
  })

  // 登录
  const login = async (username, password) => {
    try {
      // 模拟登录验证
      if (username === 'admin' && password === 'admin123') {
        isLoggedIn.value = true
        userInfo.value.username = username
        
        // 保存到本地存储
        sessionStorage.setItem('isLoggedIn', 'true')
        sessionStorage.setItem('userInfo', JSON.stringify(userInfo.value))
        
        ElMessage.success('登录成功')
        // 登录成功后可以在这里处理路由跳转
        // 例如: router.push('/dashboard')
        return true
      } else {
        ElMessage.error('用户名或密码错误')
        return false
      }
    } catch (error) {
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
    
    if (loginStatus === 'true' && savedUserInfo) {
      isLoggedIn.value = true
      userInfo.value = JSON.parse(savedUserInfo)
    }
  }

  return {
    isLoggedIn,
    userInfo,
    login,
    logout,
    checkLoginStatus
  }
})