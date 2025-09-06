<template>
  <div class="login-container">
    <div class="login-background">
      <div class="background-overlay"></div>
    </div>
    
    <div class="login-content">
      <div class="login-box">
        <div class="login-header">
          <div class="logo">
            <el-icon size="40" color="#409EFF">
              <Management />
            </el-icon>
          </div>
          <h1 class="title">唐肽燃管理系统</h1>
          <p class="subtitle">企业一体化管理平台</p>
        </div>
        
        <el-form
          ref="loginFormRef"
          :model="loginForm"
          :rules="loginRules"
          class="login-form"
          @submit.prevent="handleLogin"
        >
          <el-form-item prop="username">
            <el-input
              v-model="loginForm.username"
              placeholder="请输入用户名"
              size="large"
              :prefix-icon="User"
              clearable
            />
          </el-form-item>
          
          <el-form-item prop="password">
            <el-input
              v-model="loginForm.password"
              type="password"
              placeholder="请输入密码"
              size="large"
              :prefix-icon="Lock"
              show-password
              clearable
              @keyup.enter="handleLogin"
            />
          </el-form-item>
          
          <el-form-item>
            <el-button
              type="primary"
              size="large"
              class="login-button"
              :loading="loading"
              @click="handleLogin"
            >
              {{ loading ? '登录中...' : '登录' }}
            </el-button>
          </el-form-item>
        </el-form>
        
        <div class="login-tips">
          <el-alert
            title="默认账号信息"
            type="info"
            :closable="false"
            show-icon
          >
            <template #default>
              <p>用户名: <strong>admin</strong></p>
              <p>密码: <strong>admin123</strong></p>
            </template>
          </el-alert>
        </div>
      </div>
    </div>
    
    <!-- 装饰性元素 -->
    <div class="decorative-elements">
      <div class="circle circle-1"></div>
      <div class="circle circle-2"></div>
      <div class="circle circle-3"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { User, Lock, Management } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const router = useRouter()
const authStore = useAuthStore()
const loginFormRef = ref()
const loading = ref(false)

// 表单数据
const loginForm = reactive({
  username: '',
  password: ''
})

// 表单验证规则
const loginRules = {
  username: [
    { required: true, message: '请输入用户名', trigger: 'blur' },
    { min: 2, max: 20, message: '用户名长度在 2 到 20 个字符', trigger: 'blur' }
  ],
  password: [
    { required: true, message: '请输入密码', trigger: 'blur' },
    { min: 6, max: 20, message: '密码长度在 6 到 20 个字符', trigger: 'blur' }
  ]
}

// 处理登录
const handleLogin = async () => {
  if (!loginFormRef.value) return
  
  try {
    const valid = await loginFormRef.value.validate()
    if (!valid) return
    
    loading.value = true
    
    const success = await authStore.login(loginForm.username, loginForm.password)
    
    if (success) {
      router.push('/dashboard')
    }
  } catch (error) {
    console.error('登录失败:', error)
    ElMessage.error('登录失败，请重试')
  } finally {
    loading.value = false
  }
}
</script>

<style lang="scss" scoped>
.login-container {
  position: relative;
  width: 100vw;
  height: 100vh;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.login-background {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  
  .background-overlay {
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.1);
  }
}

.login-content {
  position: relative;
  z-index: 10;
  width: 100%;
  max-width: 400px;
  padding: 0 20px;
}

.login-box {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(10px);
  border-radius: 16px;
  padding: 40px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.2);
  
  @media (max-width: 480px) {
    padding: 30px 20px;
    margin: 0 10px;
  }
}

.login-header {
  text-align: center;
  margin-bottom: 32px;
  
  .logo {
    margin-bottom: 16px;
  }
  
  .title {
    font-size: 28px;
    font-weight: 600;
    color: #2c3e50;
    margin: 0 0 8px 0;
    
    @media (max-width: 480px) {
      font-size: 24px;
    }
  }
  
  .subtitle {
    font-size: 14px;
    color: #7f8c8d;
    margin: 0;
  }
}

.login-form {
  .el-form-item {
    margin-bottom: 24px;
    
    &:last-child {
      margin-bottom: 0;
    }
  }
  
  .login-button {
    width: 100%;
    height: 48px;
    font-size: 16px;
    font-weight: 500;
    border-radius: 8px;
    background: linear-gradient(135deg, #409EFF 0%, #5dade2 100%);
    border: none;
    
    &:hover {
      background: linear-gradient(135deg, #337ecc 0%, #4a90c2 100%);
    }
  }
}

.login-tips {
  margin-top: 24px;
  
  :deep(.el-alert) {
    border-radius: 8px;
    
    .el-alert__content {
      p {
        margin: 4px 0;
        font-size: 13px;
        
        strong {
          color: var(--el-color-primary);
        }
      }
    }
  }
}

// 装饰性元素
.decorative-elements {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  overflow: hidden;
  
  .circle {
    position: absolute;
    border-radius: 50%;
    background: rgba(255, 255, 255, 0.1);
    animation: float 6s ease-in-out infinite;
    
    &.circle-1 {
      width: 120px;
      height: 120px;
      top: 10%;
      left: 10%;
      animation-delay: 0s;
    }
    
    &.circle-2 {
      width: 80px;
      height: 80px;
      top: 60%;
      right: 15%;
      animation-delay: 2s;
    }
    
    &.circle-3 {
      width: 60px;
      height: 60px;
      bottom: 20%;
      left: 20%;
      animation-delay: 4s;
    }
  }
}

@keyframes float {
  0%, 100% {
    transform: translateY(0px) rotate(0deg);
  }
  50% {
    transform: translateY(-20px) rotate(180deg);
  }
}

// 响应式设计
@media (max-width: 768px) {
  .login-container {
    padding: 20px;
  }
  
  .login-content {
    max-width: 100%;
  }
}

@media (max-width: 480px) {
  .decorative-elements .circle {
    display: none;
  }
}
</style>