import { createRouter, createWebHistory } from 'vue-router';
import LoginView from '../views/LoginView.vue';
import DashboardView from '../views/DashboardView.vue';
import VehiculosView from '../views/VehiculosView.vue';
import ColaboradoresView from '../views/ColaboradoresView.vue';
import ConductoresView from '../views/ConductorView.vue';
import ChecklistAdminView from '../views/ChecklistAdminView.vue';
import CambiarPasswordView from '../views/CambiarPasswordView.vue';

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', name: 'login', component: LoginView },
    { path: '/dashboard', name: 'dashboard', component: DashboardView },
    { path: '/vehiculos', name: 'vehiculos', component: VehiculosView },
    { path: '/colaboradores', name: 'colaboradores', component: ColaboradoresView },
    { path: '/conductores', name: 'conductores', component: ConductoresView },
    { path: '/checklistAdmin', name: 'chechlistadmin', component: ChecklistAdminView },
    { path: '/cambiar-password', name: 'cambiar-password', component: CambiarPasswordView }
  ]
});

// Opcional: Guardia de seguridad para evitar que entren sin token
router.beforeEach((to, from, next) => {
  const token = localStorage.getItem('token');
  const debeCambiar = localStorage.getItem('debe_cambiar_password') === 'true';

  if (!token && to.name !== 'login') {
    next({ name: 'login' });
  } else if (debeCambiar && to.name !== 'cambiar-password') {
    next({ name: 'cambiar-password' });
  } else {
    next();
  }
});

export default router;