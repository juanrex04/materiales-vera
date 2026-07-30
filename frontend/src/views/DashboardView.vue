<template>
  <div class="dashboard-container">
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
import { decodificarToken } from '@/auth';
import { API_URL } from '@/config';

const nombreUsuario = ref('');
const usuario = decodificarToken()
const rolUsuario = ref(usuario?.rol || '');
const router = useRouter();
const alertasDocumentos = ref([]);

onMounted(() => {
  nombreUsuario.value = localStorage.getItem('nombre');
  if (rolUsuario.value === 'Admin') obtenerAlertas();
});

const obtenerAlertas = async () => {
  alertasDocumentos.value = [];
  try {
    const res = await fetch(`${API_URL}/api/admin/vehiculos`, {
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

      if (v.aceite_estado !== 'OK') {
        alertasDocumentos.value.push({
          id: `aceite-${v.id}`,
          placa: v.placa,
          gravedad: v.aceite_estado === 'VENCIDO' ? 'critica' : 'advertencia',
          mensaje: v.fecha_ultimo_cambio_aceite
            ? `Cambio de aceite ${v.aceite_estado === 'VENCIDO' ? 'VENCIDO hace' : 'próximo a vencer en'} ${Math.abs(v.aceite_dias_restantes)} días.`
            : `No tiene registro de cambio de aceite. Se requiere registro.`
        });
      }
    });
  } catch (error) { console.error(error); }
};

const cerrarSesion = () => { localStorage.clear(); router.push('/'); };
</script>
