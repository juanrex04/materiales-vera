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
        v-if="estado !== 'conectado'"
        class="btn-primary"
        :disabled="conectando"
        @click="conectar"
      >
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        {{ conectando ? 'Conectando...' : 'Conectar WhatsApp' }}
      </button>

      <button v-else class="btn-secondary" style="display: none;" disabled>
        Conectado
      </button>
    </div>

    <div v-if="qrImage" class="qr-container">
      <p>Escanea este código QR con tu celular:</p>
      <p class="qr-instruccion">WhatsApp → Ajustes → Dispositivos vinculados → Vincular dispositivo</p>
      <img :src="qrImage" alt="QR de WhatsApp" class="qr-imagen" />
    </div>

    <div v-if="estado === 'conectado'" class="test-section">
      <h4>Enviar mensaje de prueba</h4>
      <div class="test-form">
        <div class="telefono-input-group">
          <span class="telefono-prefix">+57</span>
          <input
            v-model="telefonoPrueba"
            type="tel"
            placeholder="3001234567"
            class="input-telefono"
            maxlength="10"
          />
        </div>
        <button class="btn-primary" :disabled="enviandoPrueba || !telefonoPrueba" @click="enviarPrueba">
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
          {{ enviandoPrueba ? 'Enviando...' : 'Enviar prueba' }}
        </button>
      </div>
      <p v-if="mensajePrueba" :class="['mensaje-feedback', tipoMensaje]">{{ mensajePrueba }}</p>
    </div>

    <div v-if="estado === 'conectado'" class="test-section">
      <h4>Alertas de documentos</h4>
      <p class="descripcion-seccion">Envía manualmente las alertas de documentos vencidos o próximos a vencer a todos los destinatarios configurados.</p>
      <button class="btn-primary" :disabled="enviandoAlertas" @click="enviarAlertas">
        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
        {{ enviandoAlertas ? 'Enviando...' : 'Enviar alertas de documentos' }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { io } from 'socket.io-client';
import { API_URL } from '@/config';
import { mostrarToast } from '@/utils/alertas';

const estado = ref('desconectado');
const qrImage = ref(null);
const conectando = ref(false);
const socket = ref(null);
const telefonoPrueba = ref('');
const enviandoPrueba = ref(false);
const mensajePrueba = ref('');
const tipoMensaje = ref('');
const enviandoAlertas = ref(false);

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

onMounted(() => {
  socket.value = io(API_URL, { transports: ['websocket', 'polling'] });

  socket.value.on('whatsapp-status', (data) => {
    estado.value = data.estado;
    qrImage.value = data.qr;
    if (data.estado === 'conectado') conectando.value = false;
    if (data.estado === 'desconectado') conectando.value = false;
  });

  fetch(`${API_URL}/api/admin/whatsapp-status`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  })
    .then(r => r.json())
    .then(data => {
      estado.value = data.estado;
      qrImage.value = data.qr;
    })
    .catch(() => {});
});

onUnmounted(() => {
  if (socket.value) socket.value.disconnect();
});

async function conectar() {
  conectando.value = true;
  try {
    await fetch(`${API_URL}/api/admin/whatsapp-connect`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
    });
  } catch {
    conectando.value = false;
  }
}

async function enviarPrueba() {
  enviandoPrueba.value = true;
  mensajePrueba.value = '';
  try {
    const res = await fetch(`${API_URL}/api/admin/whatsapp-test`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({ telefono: '+57' + telefonoPrueba.value })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Error al enviar');
    mensajePrueba.value = 'Mensaje enviado exitosamente ✓';
    tipoMensaje.value = 'exito';
  } catch (error) {
    mensajePrueba.value = error.message;
    tipoMensaje.value = 'error';
  } finally {
    enviandoPrueba.value = false;
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
  } finally {
    enviandoAlertas.value = false;
  }
}
</script>

<style scoped>
.descripcion-seccion {
  color: #64748b;
  font-size: 0.9rem;
  margin-bottom: 1.5rem;
}

.whatsapp-estado {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.estado-indicador {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 1rem;
  border-radius: var(--radius-md);
  background: #f1f5f9;
  font-size: 0.9rem;
}

.estado-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #94a3b8;
}

.estado-indicador.conectado .estado-dot { background: #22c55e; }
.estado-indicador.pendiente .estado-dot { background: #f59e0b; animation: pulso 1.5s infinite; }
.estado-indicador.desconectado .estado-dot { background: #94a3b8; }

@keyframes pulso {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.4; }
}

.qr-container {
  text-align: center;
  padding: 1.5rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  background: white;
}

.qr-instruccion {
  color: #64748b;
  font-size: 0.8rem;
  margin-bottom: 1rem;
}

.qr-imagen {
  width: 256px;
  height: 256px;
  border-radius: var(--radius-md);
}

.test-section {
  margin-top: 1.5rem;
  padding: 1.5rem;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-lg);
  background: white;
}

.test-section h4 {
  margin: 0 0 1rem 0;
  font-size: 1rem;
}

.test-form {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

@media (max-width: 480px) {
  .test-form {
    flex-direction: column;
    align-items: stretch;
  }
}

.telefono-input-group {
  display: flex;
  align-items: center;
  flex: 1;
  border: 1px solid var(--border-color);
  border-radius: var(--radius-md);
  overflow: hidden;
}

.telefono-prefix {
  padding: 0.5rem 0.75rem;
  background: #f1f5f9;
  color: #475569;
  font-weight: 600;
  font-size: 0.9rem;
  border-right: 1px solid var(--border-color);
  user-select: none;
}

.input-telefono {
  flex: 1;
  padding: 0.5rem 0.75rem;
  border: none;
  font-size: 0.9rem;
  outline: none;
}

.mensaje-feedback {
  margin-top: 0.75rem;
  font-size: 0.85rem;
}

.mensaje-feedback.exito {
  color: #16a34a;
}

.mensaje-feedback.error {
  color: #dc2626;
}
</style>
