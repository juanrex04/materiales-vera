<template>
    <div class="dashboard-container">
        <main class="content">
            <div class="gestion-seccion">
                <div class="titulo-acciones">
                    <h3>Listado de Colaboradores</h3>
                    <button @click="abrirModalNuevo" class="btn-primary">➕ Nuevo Colaborador</button>
                </div>

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
                            <tr v-for="c in listaColaboradores" :key="c.id">
                                <td><strong>{{ c.nombre }}</strong></td>
                                <td>{{ c.email }}</td>
                                <td><span :class="['badge-rol', c.rol.toLowerCase()]">{{ c.rol }}</span></td>
                                <td>{{ c.licencia_conducir || 'No Aplica' }}</td>
                                <td>
                                    <button @click="abrirModalEditar(c)" class="btn-edit">✏️ Editar</button>
                                    <button @click="eliminarColaborador(c.id)" class="btn-delete">🗑️ Eliminar</button>
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            <div v-if="mostrarModal" class="modal-overlay">
                <div class="modal-content">
                    <h3>{{ modoEdicion ? 'Editar Colaborador' : 'Registrar Nuevo Colaborador' }}</h3>
                    <form @submit.prevent="guardarColaborador">
                        <div class="form-vertical">
                            <div><label>Nombre Completo:</label><input v-model="formulario.nombre" required /></div>
                            <div><label>Email:</label><input type="email" v-model="formulario.email" required /></div>

                            <div v-if="!modoEdicion">
                                <label>Contraseña Inicial:</label>
                                <input type="password" v-model="formulario.password" required />
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

const listaColaboradores = ref([]);
const mostrarModal = ref(false);
const modoEdicion = ref(false);
const formulario = ref({ id: null, nombre: '', email: '', password: '', rol_id: 2, licencia_conducir: '' });

onMounted(() => { if (rolUsuario.value !== 'Admin') router.push('/dashboard'); obtenerColaboradores(); });

const obtenerColaboradores = async () => {
    try {
        const res = await fetch('http://localhost:3000/api/admin/colaboradores', { headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
        listaColaboradores.value = await res.json();
    } catch (error) { console.error(error); }
};

const abrirModalNuevo = () => {
    modoEdicion.value = false;
    formulario.value = { id: null, nombre: '', email: '', password: '', rol_id: 2, licencia_conducir: '' };
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
    const url = modoEdicion.value ? `http://localhost:3000/api/admin/colaboradores/${formulario.value.id}` : 'http://localhost:3000/api/admin/colaboradores';
    const metodo = modoEdicion.value ? 'PUT' : 'POST';

    await fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
        body: JSON.stringify(formulario.value)
    });
    cerrarModal(); obtenerColaboradores();
};

const eliminarColaborador = async (id) => {
    if (!confirm('¿Deseas desvincular a este colaborador del sistema?')) return;
    const res = await fetch(`http://localhost:3000/api/admin/colaboradores/${id}`, { method: 'DELETE', headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` } });
    if (!res.ok) {
        alert("No se puede eliminar un conductor si tiene un vehículo asignado.");
    } else {
        obtenerColaboradores();
    }
};

const cerrarSesion = () => { localStorage.clear(); router.push('/'); };
</script>