<template>
  <div class="dashboard-container">
    <header class="header">
      <h2>Materiales Vera - Panel de Control</h2>
      <div class="nav-menu">
        <span class="user-tag">👤 {{ nombreUsuario }} [<strong>{{ rolUsuario }}</strong>]</span>
        <div v-if="rolUsuario === 'Admin'" class="admin-buttons">
          <button @click="router.push('/dashboard')" class="btn-nav activo">🏠 Inicio</button>
          <button @click="router.push('/vehiculos')" class="btn-nav">🚚 Vehículos</button>
          <button @click="router.push('/colaboradores')" class="btn-nav">👥 Trabajadores</button>
        </div>
        <button @click="cerrarSesion" class="btn-logout">Cerrar Sesión</button>
      </div>
    </header>

    <main class="content">
      <section v-if="rolUsuario === 'Admin'">
        <div class="bienvenida-card">
          <h3>¡Bienvenido de nuevo, {{ nombreUsuario }}!</h3>
          <p>Desde aquí puedes monitorear el estado operativo y legal de Materiales Vera en tiempo real.</p>
        </div>

        <div class="alertas-seccion">
          <h3>⚠️ Alertas de Documentación Urgente</h3>
          <div v-if="alertasDocumentos.length === 0" class="alerta-vacia">
            ✅ Excelente: Todos los vehículos de la flota tienen sus documentos al día.
          </div>
          <div v-else class="alertas-lista">
            <div v-for="alerta in alertasDocumentos" :key="alerta.id" :class="['alerta-tarjeta', alerta.gravedad]">
              <strong>Camión Placa {{ alerta.placa }}</strong>: {{ alerta.mensaje }}
            </div>
          </div>
        </div>
      </section>

      <section v-if="rolUsuario === 'Conductor'">
        <h3>Mi Herramienta de Trabajo</h3>
        <button @click="cargarMiVehiculo" class="btn-primary">Ver mi vehículo asignado</button>
        </section>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const nombreUsuario = ref('');
const rolUsuario = ref('');
const router = useRouter();
const alertasDocumentos = ref([]);

onMounted(() => {
  nombreUsuario.value = localStorage.getItem('nombre');
  rolUsuario.value = localStorage.getItem('rol');
  if (rolUsuario.value === 'Admin') obtenerAlertas();
});

const obtenerAlertas = async () => {
  alertasDocumentos.value = [];
  try {
    const res = await fetch('http://localhost:3000/api/admin/vehiculos', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    const datos = await res.json();
    
    datos.forEach(v => {
      if (v.soat_estado !== 'OK') {
        alertasDocumentos.value.push({
          id: `soat-${v.id}`, placa: v.placa, gravedad: v.soat_estado === 'VENCIDO' ? 'critica' : 'advertencia',
          mensaje: `El SOAT está ${v.soat_estado === 'VENCIDO' ? 'VENCIDO hace' : 'próximo a vencer en'} ${Math.abs(v.soat_dias_restantes)} días.`
        });
      }
      if (v.tecno_estado !== 'OK') {
        alertasDocumentos.value.push({
          id: `tecno-${v.id}`, placa: v.placa, gravedad: v.tecno_estado === 'VENCIDO' ? 'critica' : 'advertencia',
          mensaje: `La Tecnomecánica está ${v.tecno_estado === 'VENCIDO' ? 'VENCIDA hace' : 'próxima a vencer en'} ${Math.abs(v.tecno_dias_restantes)} días.`
        });
      }
    });
  } catch (error) { console.error(error); }
};

const cerrarSesion = () => { localStorage.clear(); router.push('/'); };
</script>

<style scoped>
/* Estilos globales del Layout Reutilizable */
.dashboard-container { font-family: 'Segoe UI', sans-serif; background-color: #f8f9fa; min-height: 100vh; }
.header { display: flex; justify-content: space-between; align-items: center; background-color: #1e293b; color: white; padding: 1rem 2rem; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
.nav-menu { display: flex; align-items: center; gap: 1.5rem; }
.user-tag { font-size: 0.95rem; color: #cbd5e1; }
.admin-buttons { display: flex; gap: 0.5rem; }
.btn-nav { background-color: #334155; color: #94a3b8; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-weight: 500; transition: all 0.3s; }
.btn-nav:hover { background-color: #475569; color: white; }
.btn-nav.activo { background-color: #3b82f6; color: white; }
.btn-logout { background-color: #ef4444; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-weight: bold; }

.content { padding: 2rem; max-width: 1200px; margin: 0 auto; }
.bienvenida-card { background: linear-gradient(135deg, #1e3a8a, #3b82f6); color: white; padding: 1.5rem; border-radius: 8px; margin-bottom: 2rem; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
.bienvenida-card h3 { margin: 0 0 0.5rem 0; }
.bienvenida-card p { margin: 0; opacity: 0.9; }

.alertas-seccion { background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
.alerta-vacia { color: #16a34a; background-color: #f0fdf4; padding: 1rem; border-radius: 6px; font-weight: 500; text-align: center; }
.alertas-lista { display: flex; flex-direction: column; gap: 0.75rem; }
.alerta-tarjeta { padding: 1rem; border-radius: 6px; border-left: 5px solid; text-align: left; }
.critica { background-color: #fef2f2; border-color: #ef4444; color: #991b1b; }
.advertencia { background-color: #fffbeb; border-color: #f59e0b; color: #92400e; }
</style>