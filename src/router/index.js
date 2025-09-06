import { createRouter, createWebHistory } from 'vue-router'
import { useAuthStore } from '@/stores/auth'

const routes = [
  {
    path: '/login',
    name: 'Login',
    component: () => import('@/views/Login.vue'),
    meta: { requiresAuth: false }
  },
  {
    path: '/',
    name: 'Layout',
    component: () => import('@/layout/index.vue'),
    redirect: '/dashboard',
    meta: { requiresAuth: true },
    children: [
      {
        path: '/dashboard',
        name: 'Dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '财务概览', icon: 'DataAnalysis' }
      },
      {
        path: '/transactions',
        name: 'Transactions',
        component: () => import('@/views/Transactions.vue'),
        meta: { title: '账单管理', icon: 'Money' }
      },
      {
        path: '/budget',
        name: 'Budget',
        component: () => import('@/views/Budget.vue'),
        meta: { title: '预算管理', icon: 'Wallet' }
      },
      {
        path: '/inventory',
        name: 'Inventory',
        component: () => import('@/views/Inventory.vue'),
        meta: { title: '库存管理', icon: 'Box' }
      },
      {
        path: '/logistics',
        name: 'Logistics',
        component: () => import('@/views/Logistics.vue'),
        meta: { title: '物流管理', icon: 'Van' }
      }
    ]
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('@/views/404.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

// 路由守卫
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore()
  
  if (to.meta.requiresAuth && !authStore.isLoggedIn) {
    next('/login')
  } else if (to.path === '/login' && authStore.isLoggedIn) {
    next('/dashboard')
  } else {
    next()
  }
})

export default router