<template>
    <div class="dashboard-container">
        <main class="content">
            <div class="gestion-seccion">
                <div class="titulo-acciones">
                    <h3>Listado General de Vehículos</h3>
                    <button @click="abrirModalNuevo" class="btn-primary">Registrar Vehículo</button>
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
                                <th>Cambio Aceite</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            <SkeletonTabla v-if="cargando" :columnas="8" :filas="5" />
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

                                <td
                                    :class="{ 'celda-roja': v.aceite_estado === 'VENCIDO', 'celda-amarilla': v.aceite_estado === 'PROXIMO' }">
                                    <template v-if="v.fecha_ultimo_cambio_aceite">
                                        <strong>{{ formatearFecha(v.fecha_ultimo_cambio_aceite) }}</strong>
                                        <div class="dias-texto">
                                            <span v-if="v.aceite_estado === 'VENCIDO'">Vencido hace {{
                                                Math.abs(v.aceite_dias_restantes) }} días</span>
                                            <span v-else-if="v.aceite_estado === 'PROXIMO'">Faltan {{
                                                v.aceite_dias_restantes }} días</span>
                                            <span v-else>Al día ({{ v.aceite_dias_restantes }} días)</span>
                                        </div>
                                    </template>
                                    <template v-else>
                                        <span class="badge-sin-dato">Sin registro</span>
                                    </template>
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
                                    required />
                            </div>
                            <div><label>Fecha Tecnomecánica:</label><input type="date"
                                    v-model="formulario.fecha_tecnomecanica" required />
                            </div>
                            <div>
                                <label>Último Cambio de Aceite:</label>
                                <input type="date" v-model="formulario.fecha_ultimo_cambio_aceite" required />
                            </div>
                        </div>
                        <div class="modal-actions">
                            <button type="button" @click="cerrarModal" class="btn-secondary">Cancelar</button>
                            <button type="submit" class="btn-primary" :disabled="guardando">
                                {{ guardando ? 'Guardando...' : 'Guardar' }}
                            </button>
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
import { API_URL } from '@/config';
import { decodificarToken } from '@/auth';
import SkeletonTabla from '@/components/SkeletonTabla.vue';
import { iniciarCarga, detenerCarga } from '@/loading';

const usuario = decodificarToken()
const rolUsuario = ref(usuario?.rol || '');
const router = useRouter();

const listaVehiculos = ref([]);
const cargando = ref(false);
const guardando = ref(false);
const mostrarModal = ref(false);
const modoEdicion = ref(false);
const formulario = ref({ id: null, placa: '', marca: '', capacidad_carga_kg: '', estado: 'Disponible', fecha_soat: '', fecha_tecnomecanica: '', fecha_ultimo_cambio_aceite: ''});

onMounted(() => { if (rolUsuario.value !== 'Admin') router.push('/dashboard'); obtenerVehiculos(); });

const obtenerVehiculos = async () => {
    cargando.value = true;
    try {
        const res = await fetch(`${API_URL}/api/admin/vehiculos`, { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
        listaVehiculos.value = await res.json();
    } catch (error) { console.error(error); }
    finally { cargando.value = false; }
};

const abrirModalNuevo = () => {
    modoEdicion.value = false;
    formulario.value = { id: null, placa: '', marca: '', capacidad_carga_kg: '', estado: 'Disponible', fecha_soat: '', fecha_tecnomecanica: '', fecha_ultimo_cambio_aceite: '' };
    mostrarModal.value = true;
};

const abrirModalEditar = (v) => {
    modoEdicion.value = true;
    formulario.value = { ...v, fecha_soat: v.fecha_soat.split('T')[0], fecha_tecnomecanica: v.fecha_tecnomecanica.split('T')[0], fecha_ultimo_cambio_aceite: v.fecha_ultimo_cambio_aceite ? v.fecha_ultimo_cambio_aceite.split('T')[0] : ''};
    mostrarModal.value = true;
};

const cerrarModal = () => mostrarModal.value = false;

const guardarVehiculo = async () => {
    const url = modoEdicion.value ? `${API_URL}/api/admin/vehiculos/${formulario.value.id}` : `${API_URL}/api/admin/vehiculos`;
    const metodo = modoEdicion.value ? 'PUT' : 'POST';
    guardando.value = true;
    try {
        await fetch(url, {
            method: metodo,
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: JSON.stringify(formulario.value)
        });
        cerrarModal(); obtenerVehiculos();
    } catch (error) { console.error(error); }
    finally { guardando.value = false; }
};

const eliminarVehiculo = async (id) => {
    if (!confirm('¿Eliminar este camión?')) return;
    iniciarCarga('Eliminando vehículo...');
    try {
        await fetch(`${API_URL}/api/admin/vehiculos/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
        obtenerVehiculos();
    } catch (error) { console.error(error); }
    finally { detenerCarga(); }
};

const formatearFecha = (c) => new Date(c).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
</script>