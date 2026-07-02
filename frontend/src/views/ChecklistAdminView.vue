<template>
    <div class="dashboard-container">
        <main class="content">
            <div class="gestion-seccion">
                <div class="titulo-acciones">
                    <h2>Control de Checklists Diarios</h2>
                    <button @click="cargarChecklists" class="btn-primary">Actualizar Lista</button>
                </div>

                <div class="tabla-contenedor">
                    <table>
                        <thead>
                            <tr>
                                <th>Fecha y Hora</th>
                                <th>Conductor</th>
                                <th>Vehículo</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr v-for="chk in listaChecklists" :key="chk.id">
                                <td>
                                    <strong>{{ chk.fecha }}</strong><br>
                                    <small class="text-muted">{{ chk.hora }}</small>
                                </td>
                                <td>{{ chk.conductor }}</td>
                                <td>{{ chk.placa }} ({{ chk.marca }})</td>
                                <td>
                                    <span
                                        :class="chk.apto_para_trabajar ? 'badge-estado disponible' : 'badge-estado mantenimiento'">
                                        {{ chk.apto_para_trabajar ? 'Apto' : 'No Apto / Falla' }}
                                    </span>
                                </td>
                                <td>
                                    <button @click="abrirModalDetalles(chk)" class="btn-primary">Ver Detalles</button>
                                </td>
                            </tr>
                            <tr v-if="listaChecklists.length === 0">
                                <td colspan="5" style="text-align: center; padding: 2rem;">No hay checklists registrados
                                    aún.</td>
                            </tr>
                        </tbody>
                    </table>
                </div>

                <div v-if="modalVisible" class="modal-overlay" @click.self="cerrarModal">
                    <div class="modal-content" style="max-width: 600px;">
                        <h3 style="margin-top: 0;">Detalles de Inspección</h3>

                        <div style="background: #f8fafc; padding: 1rem; border-radius: 6px; margin-bottom: 1.5rem;">
                            <p style="margin: 0 0 5px 0;"><strong>Conductor:</strong> {{ checklistSeleccionado.conductor
                                }}</p>
                            <p style="margin: 0 0 5px 0;"><strong>Vehículo:</strong> {{ checklistSeleccionado.placa }} -
                                {{ checklistSeleccionado.marca }}</p>
                            <p style="margin: 0;"><strong>Fecha:</strong> {{ checklistSeleccionado.fecha }} a las {{
                                checklistSeleccionado.hora }}</p>
                        </div>

                        <div class="form-vertical" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">

                            <div class="item-revision">
                                <span>Luces y Direccionales:</span>
                                <strong>{{ checklistSeleccionado.luces_ok ? '✅ Bien' : '❌ Falla' }}</strong>
                            </div>

                            <div class="item-revision">
                                <span>Frenos:</span>
                                <strong>{{ checklistSeleccionado.frenos_ok ? '✅ Bien' : '❌ Falla' }}</strong>
                            </div>

                            <div class="item-revision">
                                <span>Llantas:</span>
                                <strong>{{ checklistSeleccionado.llantas_ok ? '✅ Bien' : '❌ Falla' }}</strong>
                            </div>

                            <div class="item-revision">
                                <span>Niveles (Agua/Aceite):</span>
                                <strong>{{ checklistSeleccionado.aceite_agua_ok ? '✅ Bien' : '❌ Falla' }}</strong>
                            </div>

                            <div class="item-revision">
                                <span>Documentos:</span>
                                <strong>{{ checklistSeleccionado.documentos_ok ? '✅ Al día' : '❌ Faltante' }}</strong>
                            </div>

                            <div class="item-revision">
                                <span>Limpieza:</span>
                                <strong>{{ checklistSeleccionado.limpieza_ok ? '✅ Limpio' : '⚠️ Pendiente' }}</strong>
                            </div>

                        </div>

                        <div style="margin-top: 1.5rem; border-top: 1px solid #cbd5e1; padding-top: 1rem;">
                            <label><strong>Novedades / Observaciones:</strong></label>
                            <p
                                style="background: #fffbeb; padding: 0.8rem; border-radius: 4px; border: 1px solid #fde68a; min-height: 50px;">
                                {{ checklistSeleccionado.observaciones || 'Ninguna observación registrada por el conductor.' }}
                            </p>
                        </div>

                        <div class="modal-actions" style="margin-top: 1.5rem;">
                            <button @click="cerrarModal" class="btn-secondary">Cerrar</button>
                        </div>
                    </div>
                </div>
            </div>
        </main>
    </div>

</template>

<script setup>
import { ref, onMounted } from 'vue';

const listaChecklists = ref([]);
const modalVisible = ref(false);
const checklistSeleccionado = ref(null);

onMounted(() => {
    cargarChecklists();
});

const cargarChecklists = async () => {
    try {
        const res = await fetch('http://localhost:3000/api/admin/checklists', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });
        if (res.ok) {
            listaChecklists.value = await res.json();
        } else {
            console.error('Error cargando checklists');
        }
    } catch (error) {
        console.error('Fallo la conexión con el servidor', error);
    }
};

const abrirModalDetalles = (checklist) => {
    checklistSeleccionado.value = checklist;
    modalVisible.value = true;
};

const cerrarModal = () => {
    modalVisible.value = false;
    checklistSeleccionado.value = null;
};
</script>
