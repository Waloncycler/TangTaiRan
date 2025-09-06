<template>
  <div class="error-page">
    <div class="error-content">
      <div class="error-illustration">
        <div class="error-number">404</div>
        <div class="error-icon">
          <el-icon size="120" color="#E6A23C">
            <WarningFilled />
          </el-icon>
        </div>
      </div>
      
      <div class="error-text">
        <h1 class="error-title">页面未找到</h1>
        <p class="error-description">
          抱歉，您访问的页面不存在或已被移除。
        </p>
        <p class="error-suggestion">
          请检查URL是否正确，或返回首页继续浏览。
        </p>
      </div>
      
      <div class="error-actions">
        <el-button type="primary" size="large" @click="goHome">
          <el-icon><HomeFilled /></el-icon>
          返回首页
        </el-button>
        <el-button size="large" @click="goBack">
          <el-icon><Back /></el-icon>
          返回上页
        </el-button>
      </div>
    </div>
    
    <!-- 装饰性元素 -->
    <div class="decorative-elements">
      <div class="floating-shape shape-1"></div>
      <div class="floating-shape shape-2"></div>
      <div class="floating-shape shape-3"></div>
      <div class="floating-shape shape-4"></div>
    </div>
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import { WarningFilled, HomeFilled, Back } from '@element-plus/icons-vue'

const router = useRouter()

// 返回首页
const goHome = () => {
  router.push('/dashboard')
}

// 返回上一页
const goBack = () => {
  if (window.history.length > 1) {
    router.go(-1)
  } else {
    router.push('/dashboard')
  }
}
</script>

<style lang="scss" scoped>
.error-page {
  position: relative;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
  overflow: hidden;
  padding: 20px;
}

.error-content {
  position: relative;
  z-index: 10;
  text-align: center;
  max-width: 600px;
  width: 100%;
}

.error-illustration {
  position: relative;
  margin-bottom: 40px;
  
  .error-number {
    font-size: 120px;
    font-weight: 900;
    color: #E6A23C;
    line-height: 1;
    margin-bottom: 20px;
    text-shadow: 0 4px 8px rgba(230, 162, 60, 0.3);
    
    @media (max-width: 768px) {
      font-size: 80px;
    }
  }
  
  .error-icon {
    animation: bounce 2s infinite;
  }
}

.error-text {
  margin-bottom: 40px;
  
  .error-title {
    font-size: 32px;
    font-weight: 600;
    color: #303133;
    margin: 0 0 16px 0;
    
    @media (max-width: 768px) {
      font-size: 24px;
    }
  }
  
  .error-description {
    font-size: 18px;
    color: #606266;
    margin: 0 0 12px 0;
    line-height: 1.6;
    
    @media (max-width: 768px) {
      font-size: 16px;
    }
  }
  
  .error-suggestion {
    font-size: 14px;
    color: #909399;
    margin: 0;
    line-height: 1.5;
  }
}

.error-actions {
  display: flex;
  gap: 16px;
  justify-content: center;
  flex-wrap: wrap;
  
  .el-button {
    min-width: 120px;
    height: 44px;
    border-radius: 8px;
    font-weight: 500;
    
    @media (max-width: 480px) {
      width: 100%;
      margin-bottom: 8px;
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
  
  .floating-shape {
    position: absolute;
    border-radius: 50%;
    background: rgba(64, 158, 255, 0.1);
    animation: float 6s ease-in-out infinite;
    
    &.shape-1 {
      width: 100px;
      height: 100px;
      top: 10%;
      left: 10%;
      animation-delay: 0s;
      background: rgba(103, 194, 58, 0.1);
    }
    
    &.shape-2 {
      width: 60px;
      height: 60px;
      top: 20%;
      right: 15%;
      animation-delay: 2s;
      background: rgba(230, 162, 60, 0.1);
    }
    
    &.shape-3 {
      width: 80px;
      height: 80px;
      bottom: 20%;
      left: 20%;
      animation-delay: 4s;
      background: rgba(245, 108, 108, 0.1);
    }
    
    &.shape-4 {
      width: 40px;
      height: 40px;
      bottom: 30%;
      right: 25%;
      animation-delay: 1s;
      background: rgba(64, 158, 255, 0.1);
    }
  }
}

// 动画
@keyframes bounce {
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-10px);
  }
  60% {
    transform: translateY(-5px);
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
  .error-page {
    padding: 16px;
  }
  
  .error-content {
    max-width: 100%;
  }
  
  .decorative-elements {
    .floating-shape {
      &.shape-1 {
        width: 60px;
        height: 60px;
      }
      
      &.shape-2 {
        width: 40px;
        height: 40px;
      }
      
      &.shape-3 {
        width: 50px;
        height: 50px;
      }
      
      &.shape-4 {
        display: none;
      }
    }
  }
}

@media (max-width: 480px) {
  .error-illustration {
    margin-bottom: 30px;
  }
  
  .error-text {
    margin-bottom: 30px;
  }
  
  .decorative-elements {
    .floating-shape {
      &.shape-2,
      &.shape-3 {
        display: none;
      }
    }
  }
}
</style>