import { createRouter, createWebHistory } from 'vue-router';
import LoginView from '../views/LoginView.vue';
import DashboardView from '../views/DashboardView.vue';
import VehiculosView from '../views/VehiculosView.vue';
import ColaboradoresView from '../views/ColaboradoresView.vue';
import ConductoresView from '../views/ConductorView.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'login', component: LoginView },
    { path: '/dashboard', name: 'dashboard', component: DashboardView },
    { path: '/vehiculos', name: 'vehiculos', component: VehiculosView },
    { path: '/colaboradores', name: 'colaboradores', component: ColaboradoresView },
    { path: '/conductores', name: 'conductores', component: ConductoresView }
  ]
});

// Opcional: Guardia de seguridad para evitar que entren sin token
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token');
  if (to.name !== 'login' && !token) next({ name: 'login' });
  else next();
});

export default router;