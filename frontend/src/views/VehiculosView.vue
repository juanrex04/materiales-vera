<template>
  <div class="dashboard-container">
    <header class="header">
      <h2>Materiales Vera - Flota</h2>
      <div class="nav-menu">
        <span class="user-tag">👤 {{ nombreUsuario }} [<strong>{{ rolUsuario }}</strong>]</span>
        <div class="admin-buttons">
          <button @click="router.push('/dashboard')" class="btn-nav">🏠 Inicio</button>
          <button @click="router.push('/vehiculos')" class="btn-nav activo">🚚 Vehículos</button>
          <button @click="router.push('/colaboradores')" class="btn-nav">👥 Trabajadores</button>
        </div>
        <button @click="cerrarSesion" class="btn-logout">Cerrar Sesión</button>
      </div>
    </header>

    <main class="content">
      <div class="gestion-seccion">
        <div class="titulo-acciones">
          <h3>Listado General de Vehículos</h3>
          <button @click="abrirModalNuevo" class="btn-primary">➕ Registrar Vehículo</button>
        </div>

        <div class="tabla-contenedor">
          <table>
            <thead>
              <tr>
                <th>Placa</th>
                <th>Marca</th>
                <th>Capacidad</th>
                <th>Estado operativo</th>
                <th>SOAT</th>
                <th>Tecnomecánica</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="v in listaVehiculos" :key="v.id">
                <td><strong>{{ v.placa }}</strong></td>
                <td>{{ v.marca }}</td>
                <td>{{ v.capacidad_carga_kg }} kg</td>
                <td><span :class="['badge-estado', v.estado.toLowerCase().replace(' ', '-')]">{{ v.estado }}</span></td>
                <td :class="{'celda-roja': v.soat_estado === 'VENCIDO', 'celda-amarilla': v.soat_estado === 'PROXIMO'}">
                  {{ formatearFecha(v.fecha_soat) }}
                </td>
                <td :class="{'celda-roja': v.tecno_estado === 'VENCIDO', 'celda-amarilla': v.tecno_estado === 'PROXIMO'}">
                  {{ formatearFecha(v.fecha_tecnomecanica) }}
                </td>
                <td>
                  <button @click="abrirModalEditar(v)" class="btn-edit">✏️ Editar</button>
                  <button @click="eliminarVehiculo(v.id)" class="btn-delete">🗑️ Eliminar</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div v-if="mostrarModal" class="modal-overlay">
        <div class="modal-content">
          <h3>{{ modoEdicion ? 'Modificar Datos del Vehículo' : 'Registrar Nuevo Vehículo' }}</h3>
          <form @submit.prevent="guardarVehiculo">
            <div class="form-grid">
              <div><label>Placa:</label><input v-model="formulario.placa" required placeholder="ABC-123" /></div>
              <div><label>Marca:</label><input v-model="formulario.marca" required /></div>
              <div><label>Capacidad (kg):</label><input type="number" v-model="formulario.capacidad_carga_kg" required /></div>
              <div>
                <label>Estado:</label>
                <select v-model="formulario.estado" required>
                  <option value="Disponible">Disponible</option>
                  <option value="En Ruta">En Ruta</option>
                  <option value="Mantenimiento">Mantenimiento</option>
                </select>
              </div>
              <div><label>Fecha SOAT:</label><input type="date" v-model="formulario.fecha_soat" required /></div>
              <div><label>Fecha Tecnomecánica:</label><input type="date" v-model="formulario.fecha_tecnomecanica" required /></div>
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

const nombreUsuario = ref(localStorage.getItem('nombre'));
const rolUsuario = ref(localStorage.getItem('rol'));
const router = useRouter();

const listaVehiculos = ref([]);
const mostrarModal = ref(false);
const modoEdicion = ref(false);
const formulario = ref({ id: null, placa: '', marca: '', capacidad_carga_kg: '', estado: 'Disponible', fecha_soat: '', fecha_tecnomecanica: '' });

onMounted(() => { if(rolUsuario.value !== 'Admin') router.push('/dashboard'); obtenerVehiculos(); });

const obtenerVehiculos = async () => {
  try {
    const res = await fetch('http://localhost:3000/api/admin/vehiculos', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }});
    listaVehiculos.value = await res.json();
  } catch (error) { console.error(error); }
};

const abrirModalNuevo = () => {
  modoEdicion.value = false;
  formulario.value = { id: null, placa: '', marca: '', capacidad_carga_kg: '', estado: 'Disponible', fecha_soat: '', fecha_tecnomecanica: '' };
  mostrarModal.value = true;
};

const abrirModalEditar = (v) => {
  modoEdicion.value = true;
  formulario.value = { ...v, fecha_soat: v.fecha_soat.split('T')[0], fecha_tecnomecanica: v.fecha_tecnomecanica.split('T')[0] };
  mostrarModal.value = true;
};

const cerrarModal = () => mostrarModal.value = false;

const guardarVehiculo = async () => {
  const url = modoEdicion.value ? `http://localhost:3000/api/admin/vehiculos/${formulario.value.id}` : 'http://localhost:3000/api/admin/vehiculos';
  const metodo = modoEdicion.value ? 'PUT' : 'POST';
  await fetch(url, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
    body: JSON.stringify(formulario.value)
  });
  cerrarModal(); obtenerVehiculos();
};

const eliminarVehiculo = async (id) => {
  if (!confirm('¿Eliminar este camión?')) return;
  await fetch(`http://localhost:3000/api/admin/vehiculos/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }});
  obtenerVehiculos();
};

const formatearFecha = (c) => new Date(c).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
const cerrarSesion = () => { localStorage.clear(); router.push('/'); };
</script>

<style scoped>
/* Copia los estilos base del Header descritos en el Paso 2 */
.dashboard-container { font-family: 'Segoe UI', sans-serif; background-color: #f8f9fa; min-height: 100vh; }
.header { display: flex; justify-content: space-between; align-items: center; background-color: #1e293b; color: white; padding: 1rem 2rem; }
.nav-menu { display: flex; align-items: center; gap: 1.5rem; }
.user-tag { font-size: 0.95rem; color: #cbd5e1; }
.admin-buttons { display: flex; gap: 0.5rem; }
.btn-nav { background-color: #334155; color: #94a3b8; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; }
.btn-nav.activo { background-color: #3b82f6; color: white; }
.btn-logout { background-color: #ef4444; color: white; border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer; font-weight: bold; }
.content { padding: 2rem; max-width: 1200px; margin: 0 auto; }

.gestion-seccion { background: white; padding: 1.5rem; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
.titulo-acciones { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1.5rem; }
.btn-primary { background-color: #2563eb; color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 6px; cursor: pointer; font-weight: bold; }
.btn-secondary { background-color: #64748b; color: white; border: none; padding: 0.6rem 1.2rem; border-radius: 6px; cursor: pointer; }
table { width: 100%; border-collapse: collapse; }
th, td { padding: 14px; border-bottom: 1px solid #e2e8f0; text-align: left; }
th { background-color: #f8fafc; color: #64748b; }
.btn-edit { background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 4px 8px; border-radius: 4px; cursor: pointer; margin-right: 5px; }
.btn-delete { background-color: #fef2f2; color: #ef4444; border: 1px solid #fee2e2; padding: 4px 8px; border-radius: 4px; cursor: pointer; }
.celda-roja { background-color: #fef2f2; color: #b91c1c; font-weight: bold; }
.celda-amarilla { background-color: #fffbeb; color: #b45309; font-weight: bold; }
.badge-estado { padding: 0.25rem 0.6rem; border-radius: 50px; font-size: 0.85rem; font-weight: bold; }
.badge-estado.disponible { background-color: #dcfce7; color: #16a34a; }
.badge-estado.en-ruta { background-color: #dbeafe; color: #2563eb; }
.badge-estado.mantenimiento { background-color: #fef3c7; color: #d97706; }

/* Modal */
.modal-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; justify-content: center; align-items: center; }
.modal-content { background: white; padding: 2rem; border-radius: 8px; width: 500px; }
.form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.5rem; }
.form-grid div { display: flex; flex-direction: column; text-align: left; }
input, select { padding: 0.5rem; border: 1px solid #cbd5e1; border-radius: 4px; margin-top: 4px; }
.modal-actions { display: flex; justify-content: flex-end; gap: 1rem; }
</style>