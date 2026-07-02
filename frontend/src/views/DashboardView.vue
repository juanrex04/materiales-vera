<template>
  <div class="dashboard-container">
    <header class="header">
      <h2>Materiales Vera - Panel de Control</h2>
      <div class="nav-menu">
        <span class="user-tag">{{ nombreUsuario }} [<strong>{{ rolUsuario }}</strong>]</span>
        <div v-if="rolUsuario === 'Admin'" class="admin-buttons">
          <button @click="router.push('/dashboard')" class="btn-nav activo">Inicio</button>
          <button @click="router.push('/vehiculos')" class="btn-nav">Vehículos</button>
          <button @click="router.push('/colaboradores')" class="btn-nav">Trabajadores</button>
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
