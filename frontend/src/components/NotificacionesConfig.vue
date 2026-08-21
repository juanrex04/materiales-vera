<template>
  <div class="gestion-seccion">
    <div class="titulo-acciones">
      <h3>Destinatarios de Alertas WhatsApp</h3>
      <button class="btn-primary" @click="abrirFormulario()"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg> Agregar Destinatario</button>
    </div>

    <div v-if="cargando" class="cargando-texto">Cargando destinatarios...</div>

    <div v-else-if="destinatarios.length === 0" class="alerta-vacia">
      No hay destinatarios configurados. Agrega administradores para recibir alertas por WhatsApp.
    </div>

    <div v-else class="tabla-contenedor">
      <table>
        <thead>
          <tr>
            <th>Nombre</th>
            <th>Teléfono</th>
            <th>Estado</th>
            <th>Acciones</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="dest in destinatarios" :key="dest.id">
            <td data-label="Nombre"><strong>{{ dest.nombre }}</strong></td>
            <td data-label="Teléfono">{{ dest.telefono }}</td>
            <td data-label="Estado">
              <span :class="dest.recibir_alertas ? 'badge-estatus-activo' : 'badge-estatus-inactivo'">
                <span class="dot-indicador"></span>
                {{ dest.recibir_alertas ? 'Activo' : 'Inactivo' }}
              </span>
            </td>
            <td data-label="Acciones">
              <div class="acciones-tabla">
                <button class="btn-action btn-edit" @click="abrirFormulario(dest)" title="Editar destinatario">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                  <span>Editar</span>
                </button>
                <button class="btn-action btn-delete" @click="eliminar(dest.id)" title="Eliminar destinatario">
                  <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    <line x1="10" y1="11" x2="10" y2="17"></line>
                    <line x1="14" y1="11" x2="14" y2="17"></line>
                  </svg>
                  <span>Eliminar</span>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Modal formulario -->
    <BaseModal v-model="modalVisible" :title="editando ? 'Editar Destinatario' : 'Agregar Destinatario'">
      <form @submit.prevent="guardar" class="form-vertical">
        <div class="form-group">
          <label>Colaborador</label>
          <select v-model="formulario.colaborador_id" :disabled="editando" required>
            <option value="">Seleccionar administrador...</option>
            <option v-for="c in colaboradores" :key="c.id" :value="c.id">
              {{ c.nombre }}
            </option>
          </select>
        </div>

        <div class="form-group">
          <label>Teléfono colombiano</label>
          <div class="telefono-input-group">
            <span class="telefono-prefix">+57</span>
            <input
              v-model="formulario.telefono"
              type="tel"
              placeholder="3001234567"
              required
              maxlength="10"
              pattern="\d{10}"
            />
          </div>
        </div>

        <div class="form-group">
          <label class="toggle-label-container">
            <span class="toggle-texto">Recibir alertas por WhatsApp</span>
            <label class="toggle-switch">
              <input type="checkbox" v-model="formulario.recibir_alertas" />
              <span class="toggle-slider"></span>
            </label>
          </label>
        </div>

        <div class="acciones-formulario">
          <button type="submit" class="btn-primary" :disabled="guardando">
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            {{ guardando ? 'Guardando...' : 'Guardar' }}
          </button>
          <button type="button" class="btn-edit" @click="modalVisible = false"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg> Cancelar</button>
        </div>
      </form>
    </BaseModal>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { peticion } from '@/api';
import BaseModal from '@/components/BaseModal.vue';
import { mostrarToast, confirmarAccion } from '@/utils/alertas';

const destinatarios = ref([]);
const colaboradores = ref([]);
const cargando = ref(true);
const modalVisible = ref(false);
const editando = ref(null);
const guardando = ref(false);

const formulario = ref({
  colaborador_id: '',
  telefono: '',
  recibir_alertas: true,
});

onMounted(() => {
  cargarDestinatarios();
  cargarColaboradores();
});

async function cargarDestinatarios() {
  cargando.value = true;
  try {
    destinatarios.value = await peticion('/api/admin/notificaciones-config');
  } catch { /* silenciar */ }
  finally { cargando.value = false; }
}

async function cargarColaboradores() {
  try {
    const datos = await peticion('/api/admin/colaboradores?porPagina=100&rol=Admin&sinNotificacion=1');
    colaboradores.value = datos.datos || datos;
  } catch { /* silenciar */ }
}

function abrirFormulario(dest = null) {
  editando.value = dest ? dest.id : null;
  if (dest) {
    const tel = dest.telefono.startsWith('+57') ? dest.telefono.slice(3) : dest.telefono;
    formulario.value = { colaborador_id: dest.colaborador_id, telefono: tel, recibir_alertas: !!dest.recibir_alertas };
  } else {
    formulario.value = { colaborador_id: '', telefono: '', recibir_alertas: true };
  }
  modalVisible.value = true;
}

async function guardar() {
  guardando.value = true;
  try {
    const telefonoCompleto = '+57' + formulario.value.telefono;
    if (editando.value) {
      await peticion(`/api/admin/notificaciones-config/${editando.value}`, {
        metodo: 'PUT',
        cuerpo: { telefono: telefonoCompleto, recibir_alertas: formulario.value.recibir_alertas },
      });
      mostrarToast('success', 'Destinatario actualizado');
    } else {
      await peticion('/api/admin/notificaciones-config', {
        metodo: 'POST',
        cuerpo: { ...formulario.value, telefono: telefonoCompleto },
      });
      mostrarToast('success', 'Destinatario guardado exitosamente');
    }
    modalVisible.value = false;
    await cargarDestinatarios();
  } catch (error) {
    mostrarToast('error', 'No se pudo guardar', error.message);
  } finally {
    guardando.value = false;
  }
}

async function eliminar(id) {
  const confirmado = await confirmarAccion('¿Eliminar destinatario?', 'Se eliminará esta configuración de notificación');
  if (!confirmado) return;
  try {
    await peticion(`/api/admin/notificaciones-config/${id}`, { metodo: 'DELETE' });
    mostrarToast('success', 'Destinatario eliminado');
    await cargarDestinatarios();
  } catch (error) {
    mostrarToast('error', 'No se pudo eliminar', error.message);
  }
}
</script>
