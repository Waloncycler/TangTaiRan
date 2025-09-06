<template>
  <el-container class="layout-container">
    <!-- 移动端顶部导航栏 -->
    <el-header v-if="isMobile" class="mobile-header">
      <div class="mobile-header-content">
        <el-button 
          type="primary" 
          :icon="Menu" 
          @click="toggleMobileMenu"
          class="menu-toggle"
        />
        <h1 class="logo">唐肽燃管理系统</h1>
        <el-dropdown @command="handleCommand">
          <el-button type="primary" :icon="User" circle />
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="logout">
                <el-icon><SwitchButton /></el-icon>
                退出登录
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
    </el-header>

    <!-- 侧边栏 -->
    <el-aside 
      :width="asideWidth" 
      class="sidebar"
      :class="{ 'mobile-sidebar': isMobile, 'mobile-sidebar-open': mobileMenuOpen }"
    >
      <div class="sidebar-header" v-if="!isMobile">
        <h1 class="logo">唐肽燃管理系统</h1>
      </div>
      
      <el-menu
        :default-active="$route.path"
        class="sidebar-menu"
        :collapse="isCollapse && !isMobile"
        :unique-opened="true"
        router
      >
        <el-menu-item 
          v-for="route in menuRoutes" 
          :key="route.path" 
          :index="route.path"
          @click="handleMenuClick"
        >
          <el-icon><component :is="route.meta.icon" /></el-icon>
          <template #title>{{ route.meta.title }}</template>
        </el-menu-item>
      </el-menu>
      
      <div class="sidebar-footer" v-if="!isMobile">
        <el-button 
          type="text" 
          @click="toggleCollapse"
          class="collapse-btn"
        >
          <el-icon>
            <Expand v-if="isCollapse" />
            <Fold v-else />
          </el-icon>
        </el-button>
      </div>
    </el-aside>

    <!-- 移动端遮罩层 -->
    <div 
      v-if="isMobile && mobileMenuOpen" 
      class="mobile-overlay"
      @click="closeMobileMenu"
    ></div>

    <el-container>
      <!-- 桌面端顶部导航栏 -->
      <el-header v-if="!isMobile" class="main-header">
        <div class="header-content">
          <div class="header-left">
            <el-breadcrumb separator="/">
              <el-breadcrumb-item>管理系统</el-breadcrumb-item>
              <el-breadcrumb-item>{{ currentPageTitle }}</el-breadcrumb-item>
            </el-breadcrumb>
          </div>
          <div class="header-right">
            <el-dropdown @command="handleCommand">
              <div class="user-info">
                <el-avatar :size="32" :icon="UserFilled" />
                <span class="username">{{ authStore.userInfo.username }}</span>
                <el-icon class="el-icon--right"><arrow-down /></el-icon>
              </div>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="logout">
                    <el-icon><SwitchButton /></el-icon>
                    退出登录
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </el-header>

      <!-- 主内容区域 -->
      <el-main class="main-content">
        <router-view v-slot="{ Component }">
          <transition name="fade" mode="out-in">
            <component :is="Component" />
          </transition>
        </router-view>
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { 
  Menu, 
  User, 
  UserFilled, 
  ArrowDown, 
  SwitchButton, 
  Expand, 
  Fold,
  DataAnalysis,
  Money,
  Box,
  Van,
  TrendCharts
} from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'

const router = useRouter()
const route = useRoute()
const authStore = useAuthStore()

// 响应式状态
const isCollapse = ref(false)
const isMobile = ref(false)
const mobileMenuOpen = ref(false)

// 菜单路由
const menuRoutes = computed(() => {
  return router.getRoutes()
    .find(r => r.name === 'Layout')
    ?.children?.filter(child => child.meta?.title) || []
})

// 当前页面标题
const currentPageTitle = computed(() => {
  return route.meta?.title || '首页'
})

// 侧边栏宽度
const asideWidth = computed(() => {
  if (isMobile.value) return '250px'
  return isCollapse.value ? '64px' : '200px'
})

// 检查是否为移动端
const checkMobile = () => {
  isMobile.value = window.innerWidth <= 768
  if (!isMobile.value) {
    mobileMenuOpen.value = false
  }
}

// 切换侧边栏折叠状态
const toggleCollapse = () => {
  isCollapse.value = !isCollapse.value
}

// 切换移动端菜单
const toggleMobileMenu = () => {
  mobileMenuOpen.value = !mobileMenuOpen.value
}

// 关闭移动端菜单
const closeMobileMenu = () => {
  mobileMenuOpen.value = false
}

// 处理菜单点击
const handleMenuClick = () => {
  if (isMobile.value) {
    closeMobileMenu()
  }
}

// 处理下拉菜单命令
const handleCommand = (command) => {
  switch (command) {
    case 'logout':
      authStore.logout()
      router.push('/login')
      break
  }
}

// 监听窗口大小变化
onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
})
</script>

<style lang="scss" scoped>
.layout-container {
  height: 100vh;
}

// 移动端顶部导航栏
.mobile-header {
  background: var(--el-color-primary);
  border-bottom: 1px solid var(--el-border-color);
  padding: 0;
  height: 60px;
  
  .mobile-header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 100%;
    padding: 0 16px;
    
    .logo {
      color: white;
      font-size: 18px;
      font-weight: 600;
      margin: 0;
    }
    
    .menu-toggle {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.3);
      color: white;
      
      &:hover {
        background: rgba(255, 255, 255, 0.1);
      }
    }
  }
}

// 侧边栏
.sidebar {
  background: var(--el-bg-color);
  border-right: 1px solid var(--el-border-color);
  transition: all 0.3s ease;
  overflow: hidden;
  
  &.mobile-sidebar {
    position: fixed;
    top: 60px;
    left: 0;
    height: calc(100vh - 60px);
    z-index: 1000;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    
    &.mobile-sidebar-open {
      transform: translateX(0);
    }
  }
  
  .sidebar-header {
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-bottom: 1px solid var(--el-border-color);
    
    .logo {
      color: var(--el-color-primary);
      font-size: 20px;
      font-weight: 600;
      margin: 0;
    }
  }
  
  .sidebar-menu {
    border: none;
    height: calc(100% - 120px);
    
    .el-menu-item {
      height: 56px;
      line-height: 56px;
      
      &:hover {
        background-color: var(--el-color-primary-light-9);
      }
      
      &.is-active {
        background-color: var(--el-color-primary-light-8);
        color: var(--el-color-primary);
        
        &::before {
          content: '';
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 3px;
          background: var(--el-color-primary);
        }
      }
    }
  }
  
  .sidebar-footer {
    height: 60px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-top: 1px solid var(--el-border-color);
    
    .collapse-btn {
      color: var(--el-text-color-regular);
      
      &:hover {
        color: var(--el-color-primary);
      }
    }
  }
}

// 移动端遮罩层
.mobile-overlay {
  position: fixed;
  top: 60px;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
}

// 桌面端顶部导航栏
.main-header {
  background: var(--el-bg-color);
  border-bottom: 1px solid var(--el-border-color);
  padding: 0;
  height: 60px;
  
  .header-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 100%;
    padding: 0 24px;
    
    .header-left {
      .el-breadcrumb {
        font-size: 14px;
      }
    }
    
    .header-right {
      .user-info {
        display: flex;
        align-items: center;
        gap: 8px;
        cursor: pointer;
        padding: 8px 12px;
        border-radius: 6px;
        transition: background-color 0.3s;
        
        &:hover {
          background-color: var(--el-fill-color-light);
        }
        
        .username {
          font-size: 14px;
          color: var(--el-text-color-primary);
        }
      }
    }
  }
}

// 主内容区域
.main-content {
  background: var(--el-bg-color-page);
  padding: 24px;
  overflow-y: auto;
  
  @media (max-width: 768px) {
    padding: 16px;
  }
}

// 过渡动画
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>