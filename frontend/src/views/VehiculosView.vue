<template>
    <div class="dashboard-container">
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
                                <td><span :class="['badge-estado', v.estado.toLowerCase().replace(' ', '-')]">{{
                                        v.estado }}</span></td>
                                <td
                                    :class="{ 'celda-roja': v.soat_estado === 'VENCIDO', 'celda-amarilla': v.soat_estado === 'PROXIMO' }">
                                    <strong>{{ formatearFecha(v.fecha_soat) }}</strong>
                                    <div class="dias-texto">
                                        <span v-if="v.soat_estado === 'VENCIDO'">Vencido hace {{
                                            Math.abs(v.soat_dias_restantes) }} días</span>
                                        <span v-else-if="v.soat_estado === 'PROXIMO'">Faltan {{ v.soat_dias_restantes
                                            }} días</span>
                                        <span v-else>Al día ({{ v.soat_dias_restantes }} días)</span>
                                    </div>
                                </td>

                                <td
                                    :class="{ 'celda-roja': v.tecno_estado === 'VENCIDO', 'celda-amarilla': v.tecno_estado === 'PROXIMO' }">
                                    <strong>{{ formatearFecha(v.fecha_tecnomecanica) }}</strong>
                                    <div class="dias-texto">
                                        <span v-if="v.tecno_estado === 'VENCIDO'">Vencido hace {{
                                            Math.abs(v.tecno_dias_restantes) }} días</span>
                                        <span v-else-if="v.tecno_estado === 'PROXIMO'">Faltan {{
                                            v.tecno_dias_restantes }} días</span>
                                        <span v-else>Al día ({{ v.tecno_dias_restantes }} días)</span>
                                    </div>
                                </td>
                                <td>
                                    <button @click="abrirModalEditar(v)" class="btn-edit">Editar</button>
                                    <button @click="eliminarVehiculo(v.id)" class="btn-delete">Eliminar</button>
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
                            <div><label>Placa:</label><input v-model="formulario.placa" required
                                    placeholder="ABC-123" /></div>
                            <div><label>Marca:</label><input v-model="formulario.marca" required /></div>
                            <div><label>Capacidad (kg):</label><input type="number"
                                    v-model="formulario.capacidad_carga_kg" required /></div>
                            <div>
                                <label>Estado:</label>
                                <select v-model="formulario.estado" required>
                                    <option value="Disponible">Disponible</option>
                                    <option value="En Ruta">En Ruta</option>
                                    <option value="Mantenimiento">Mantenimiento</option>
                                </select>
                            </div>
                            <div><label>Fecha SOAT:</label><input type="date" v-model="formulario.fecha_soat"
                                    required /></div>
                            <div><label>Fecha Tecnomecánica:</label><input type="date"
                                    v-model="formulario.fecha_tecnomecanica" required /></div>
                        </div>
                        <div class="modal-actions">
                            <button type="button" @click="cerrarModal" class="btn-secondary">Cancelar</button>
                            <button type="submit" class="btn-primary">Guardar</button>
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

onMounted(() => { if (rolUsuario.value !== 'Admin') router.push('/dashboard'); obtenerVehiculos(); });

const obtenerVehiculos = async () => {
    try {
        const res = await fetch('http://localhost:3000/api/admin/vehiculos', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
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
    await fetch(`http://localhost:3000/api/admin/vehiculos/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
    obtenerVehiculos();
};

const formatearFecha = (c) => new Date(c).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
const cerrarSesion = () => { localStorage.clear(); router.push('/'); };
</script>