<template>
    <div class="dashboard-container">
        <main class="content">
            <div class="gestion-seccion">
                <div class="titulo-acciones">
                    <h3>Listado de Colaboradores</h3>
                    <button @click="abrirModalNuevo" class="btn-primary">Nuevo Colaborador</button>
                </div>

                <ErrorBanner v-if="errorMensaje" :mensaje="errorMensaje" @cerrar="errorMensaje = ''" />

                <div class="tabla-contenedor">
                    <table>
                        <thead>
                            <tr>
                                <th>Nombre</th>
                                <th>Correo Electrónico</th>
                                <th>Rol de Sistema</th>
                                <th>Licencia de Conducción</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            <SkeletonTabla v-if="cargando" :columnas="5" :filas="5" />
                            <tr v-for="c in listaColaboradores" :key="c.id">
                                <td><strong>{{ c.nombre }}</strong></td>
                                <td>{{ c.email }}</td>
                                <td><span :class="['badge-rol', c.rol.toLowerCase()]">{{ c.rol }}</span></td>
                                <td>{{ c.licencia_conducir || 'No Aplica' }}</td>
                                <td>
                                    <div class="acciones-tabla">
                                        <button @click="abrirModalEditar(c)" class="btn-edit">Editar</button>
                                        <button @click="eliminarColaborador(c.id)" class="btn-delete">Eliminar</button>
                                    </div>
                                </td>
                            </tr>
                            <EstadoVacioTabla
                                v-if="!cargando && listaColaboradores.length === 0"
                                :columnas="5"
                                :mensaje="errorMensaje ? 'No se pudieron cargar los colaboradores.' : 'No hay colaboradores registrados en el sistema.'"
                            />
                        </tbody>
                    </table>

                    <PaginadorTabla
                        v-model:pagina="pagina"
                        v-model:porPagina="porPagina"
                        :total="totalColaboradores"
                        :cargando="cargando"
                    />
                </div>
            </div>

            <div v-if="mostrarModal" class="modal-overlay">
                <div class="modal-content">
                    <h3>{{ modoEdicion ? 'Editar Colaborador' : 'Registrar Nuevo Colaborador' }}</h3>
                    <form @submit.prevent="guardarColaborador">
                        <div class="form-vertical">
                            <div><label>Nombre Completo:</label><input v-model="formulario.nombre" required /></div>
                            <div><label>Email:</label><input type="email" v-model="formulario.email" required /></div>

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
import { ref, onMounted, watch } from 'vue';
import { peticion } from '@/api';
import SkeletonTabla from '@/components/SkeletonTabla.vue';
import ErrorBanner from '@/components/ErrorBanner.vue';
import PaginadorTabla from '@/components/PaginadorTabla.vue';
import EstadoVacioTabla from '@/components/EstadoVacioTabla.vue';
import { iniciarCarga, detenerCarga } from '@/loading';
import { mostrarToast, confirmarAccion } from '@/utils/alertas';

const listaColaboradores = ref([]);
const cargando = ref(false);
const errorMensaje = ref('');
const guardando = ref(false);
const mostrarModal = ref(false);
const modoEdicion = ref(false);
const pagina = ref(1);
const porPagina = ref(10);
const totalColaboradores = ref(0);
const formulario = ref({ id: null, nombre: '', email: '', rol_id: 2, licencia_conducir: '' });

onMounted(() => { obtenerColaboradores(); });

watch([pagina, porPagina], () => { obtenerColaboradores(); });

const obtenerColaboradores = async () => {
    cargando.value = true;
    errorMensaje.value = '';
    try {
        const respuesta = await peticion(`/api/admin/colaboradores?pagina=${pagina.value}&porPagina=${porPagina.value}`);
        const normalizada = Array.isArray(respuesta) ? respuesta : (respuesta?.datos || []);
        listaColaboradores.value = normalizada;
        totalColaboradores.value = Array.isArray(respuesta) ? normalizada.length : (respuesta?.total || 0);

        const totalPaginas = Math.max(1, Math.ceil(totalColaboradores.value / porPagina.value));
        if (pagina.value > totalPaginas) {
            pagina.value = totalPaginas;
            obtenerColaboradores();
        }
    } catch (error) { errorMensaje.value = error.message; }
    finally { cargando.value = false; }
};

const abrirModalNuevo = () => {
    modoEdicion.value = false;
    formulario.value = { id: null, nombre: '', email: '', rol_id: 2, licencia_conducir: '' };
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