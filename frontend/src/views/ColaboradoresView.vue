<template>
    <div class="dashboard-container">
        <header class="header">
            <h2>Materiales Vera - Personal</h2>
            <div class="nav-menu">
                <span class="user-tag">👤 {{ nombreUsuario }} [<strong>{{ rolUsuario }}</strong>]</span>
                <div class="admin-buttons">
                    <button @click="router.push('/dashboard')" class="btn-nav">🏠 Inicio</button>
                    <button @click="router.push('/vehiculos')" class="btn-nav">🚚 Vehículos</button>
                    <button @click="router.push('/colaboradores')" class="btn-nav activo">👥 Trabajadores</button>
                </div>
                <button @click="cerrarSesion" class="btn-logout">Cerrar Sesión</button>
            </div>
        </header>

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

<style scoped>
/* Reutiliza los estilos base del Header y Tablas del Paso 3 */
.dashboard-container {
    font-family: 'Segoe UI', sans-serif;
    background-color: #f8f9fa;
    min-height: 100vh;
}

.header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    background-color: #1e293b;
    color: white;
    padding: 1rem 2rem;
}

.nav-menu {
    display: flex;
    align-items: center;
    gap: 1.5rem;
}

.user-tag {
    font-size: 0.95rem;
    color: #cbd5e1;
}

.admin-buttons {
    display: flex;
    gap: 0.5rem;
}

.btn-nav {
    background-color: #334155;
    color: #94a3b8;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
}

.btn-nav.activo {
    background-color: #3b82f6;
    color: white;
}

.btn-logout {
    background-color: #ef4444;
    color: white;
    border: none;
    padding: 0.5rem 1rem;
    border-radius: 6px;
    cursor: pointer;
    font-weight: bold;
}

.content {
    padding: 2rem;
    max-width: 1200px;
    margin: 0 auto;
}

.gestion-seccion {
    background: white;
    padding: 1.5rem;
    border-radius: 8px;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.titulo-acciones {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 1.5rem;
}

.btn-primary {
    background-color: #2563eb;
    color: white;
    border: none;
    padding: 0.6rem 1.2rem;
    border-radius: 6px;
    cursor: pointer;
    font-weight: bold;
}

.btn-secondary {
    background-color: #64748b;
    color: white;
    border: none;
    padding: 0.6rem 1.2rem;
    border-radius: 6px;
    cursor: pointer;
}

table {
    width: 100%;
    border-collapse: collapse;
}

th,
td {
    padding: 14px;
    border-bottom: 1px solid #e2e8f0;
    text-align: left;
}

th {
    background-color: #f8fafc;
    color: #64748b;
}

.btn-edit {
    background-color: #f1f5f9;
    border: 1px solid #cbd5e1;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
    margin-right: 5px;
}

.btn-delete {
    background-color: #fef2f2;
    color: #ef4444;
    border: 1px solid #fee2e2;
    padding: 4px 8px;
    border-radius: 4px;
    cursor: pointer;
}

.badge-rol {
    padding: 4px 10px;
    border-radius: 50px;
    font-weight: bold;
    font-size: 0.85rem;
}

.badge-rol.admin {
    background-color: #ede9fe;
    color: #6d28d9;
}

.badge-rol.conductor {
    background-color: #e0f2fe;
    color: #0369a1;
}

.modal-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    justify-content: center;
    align-items: center;
}

.modal-content {
    background: white;
    padding: 2rem;
    border-radius: 8px;
    width: 400px;
}

.form-vertical {
    display: flex;
    flex-direction: column;
    gap: 1rem;
    margin-bottom: 1.5rem;
}

.form-vertical div {
    display: flex;
    flex-direction: column;
    text-align: left;
}

input,
select {
    padding: 0.5rem;
    border: 1px solid #cbd5e1;
    border-radius: 4px;
    margin-top: 4px;
}

.modal-actions {
    display: flex;
    justify-content: flex-end;
    gap: 1rem;
}
</style>