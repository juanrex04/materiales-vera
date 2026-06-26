import { createRouter, createWebHistory } from 'vue-router'
import LoginView from '../views/LoginView.vue'
import DashboardView from '../views/DashboardView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      name: 'login',
      component: LoginView
    },
    {
      path: '/dashboard',
      name: 'dashboard',
      component: DashboardView,
      // Guardia de seguridad del Frontend
      beforeEnter: (to, from, next) => {
        const token = localStorage.getItem('token');
        if (token) {
          next(); // Si hay token, lo dejamos pasar
        } else {
          next('/'); // Si no hay token, lo devolvemos al login
        }
      }
    }
  ]
})

export default router