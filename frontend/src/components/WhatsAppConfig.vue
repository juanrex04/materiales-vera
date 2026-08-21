<template>
  <div class="gestion-seccion">
    <h3>Conexión WhatsApp</h3>
    <p class="descripcion-seccion">Conecta tu cuenta de WhatsApp para enviar alertas de documentos a los administradores.</p>

    <div class="whatsapp-estado">
      <div class="estado-indicador" :class="estadoClase">
        <span class="estado-dot"></span>
        <span class="estado-texto">{{ estadoTexto }}</span>
      </div>

      <button
        v-if="estado === 'desconectado'"
        class="btn-primary"
        :disabled="conectando"
        @click="conectar"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        {{ conectando ? 'Conectando...' : 'Conectar WhatsApp' }}
      </button>

      <button
        v-if="estado === 'qr_pendiente'"
        class="btn-cancel"
        :disabled="cancelando"
        @click="cancelar"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        {{ cancelando ? 'Cancelando...' : 'Cancelar' }}
      </button>

      <button
        v-if="estado === 'conectado'"
        class="btn-cancel"
        :disabled="cerrando"
        @click="desvincular"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
        {{ cerrando ? 'Desvinculando...' : 'Desvincular dispositivo' }}
      </button>
    </div>

    <div v-if="estado === 'qr_pendiente' && !qrImage" class="qr-loading">
      <p>Generando código QR...</p>
    </div>

    <div v-if="qrImage" class="qr-container">
      <p>Escanea este código QR con tu celular:</p>
      <p class="qr-instruccion">WhatsApp → Ajustes → Dispositivos vinculados → Vincular dispositivo</p>
      <img :src="qrImage" alt="QR de WhatsApp" class="qr-imagen" />
      <div class="qr-countdown">
        <div class="qr-countdown-bar" :style="{ width: qrCountdownPercent + '%' }"></div>
        <span class="qr-countdown-text">Expira en {{ qrCountdown }}s</span>
      </div>
    </div>

    <div v-if="estado === 'conectado'" class="test-section">
      <h4>Alertas de documentos</h4>
      <p class="descripcion-seccion">Envía manualmente las alertas de documentos vencidos o próximos a vencer a todos los destinatarios configurados.</p>
      <button class="btn-primary" :disabled="enviandoAlertas" @click="enviarAlertas">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        {{ enviandoAlertas ? 'Enviando...' : 'Enviar alertas de documentos' }}
      </button>
    </div>

    <div v-if="estado === 'conectado'" class="test-section">
      <h4>Reporte automático</h4>
      <p class="descripcion-seccion">Configura la hora diaria en la que se enviarán las alertas de documentos vencidos o próximos a vencer.</p>
      <div class="hora-config">
        <div class="hora-input-group">
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
          <input
            v-model="horaReporte"
            type="time"
            class="hora-input"
          />
        </div>
        <button
          class="btn-primary"
          :disabled="guardandoHora || horaReporte === horaOriginal"
          @click="guardarHora"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><polyline points="17 21 17 13 7 13 7 21"/><polyline points="7 3 7 8 15 8"/></svg>
          {{ guardandoHora ? 'Guardando...' : 'Guardar' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useWhatsappStatus } from '@/composables/useWhatsappStatus';
import { API_URL } from '@/config';
import { mostrarToast, confirmarAccion } from '@/utils/alertas';

// Estado global: sobrevive a cambios de ruta, ya no se resetea al salir/entrar
const { estado, qrImage, qrExpiraEn } = useWhatsappStatus();
const emit = defineEmits(['error']);

const conectando = ref(false);
const enviandoAlertas = ref(false);
const cancelando = ref(false);
const cerrando = ref(false);
const horaReporte = ref('09:00');
const horaOriginal = ref('09:00');
const guardandoHora = ref(false);

let countdownInterval = null;
const qrCountdown = ref(0);
const qrCountdownPercent = ref(0);

const estadoClase = computed(() => ({
  'conectado': estado.value === 'conectado',
  'pendiente': estado.value === 'qr_pendiente',
  'desconectado': estado.value === 'desconectado',
}));

const estadoTexto = computed(() => {
  switch (estado.value) {
    case 'conectado': return 'Conectado';
    case 'qr_pendiente': return 'Esperando escaneo QR...';
    default: return 'Desconectado';
  }
});

function startCountdown() {
  stopCountdown();
  countdownInterval = setInterval(() => {
    if (!qrExpiraEn.value) { stopCountdown(); return; }
    const remaining = Math.max(0, Math.ceil((qrExpiraEn.value - Date.now()) / 1000));
    qrCountdown.value = remaining;
    qrCountdownPercent.value = (remaining / 60) * 100;
    if (remaining <= 0) stopCountdown();
  }, 200);
}

function stopCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
}

// Como el estado ahora es global y puede llegar ya en 'qr_pendiente' al
// entrar a esta vista (por ejemplo si lo dejaste pendiente en otra pestaña
// o navegación), observamos los cambios para arrancar/parar el countdown
// en vez de hacerlo solo una vez en onMounted.
watch(
  [() => estado.value, () => qrExpiraEn.value],
  ([nuevoEstado, nuevaExpiraEn]) => {
    if (nuevoEstado === 'qr_pendiente' && nuevaExpiraEn) {
      startCountdown();
    } else {
      stopCountdown();
    }

    if (nuevoEstado === 'conectado') { conectando.value = false; cancelando.value = false; }
    if (nuevoEstado === 'desconectado') { conectando.value = false; cancelando.value = false; }
  },
  { immediate: true }
);

onUnmounted(() => {
  stopCountdown();
});

onMounted(async () => {
  try {
    const res = await fetch(`${API_URL}/api/admin/configuracion-whatsapp`, {
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await res.json();
    if (data.hora_reporte) {
      horaReporte.value = data.hora_reporte;
      horaOriginal.value = data.hora_reporte;
    }
  } catch {
    emit('error', 'No se pudo conectar con el servidor. Verifique su conexión a internet.');
  }
});

async function guardarHora() {
  guardandoHora.value = true;
  try {
    const res = await fetch(`${API_URL}/api/admin/configuracion-whatsapp`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ hora_reporte: horaReporte.value })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al guardar');
    horaOriginal.value = horaReporte.value;
    mostrarToast('success', 'Hora actualizada', `Las alertas se enviarán a las ${horaReporte.value}`);
  } catch (error) {
    mostrarToast('error', 'Error al guardar', error.message);
    horaReporte.value = horaOriginal.value;
  } finally {
    guardandoHora.value = false;
  }
}

async function conectar() {
  conectando.value = true;
  try {
    await fetch(`${API_URL}/api/admin/whatsapp-connect`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
  } catch {
    conectando.value = false;
    emit('error', 'No se pudo conectar con el servidor. Verifique su conexión a internet.');
  }
}

async function cancelar() {
  cancelando.value = true;
  try {
    await fetch(`${API_URL}/api/admin/whatsapp-disconnect`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
  } catch {
    emit('error', 'No se pudo conectar con el servidor. Verifique su conexión a internet.');
  } finally {
    cancelando.value = false;
  }
}

async function desvincular() {
  const confirmado = await confirmarAccion(
    '¿Desvincular dispositivo?',
    'Se cerrará la sesión de WhatsApp y tendrás que escanear un nuevo código QR para reconectar.'
  );
  if (!confirmado) return;

  cerrando.value = true;
  try {
    const res = await fetch(`${API_URL}/api/admin/whatsapp-logout`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al desvincular');
    mostrarToast('info', 'Dispositivo desvinculado', data.mensaje);
  } catch (error) {
    mostrarToast('error', 'Error al desvincular', error.message);
    emit('error', error.message);
  } finally {
    cerrando.value = false;
  }
}

async function enviarAlertas() {
  enviandoAlertas.value = true;
  try {
    const res = await fetch(`${API_URL}/api/admin/whatsapp-send-alerts`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al enviar alertas');
    mostrarToast('success', data.mensaje, `${data.alertas} alerta(s) a ${data.destinatarios} destinatario(s)`);
  } catch (error) {
    mostrarToast('error', 'No se pudieron enviar las alertas', error.message);
    emit('error', error.message);
  } finally {
    enviandoAlertas.value = false;
  }
}
</script>