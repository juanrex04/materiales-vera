<template>
  <div class="dashboard-container">
    <header class="header">
      <h2>Materiales Vera - Portal Conductor</h2>
      <div class="nav-menu">
        <span class="user-tag">👤 {{ nombreUsuario }} [<strong>{{ rolUsuario }}</strong>]</span>
        <div class="admin-buttons">
          <button class="btn-nav activo">📋 Mi Checklist</button>
        </div>
        <button @click="cerrarSesion" class="btn-logout">Cerrar Sesión</button>
      </div>
    </header>

    <main class="content">
      <div class="bienvenida-card">
        <h3>¡Buen día, {{ nombreUsuario }}!</h3>
        <p>Recuerda que tu seguridad es primero. Completa el checklist diario para habilitar tu vehículo antes de iniciar la ruta.</p>
      </div>

      <div class="gestion-seccion checklist-container">
        <div v-if="mensajeExito" class="alerta-vacia" style="margin-bottom: 1.5rem;">
          ✅ {{ mensajeExito }}
        </div>

        <form v-if="!checklistEnviado" @submit.prevent="enviarChecklist">
          <div class="form-group">
            <label for="vehiculoSelect">Selecciona tu Vehículo para Hoy:</label>
            <select v-model="formulario.vehiculo_id" id="vehiculoSelect" required @change="vehiculoSeleccionado = true">
              <option value="" disabled>-- Selecciona un vehículo disponible --</option>
              <option v-for="v in listaVehiculos" :key="v.id" :value="v.id">
                Placa: {{ v.placa }} - {{ v.marca }} ({{ v.estado }})
              </option>
            </select>
            <small v-if="listaVehiculos.length === 0" class="error">
              No hay vehículos disponibles en este momento o todos ya fueron revisados.
            </small>
          </div>

          <div v-if="vehiculoSeleccionado" class="checklist-box">
            <h3>Puntos de Inspección</h3>
            <p style="color: #64748b; font-size: 0.9rem; margin-bottom: 1rem;">
              Marca las casillas para confirmar el buen estado de cada ítem. Los puntos marcados con * son obligatorios.
            </p>

            <div class="form-vertical">
              <label class="checklist-item">
                <input type="checkbox" v-model="formulario.luces_ok" required />
                <div class="item-info">
                  <strong>Luces y Direccionales *</strong>
                  <small>Verifiqué luces altas, bajas, direccionales y de freno.</small>
                </div>
              </label>

              <label class="checklist-item">
                <input type="checkbox" v-model="formulario.frenos_ok" required />
                <div class="item-info">
                  <strong>Sistema de Frenos *</strong>
                  <small>Presión del pedal óptima y freno de emergencia funcional.</small>
                </div>
              </label>

              <label class="checklist-item">
                <input type="checkbox" v-model="formulario.llantas_ok" required />
                <div class="item-info">
                  <strong>Llantas y Repuesto *</strong>
                  <small>Presión correcta y labrado seguro.</small>
                </div>
              </label>

              <label class="checklist-item">
                <input type="checkbox" v-model="formulario.aceite_agua_ok" required />
                <div class="item-info">
                  <strong>Niveles de Líquidos *</strong>
                  <small>Aceite, agua/refrigerante y líquido de frenos verificados.</small>
                </div>
              </label>

              <label class="checklist-item">
                <input type="checkbox" v-model="formulario.documentos_ok" required />
                <div class="item-info">
                  <strong>Documentación *</strong>
                  <small>SOAT y Tecnomecánica vigentes y a bordo.</small>
                </div>
              </label>
              
              <label class="checklist-item">
                <input type="checkbox" v-model="formulario.limpieza_ok" />
                <div class="item-info">
                  <strong>Aseo del Vehículo (Opcional)</strong>
                  <small>Cabina y exterior limpios.</small>
                </div>
              </label>
            </div>

            <div class="form-group" style="margin-top: 1.5rem;">
              <label for="observaciones">Novedades u Observaciones:</label>
              <textarea 
                v-model="formulario.observaciones" 
                id="observaciones" 
                rows="3" 
                placeholder="Describe cualquier detalle (ej: rayón en la puerta, ruido en el motor)..."
                style="width: 100%; padding: 0.6rem; border: 1px solid var(--border-color); border-radius: 4px;"
              ></textarea>
            </div>

            <div class="modal-actions" style="margin-top: 1.5rem;">
              <button type="submit" class="btn-primary" :disabled="guardando">
                {{ guardando ? 'Guardando...' : '🚀 Finalizar Revisión e Iniciar Ruta' }}
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const nombreUsuario = ref(localStorage.getItem('nombre'));
const rolUsuario = ref(localStorage.getItem('rol'));

// Variables de estado
const listaVehiculos = ref([]);
const vehiculoSeleccionado = ref(false);
const guardando = ref(false);
const mensajeExito = ref('');
const checklistEnviado = ref(false);

const formulario = ref({
  vehiculo_id: '',
  luces_ok: false,
  frenos_ok: false,
  llantas_ok: false,
  aceite_agua_ok: false,
  documentos_ok: false,
  limpieza_ok: false,
  observaciones: ''
});

onMounted(() => {
  // Seguridad: si entra alguien que no es conductor, lo pateamos al dashboard
  if (rolUsuario.value !== 'Conductor') {
    router.push('/dashboard');
    return;
  }
  cargarVehiculosDisponibles();
});

const cargarVehiculosDisponibles = async () => {
  try {
    const res = await fetch('http://localhost:3000/api/conductor/vehiculos-disponibles', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    
    if (res.ok) {
      listaVehiculos.value = await res.json();
    } else {
      console.error('Error cargando vehículos');
    }
  } catch (error) {
    console.error('Fallo la conexión con el servidor', error);
  }
};

const enviarChecklist = async () => {
  guardando.value = true;
  
  try {
    const res = await fetch('http://localhost:3000/api/conductor/checklist', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify(formulario.value)
    });

    const data = await res.json();

    if (res.ok) {
      mensajeExito.value = "¡Checklist registrado exitosamente! Ya puedes iniciar tu ruta con el vehículo seleccionado.";
      checklistEnviado.value = true;
    } else {
      alert(data.error || 'Ocurrió un error al guardar el checklist.');
    }
  } catch (error) {
    alert('Error de conexión. Inténtalo de nuevo.');
  } finally {
    guardando.value = false;
  }
};

const cerrarSesion = () => {
  localStorage.clear();
  router.push('/');
};
</script>