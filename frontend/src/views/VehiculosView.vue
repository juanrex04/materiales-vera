<template>
    <div class="dashboard-container">
        <main class="content">
            <div class="gestion-seccion">
                <div class="titulo-acciones">
                    <h3>Listado General de Vehículos</h3>
                    <button @click="abrirModalNuevo" class="btn-primary">Registrar Vehículo</button>
                </div>

                <ErrorBanner v-if="errorMensaje" :mensaje="errorMensaje" @cerrar="errorMensaje = ''" />

                <div class="filtros-container">
                    <div class="form-group filtro-item">
                        <label>Buscar por Placa:</label>
                        <input
                            type="text"
                            :value="filtros.placa"
                            @input="onPlacaInput"
                            placeholder="Ej: ABC-123"
                            maxlength="10"
                            class="input-busqueda"
                        />
                    </div>

                    <div class="form-group filtro-item">
                        <label>Estado Operativo:</label>
                        <select v-model="filtros.estado" class="input-busqueda">
                            <option value="">Todos los estados</option>
                            <option value="Disponible">Disponible</option>
                            <option value="Mantenimiento">Mantenimiento</option>
                        </select>
                    </div>

                    <div class="acciones-filtros">
                        <button type="button" @click="limpiarFiltros" class="btn-edit">
                            Limpiar Filtros
                        </button>
                    </div>
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
                                <td data-label="Placa"><strong>{{ v.placa }}</strong></td>
                                <td data-label="Marca">{{ v.marca }}</td>
                                <td data-label="Capacidad">{{ v.capacidad_carga_kg }} kg</td>
                                <td data-label="Estado"><span :class="['badge-estado', v.estado.toLowerCase().replace(' ', '-')]">{{
                                    v.estado }}</span></td>
                                <td data-label="SOAT"
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

                                <td data-label="Tecnomecánica"
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

                                <td data-label="Cambio Aceite"
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
                                <td data-label="Acciones">
                                    <div class="acciones-tabla">
                                        <button @click="abrirModalEditar(v)" class="btn-edit">Editar</button>
                                        <button @click="eliminarVehiculo(v.id)" class="btn-delete">Eliminar</button>
                                    </div>
                                </td>
                            </tr>
                            <EstadoVacioTabla
                                v-if="!cargando && listaVehiculos.length === 0"
                                :columnas="8"
                                :mensaje="errorMensaje ? 'No se pudieron cargar los vehículos.' : (filtrosActivos ? 'No se encontraron vehículos con los filtros aplicados.' : 'No hay vehículos registrados en el sistema.')"
                            />
                        </tbody>
                    </table>

                    <PaginadorTabla
                        v-model:pagina="pagina"
                        v-model:porPagina="porPagina"
                        :total="totalVehiculos"
                        :cargando="cargando"
                    />
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
import { ref, computed, onMounted, watch } from 'vue';
import { peticion } from '@/api';
import SkeletonTabla from '@/components/SkeletonTabla.vue';
import ErrorBanner from '@/components/ErrorBanner.vue';
import PaginadorTabla from '@/components/PaginadorTabla.vue';
import EstadoVacioTabla from '@/components/EstadoVacioTabla.vue';
import { iniciarCarga, detenerCarga } from '@/loading';
import { mostrarToast, confirmarAccion } from '@/utils/alertas';

const listaVehiculos = ref([]);
const cargando = ref(false);
const guardando = ref(false);
const errorMensaje = ref('');
const mostrarModal = ref(false);
const modoEdicion = ref(false);
const pagina = ref(1);
const porPagina = ref(10);
const totalVehiculos = ref(0);
const formulario = ref({ id: null, placa: '', marca: '', capacidad_carga_kg: '', estado: 'Disponible', fecha_soat: '', fecha_tecnomecanica: '', fecha_ultimo_cambio_aceite: ''});

const filtros = ref({
    placa: '',
    estado: ''
});

const filtrosActivos = computed(() => Boolean(filtros.value.placa.trim() || filtros.value.estado));

const sanitizarPlaca = (valor) => {
    if (!valor) return '';
    return valor.replace(/[^a-zA-Z0-9-]/g, '').toUpperCase().slice(0, 10);
};

const onPlacaInput = (evento) => {
    const limpia = sanitizarPlaca(evento.target.value);
    filtros.value.placa = limpia;
};

const limpiarFiltros = () => {
    filtros.value.placa = '';
    filtros.value.estado = '';
    pagina.value = 1;
    obtenerVehiculos();
};

let debounceTimer = null;
watch(() => filtros.value.placa, () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        pagina.value = 1;
        obtenerVehiculos();
    }, 300);
});

watch(() => filtros.value.estado, () => {
    pagina.value = 1;
    obtenerVehiculos();
});

watch([pagina, porPagina], () => { obtenerVehiculos(); });

onMounted(() => { obtenerVehiculos(); });

const obtenerVehiculos = async () => {
    cargando.value = true;
    errorMensaje.value = '';
    try {
        const params = new URLSearchParams({
            pagina: String(pagina.value),
            porPagina: String(porPagina.value)
        });

        const placaLimpia = sanitizarPlaca(filtros.value.placa.trim());
        if (placaLimpia) params.append('placa', placaLimpia);
        if (filtros.value.estado) params.append('estado', filtros.value.estado);

        const respuesta = await peticion(`/api/admin/vehiculos?${params.toString()}`);
        const normalizada = Array.isArray(respuesta) ? respuesta : (respuesta?.datos || []);
        listaVehiculos.value = normalizada;
        totalVehiculos.value = Array.isArray(respuesta) ? normalizada.length : (respuesta?.total || 0);

        const totalPaginas = Math.max(1, Math.ceil(totalVehiculos.value / porPagina.value));
        if (pagina.value > totalPaginas && totalPaginas > 0) {
            pagina.value = totalPaginas;
            obtenerVehiculos();
        }
    } catch (error) { errorMensaje.value = error.message; }
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
    const metodo = modoEdicion.value ? 'PUT' : 'POST';
    guardando.value = true;
    errorMensaje.value = '';
    try {
        await peticion(modoEdicion.value ? `/api/admin/vehiculos/${formulario.value.id}` : '/api/admin/vehiculos', {
            metodo: metodo,
            cuerpo: formulario.value
        });
        cerrarModal(); obtenerVehiculos();
        mostrarToast('success', modoEdicion.value ? 'Vehículo actualizado' : 'Vehículo registrado');
    } catch (error) {
        errorMensaje.value = error.message;
        mostrarToast('error', 'No se pudo guardar el vehículo', error.message);
    }
    finally { guardando.value = false; }
};

const eliminarVehiculo = async (id) => {
    const confirmado = await confirmarAccion(
        'Eliminar vehículo',
        '¿Estás seguro de eliminar este camión? Esta acción no se puede deshacer.'
    );
    if (!confirmado) return;
    iniciarCarga('Eliminando vehículo...');
    errorMensaje.value = '';
    try {
        await peticion(`/api/admin/vehiculos/${id}`, { metodo: 'DELETE' });
        obtenerVehiculos();
        mostrarToast('success', 'Vehículo eliminado');
    } catch (error) {
        errorMensaje.value = error.message;
        mostrarToast('error', 'No se pudo eliminar el vehículo', error.message);
    }
    finally { detenerCarga(); }
};

const formatearFecha = (c) => new Date(c).toLocaleDateString('es-ES', { year: 'numeric', month: 'short', day: 'numeric' });
</script>