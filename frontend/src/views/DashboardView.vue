<template>
  <div class="dashboard-container">
    <header class="header">
      <h2>Panel de Control - Materiales Vera</h2>
      <div class="user-info">
        <span>👤 {{ nombreUsuario }} | <strong>{{ rolUsuario }}</strong></span>
        <button @click="cerrarSesion" class="btn-logout">Cerrar Sesión</button>
      </div>
    </header>

    <main class="content">
      <section v-if="rolUsuario === 'Admin'">
        
        <div class="alertas-seccion">
          <h3>⚠️ Alertas de Documentación Crítica</h3>
          <div v-if="alertasDocumentos.length === 0" class="alerta-vacia">✅ Documentos al día.</div>
          <div v-else class="alertas-lista">
            <div v-for="alerta in alertasDocumentos" :key="alerta.id" :class="['alerta-tarjeta', alerta.gravedad]">
              <strong>{{ alerta.placa }}</strong>: {{ alerta.mensaje }}
            </div>
          </div>
        </div>

        <div class="gestion-seccion">
          <div class="titulo-acciones">
            <h3>Control y Gestión de Vehículos</h3>
            <div>
              <button @click="obtenerVehiculosAdmin" class="btn-secondary">🔄 Actualizar</button>
              <button @click="abrirModalNuevo" class="btn-primary">➕ Nuevo Vehículo</button>
            </div>
          </div>

          <div class="tabla-contenedor">
            <table>
              <thead>
                <tr>
                  <th>Placa</th>
                  <th>Marca</th>
                  <th>Estado</th>
                  <th>SOAT</th>
                  <th>Tecnomecánica</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="v in listaVehiculos" :key="v.id">
                  <td><strong>{{ v.placa }}</strong></td>
                  <td>{{ v.marca }}</td>
                  <td><span :class="['badge-estado', v.estado.toLowerCase()]">{{ v.estado }}</span></td>
                  <td :class="{'celda-roja': v.soat_estado === 'VENCIDO', 'celda-amarilla': v.soat_estado === 'PROXIMO'}">
                    {{ formatearFecha(v.fecha_soat) }} <br>
                    <small>{{ v.soat_dias_restantes }} días</small>
                  </td>
                  <td :class="{'celda-roja': v.tecno_estado === 'VENCIDO', 'celda-amarilla': v.tecno_estado === 'PROXIMO'}">
                    {{ formatearFecha(v.fecha_tecnomecanica) }} <br>
                    <small>{{ v.tecno_dias_restantes }} días</small>
                  </td>
                  <td>
                    <button @click="abrirModalEditar(v)" class="btn-edit">✏️</button>
                    <button @click="eliminarVehiculo(v.id)" class="btn-delete">🗑️</button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <div v-if="mostrarModal" class="modal-overlay">
        <div class="modal-content">
          <h3>{{ modoEdicion ? 'Editar Vehículo' : 'Registrar Nuevo Vehículo' }}</h3>
          <form @submit.prevent="guardarVehiculo">
            <div class="form-grid">
              <div>
                <label>Placa:</label>
                <input v-model="formulario.placa" required placeholder="Ej: ABC-123" />
              </div>
              <div>
                <label>Marca:</label>
                <input v-model="formulario.marca" required />
              </div>
              <div>
                <label>Capacidad (kg):</label>
                <input type="number" v-model="formulario.capacidad_carga_kg" required />
              </div>
              <div>
                <label>Estado:</label>
                <select v-model="formulario.estado" required>
                  <option value="Disponible">Disponible</option>
                  <option value="En Ruta">En Ruta</option>
                  <option value="Mantenimiento">Mantenimiento</option>
                </select>
              </div>
              <div>
                <label>Fecha SOAT:</label>
                <input type="date" v-model="formulario.fecha_soat" required />
              </div>
              <div>
                <label>Fecha Tecnomecánica:</label>
                <input type="date" v-model="formulario.fecha_tecnomecanica" required />
              </div>
            </div>
            <div class="modal-actions">
              <button type="button" @click="cerrarModal" class="btn-secondary">Cancelar</button>
              <button type="submit" class="btn-primary">💾 Guardar</button>
            </div>
          </form>
        </div>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';

const nombreUsuario = ref('');
const rolUsuario = ref('');
const router = useRouter();

const listaVehiculos = ref([]);
const alertasDocumentos = ref([]);

// Variables del Modal
const mostrarModal = ref(false);
const modoEdicion = ref(false);
const formulario = ref({ id: null, placa: '', marca: '', capacidad_carga_kg: '', estado: 'Disponible', fecha_soat: '', fecha_tecnomecanica: '' });

onMounted(() => {
  nombreUsuario.value = localStorage.getItem('nombre');
  rolUsuario.value = localStorage.getItem('rol');
  if (rolUsuario.value === 'Admin') obtenerVehiculosAdmin();
});

const cerrarSesion = () => { localStorage.clear(); router.push('/'); };

const formatearFecha = (cadena) => new Date(cadena).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
const formatearParaInput = (cadena) => new Date(cadena).toISOString().split('T')[0]; // Convierte fecha al formato YYYY-MM-DD para el input type="date"

// --- LECTURA ---
const obtenerVehiculosAdmin = async () => {
  alertasDocumentos.value = [];
  try {
    const res = await fetch('http://localhost:3000/api/admin/vehiculos', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }});
    const datos = await res.json();
    listaVehiculos.value = datos;

    datos.forEach(v => {
      if (v.soat_estado !== 'OK') alertasDocumentos.value.push({ id: `soat-${v.id}`, placa: v.placa, gravedad: v.soat_estado === 'VENCIDO' ? 'critica' : 'advertencia', mensaje: `SOAT ${v.soat_estado === 'VENCIDO' ? 'vencido' : 'vence en'} ${Math.abs(v.soat_dias_restantes)} días.` });
      if (v.tecno_estado !== 'OK') alertasDocumentos.value.push({ id: `tecno-${v.id}`, placa: v.placa, gravedad: v.tecno_estado === 'VENCIDO' ? 'critica' : 'advertencia', mensaje: `Tecnomecánica ${v.tecno_estado === 'VENCIDO' ? 'vencida' : 'vence en'} ${Math.abs(v.tecno_dias_restantes)} días.` });
    });
  } catch (error) { console.error(error); }
};

// --- MODAL LOGIC ---
const abrirModalNuevo = () => {
  modoEdicion.value = false;
  formulario.value = { id: null, placa: '', marca: '', capacidad_carga_kg: '', estado: 'Disponible', fecha_soat: '', fecha_tecnomecanica: '' };
  mostrarModal.value = true;
};

const abrirModalEditar = (vehiculo) => {
  modoEdicion.value = true;
  formulario.value = { 
    ...vehiculo, 
    fecha_soat: formatearParaInput(vehiculo.fecha_soat), 
    fecha_tecnomecanica: formatearParaInput(vehiculo.fecha_tecnomecanica) 
  };
  mostrarModal.value = true;
};

const cerrarModal = () => mostrarModal.value = false;

// --- CREAR Y ACTUALIZAR ---
const guardarVehiculo = async () => {
  const url = modoEdicion.value ? `http://localhost:3000/api/admin/vehiculos/${formulario.value.id}` : 'http://localhost:3000/api/admin/vehiculos';
  const metodo = modoEdicion.value ? 'PUT' : 'POST';

  try {
    await fetch(url, {
      method: metodo,
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify(formulario.value)
    });
    cerrarModal();
    obtenerVehiculosAdmin(); // Recargar la lista
  } catch (error) { alert('Error al guardar vehículo'); }
};

// --- ELIMINAR ---
const eliminarVehiculo = async (id) => {
  if (!confirm('¿Estás seguro de que deseas eliminar este vehículo? Esta acción no se puede deshacer.')) return;
  try {
    await fetch(`http://localhost:3000/api/admin/vehiculos/${id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    obtenerVehiculosAdmin(); // Recargar la lista
  } catch (error) { alert('Error al eliminar'); }
};
</script>

<style scoped>
/* Estilos anteriores combinados con los nuevos del Modal */
.dashboard-container { font-family: 'Segoe UI', sans-serif; background-color: #f8f9fa; min-height: 100vh; }
.header { display: flex; justify-content: space-between; align-items: center; background-color: #1e293b; color: white; padding: 1rem 2rem; }
.btn-logout { background-color: #ef4444; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; }
.content { padding: 2rem; max-width: 1300px; margin: 0 auto; }
.alertas-seccion, .gestion-seccion { background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); margin-bottom: 2rem; }
.alerta-vacia { color: #16a34a; background-color: #f0fdf4; padding: 1rem; border-radius: 6px; }
.alerta-tarjeta { padding: 0.75rem; border-radius: 6px; border-left: 5px solid; margin-top: 0.5rem; }
.critica { background-color: #fef2f2; border-color: #ef4444; color: #991b1b; }
.advertencia { background-color: #fffbeb; border-color: #f59e0b; color: #92400e; }
.titulo-acciones { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; }
.btn-primary { background-color: #3b82f6; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; margin-left: 0.5rem;}
.btn-secondary { background-color: #64748b; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; }
.btn-edit { background: none; border: none; cursor: pointer; font-size: 1.2rem; }
.btn-delete { background: none; border: none; cursor: pointer; font-size: 1.2rem; color: red; }
table { width: 100%; border-collapse: collapse; text-align: left; }
th, td { padding: 12px; border-bottom: 1px solid #e2e8f0; }
th { background-color: #f8fafc; }
.celda-roja { background-color: #fef2f2; color: #b91c1c; }
.celda-amarilla { background-color: #fffbeb; color: #b45309; }
.badge-estado { padding: 0.25rem 0.6rem; border-radius: 50px; font-size: 0.85rem; font-weight: bold; }
.badge-estado.disponible { background-color: #dcfce7; color: #16a34a; }
.badge-estado.en-ruta { background-color: #dbeafe; color: #2563eb; }
.badge-estado.mantenimiento { background-color: #fef3c7; color: #d97706; }

/* Modal Styles */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; }
.modal-content { background: white; padding: 2rem; border-radius: 8px; width: 100%; max-width: 500px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; }
.form-grid div { display: flex; flex-direction: column; }
input, select { padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 4px; margin-top: 0.25rem; }
.modal-actions { display: flex; justify-content: flex-end; gap: 1rem; }
</style>