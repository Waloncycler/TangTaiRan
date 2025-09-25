<template>
  <div id="app">
    <router-view v-slot="{ Component }">
      <keep-alive>
        <component :is="Component" :key="$route?.path" />
      </keep-alive>
    </router-view>
  </div>
</template>

<script setup>
import { onMounted } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useSalesStore } from '@/stores/sales'
import { useDataStore } from '@/stores/data'

const authStore = useAuthStore()
const salesStore = useSalesStore()
const dataStore = useDataStore()

onMounted(async () => {
  // 检查本地存储的登录状态
  await authStore.checkLoginStatus()
  console.log('应用启动，登录状态:', authStore.isLoggedIn, '用户信息:', authStore.userInfo)
  
  // 如果用户已登录，初始化数据
  if (authStore.isLoggedIn) {
    try {
      // 初始化销售数据
      await salesStore.initialize()
      
      // 初始化其他数据（交易、物流、库存等）
      await dataStore.initialize()
      
      console.log('数据初始化完成')
    } catch (error) {
      console.error('数据初始化失败:', error)
    }
  }
})
</script>

<style lang="scss">
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Helvetica Neue', Helvetica, 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
  background-color: var(--el-bg-color);
  color: var(--el-text-color-primary);
}

#app {
  min-height: 100vh;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

// 响应式设计
@media (max-width: 768px) {
  .el-container {
    flex-direction: column;
  }
  
  .el-aside {
    width: 100% !important;
    height: auto !important;
  }
  
  .el-main {
    padding: 10px;
  }
}

// 自定义滚动条
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: var(--el-fill-color-lighter);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: var(--el-color-primary-light-5);
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: var(--el-color-primary);
}
</style>