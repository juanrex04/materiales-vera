<template>
    <div class="dashboard-container">
        <main class="content">
            <div class="gestion-seccion">
                <div class="titulo-acciones">
                    <h3>Listado de Colaboradores</h3>
                    <button @click="abrirModalNuevo" class="btn-primary"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg> Nuevo Colaborador</button>
                </div>

                <ErrorBanner v-if="errorMensaje" :mensaje="errorMensaje" @cerrar="errorMensaje = ''" />

                <div class="filtros-container">
                    <div class="form-group filtro-item">
                        <label>Buscar por Nombre:</label>
                        <input type="text" :value="filtros.nombre" @input="onNombreInput"
                            placeholder="Ej: Carlos, Juan..." maxlength="100" class="input-busqueda" />
                    </div>

                    <div class="form-group filtro-item">
                        <label>Rol del Sistema:</label>
                        <select v-model="filtros.rol" class="input-busqueda">
                            <option value="">Todos los roles</option>
                            <option value="Admin">Admin</option>
                            <option value="Conductor">Conductor</option>
                        </select>
                    </div>

                    <div class="acciones-filtros">
                        <button type="button" @click="limpiarFiltros" class="btn-edit">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
                            Limpiar Filtros
                        </button>
                    </div>
                </div>

                <div class="tabla-contenedor">
                    <table>
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Documento</th>
                                <th>Rol de Sistema</th>
                                <th>Licencia de Conducción</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            <SkeletonTabla v-if="cargando" :columnas="5" :filas="5" />
                            <tr v-for="c in listaColaboradores" :key="c.id">
                                <td data-label="Nombre"><strong>{{ c.nombre }}</strong></td>
                                <td data-label="Documento">{{ c.documento }}</td>
                                <td data-label="Rol">
                                    <span :class="['badge-rol', c.rol.toLowerCase()]">
                                        <span class="dot-indicador"></span>
                                        {{ c.rol }}
                                    </span>
                                </td>
                                <td data-label="Licencia">{{ c.licencia_conducir || 'No Aplica' }}</td>
                                <td data-label="Acciones">
                                    <div class="acciones-tabla">
                                        <button @click="abrirModalEditar(c)" class="btn-action btn-edit"
                                            title="Editar colaborador">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13"
                                                viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                                stroke-linecap="round" stroke-linejoin="round">
                                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7">
                                                </path>
                                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z">
                                                </path>
                                            </svg>
                                            <span>Editar</span>
                                        </button>
                                        <button @click="restablecerClave(c)" class="btn-action btn-reset"
                                            title="Restablecer clave">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13"
                                                viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                                stroke-linecap="round" stroke-linejoin="round">
                                                <circle cx="7.5" cy="15.5" r="5.5"></circle>
                                                <path d="m11.5 11.5 6-6"></path>
                                                <path d="m15.5 5.5 2 2"></path>
                                                <path d="m18 8 2 2"></path>
                                            </svg>
                                            <span>Clave</span>
                                        </button>
                                        <button @click="eliminarColaborador(c.id)" class="btn-action btn-delete"
                                            title="Desvincular colaborador">
                                            <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13"
                                                viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                                                stroke-linecap="round" stroke-linejoin="round">
                                                <polyline points="3 6 5 6 21 6"></polyline>
                                                <path
                                                    d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2">
                                                </path>
                                                <line x1="10" y1="11" x2="10" y2="17"></line>
                                                <line x1="14" y1="11" x2="14" y2="17"></line>
                                            </svg>
                                            <span>Eliminar</span>
                                        </button>
                                    </div>
                                </td>
                            </tr>
                            <EstadoVacioTabla v-if="!cargando && listaColaboradores.length === 0" :columnas="5"
                                :mensaje="errorMensaje ? 'No se pudieron cargar los colaboradores.' : (filtrosActivos ? 'No se encontraron colaboradores con los filtros aplicados.' : 'No hay colaboradores registrados en el sistema.')" />
                        </tbody>
                    </table>

                    <PaginadorTabla v-model:pagina="pagina" v-model:porPagina="porPagina" :total="totalColaboradores"
                        :cargando="cargando" />
                </div>
            </div>

            <BaseModal v-model="mostrarModal"
                :title="modoEdicion ? 'Editar Colaborador' : 'Registrar Nuevo Colaborador'">
                <form @submit.prevent="guardarColaborador">
                    <div class="form-vertical">
                        <div><label>Nombre Completo:</label><input v-model="formulario.nombre" required /></div>
                        <div><label>Documento:</label><input type="text" inputmode="numeric" pattern="[0-9]*"
                                maxlength="20" v-model="formulario.documento" placeholder="Ej: 1234567890" required />
                        </div>

                        <div v-if="!modoEdicion" class="aviso-password">
                            <p>La contraseña inicial será: <strong>12345</strong></p>
                            <p>El colaborador deberá cambiarla al iniciar sesión por primera vez.</p>
                        </div>

                        <div>
                            <label>Rol asignado:</label>
                            <select v-model="formulario.rol_id" required>
                                <option :value="1">Admin</option>
                                <option :value="2">Conductor</option>
                            </select>
                        </div>

                        <div v-if="formulario.rol_id === 2">
                            <label>Número de Licencia:</label>
                            <input v-model="formulario.licencia_conducir" placeholder="Ej: C2-12345" required />
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button type="submit" class="btn-primary" :disabled="guardando">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                            {{ guardando ? 'Guardando...' : 'Guardar' }}
                        </button>
                    </div>
                </form>
            </BaseModal>
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
import { decodificarToken } from '@/auth';
import BaseModal from '@/components/BaseModal.vue';

const listaColaboradores = ref([]);
const cargando = ref(false);
const errorMensaje = ref('');
const guardando = ref(false);
const mostrarModal = ref(false);
const modoEdicion = ref(false);
const pagina = ref(1);
const porPagina = ref(10);
const totalColaboradores = ref(0);
const formulario = ref({ id: null, nombre: '', documento: '', rol_id: 2, licencia_conducir: '' });

const filtros = ref({
    nombre: '',
    rol: ''
});

const filtrosActivos = computed(() => Boolean(filtros.value.nombre.trim() || filtros.value.rol));

const usuarioActual = decodificarToken();

const sanitizarNombre = (valor) => {
    if (!valor) return '';
    return valor.replace(/[^a-zA-ZÁÉÍÓÚÜÑáéíóúüñ '.0-9-]/g, '').slice(0, 100);
};

const onNombreInput = (evento) => {
    const limpio = sanitizarNombre(evento.target.value);
    filtros.value.nombre = limpio;
};

const limpiarFiltros = () => {
    filtros.value.nombre = '';
    filtros.value.rol = '';
    pagina.value = 1;
    obtenerColaboradores();
};

let debounceTimer = null;
watch(() => filtros.value.nombre, () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        pagina.value = 1;
        obtenerColaboradores();
    }, 300);
});

watch(() => filtros.value.rol, () => {
    pagina.value = 1;
    obtenerColaboradores();
});

watch([pagina, porPagina], () => { obtenerColaboradores(); });

onMounted(() => { obtenerColaboradores(); });

const obtenerColaboradores = async () => {
    cargando.value = true;
    errorMensaje.value = '';
    try {
        const params = new URLSearchParams({
            pagina: String(pagina.value),
            porPagina: String(porPagina.value)
        });

        const nombreLimpio = sanitizarNombre(filtros.value.nombre.trim());
        if (nombreLimpio) params.append('nombre', nombreLimpio);
        if (filtros.value.rol) params.append('rol', filtros.value.rol);
        if (usuarioActual?.id) params.append('excluirId', usuarioActual.id);

        const respuesta = await peticion(`/api/admin/colaboradores?${params.toString()}`);
        const normalizada = Array.isArray(respuesta) ? respuesta : (respuesta?.datos || []);
        listaColaboradores.value = normalizada;
        totalColaboradores.value = Array.isArray(respuesta) ? normalizada.length : (respuesta?.total || 0);

        const totalPaginas = Math.max(1, Math.ceil(totalColaboradores.value / porPagina.value));
        if (pagina.value > totalPaginas && totalPaginas > 0) {
            pagina.value = totalPaginas;
            obtenerColaboradores();
        }
    } catch (error) { errorMensaje.value = error.message; }
    finally { cargando.value = false; }
};

const abrirModalNuevo = () => {
    modoEdicion.value = false;
    formulario.value = { id: null, nombre: '', documento: '', rol_id: 2, licencia_conducir: '' };
    mostrarModal.value = true;
};

const abrirModalEditar = (c) => {
    modoEdicion.value = true;
    // Mapeamos el nombre del rol a su id de BD correspondiente para el select
    const idDelRol = c.rol === 'Admin' ? 1 : 2;
    formulario.value = { ...c, rol_id: idDelRol };
    mostrarModal.value = true;
};

const cerrarModal = () => mostrarModal.value = false;

const guardarColaborador = async () => {
    const url = modoEdicion.value ? `/api/admin/colaboradores/${formulario.value.id}` : '/api/admin/colaboradores';
    const metodo = modoEdicion.value ? 'PUT' : 'POST';

    guardando.value = true;
    errorMensaje.value = '';
    try {
        await peticion(url, { metodo: metodo, cuerpo: formulario.value });
        cerrarModal(); obtenerColaboradores();
        mostrarToast('success', modoEdicion.value ? 'Colaborador actualizado' : 'Colaborador registrado');
    } catch (error) {
        errorMensaje.value = error.message;
        mostrarToast('error', 'No se pudo guardar el colaborador', error.message);
    }
    finally { guardando.value = false; }
};

const restablecerClave = async (c) => {
    const confirmado = await confirmarAccion(
        'Restablecer clave',
        `¿Deseas restablecer la clave de ${c.nombre} a 12345? Deberá cambiarla al iniciar sesión.`
    );
    if (!confirmado) return;
    iniciarCarga('Restableciendo clave...');
    errorMensaje.value = '';
    try {
        await peticion(`/api/admin/colaboradores/${c.id}/reset-password`, { metodo: 'POST' });
        mostrarToast('success', `Clave de ${c.nombre} restablecida a 12345`);
    } catch (error) {
        mostrarToast('error', 'No se pudo restablecer la clave', error.message);
    }
    finally { detenerCarga(); }
};

const eliminarColaborador = async (id) => {
    const confirmado = await confirmarAccion(
        'Desvincular colaborador',
        '¿Deseas desvincular a este colaborador del sistema? Esta acción no se puede deshacer.'
    );
    if (!confirmado) return;
    iniciarCarga('Eliminando colaborador...');
    errorMensaje.value = '';
    try {
        await peticion(`/api/admin/colaboradores/${id}`, { metodo: 'DELETE' });
        obtenerColaboradores();
        mostrarToast('success', 'Colaborador desvinculado');
    } catch (error) {
        errorMensaje.value = error.message;
        mostrarToast('error', 'No se pudo desvincular el colaborador', error.message);
    }
    finally { detenerCarga(); }
};
</script>