import { createRouter, createWebHistory } from 'vue-router';
import { decodificarToken } from '@/auth';
import { iniciarCarga, detenerCarga } from '@/loading';
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
    { path: '/checklistAdmin', name: 'checklistadmin', component: ChecklistAdminView },
    { path: '/cambiar-password', name: 'cambiar-password', component: CambiarPasswordView }
  ]
});

router.beforeEach((to, from) => {
  const token = localStorage.getItem('token');
  const usuario = token ? decodificarToken(token) : null
  const debeCambiar = usuario?.debe_cambiar_password === true;

  if (!token && to.name !== 'login')
    return { name: 'login' };

  if (debeCambiar && to.name !== 'cambiar-password')
    return { name: 'cambiar-password' };

  const rutasAdmin = ['dashboard', 'vehiculos', 'colaboradores', 'checklistadmin'];
  if (usuario && usuario.rol !== 'Admin' && rutasAdmin.includes(to.name))
    return { name: 'login' };
});

router.beforeEach(() => {
  iniciarCarga('Cargando...');
});

router.afterEach(() => {
  detenerCarga();
});

export default router;