// composables/useWhatsappStatus.js
import { io } from 'socket.io-client';
import { ref } from 'vue';
import { API_URL } from '@/config';

// Variables FUERA de la función = viven una sola vez mientras la app esté abierta,
// sin importar cuántas veces se monte/desmonte el componente que las usa.
const estado = ref('desconectado');
const qrImage = ref(null);
const qrExpiraEn = ref(null);
let socket = null;
let inicializado = false;

function manejarEstado(data) {
  estado.value = data.estado;
  qrImage.value = data.qr;
  qrExpiraEn.value = data.expiraEn;
}

function inicializar() {
  if (inicializado) return; // evita crear el socket más de una vez
  inicializado = true;

  socket = io(API_URL, {
    transports: ['websocket', 'polling'],
    auth: { token: localStorage.getItem('token') },
  });

  socket.on('whatsapp-status', manejarEstado);
  socket.on('connect_error', (err) => {
    console.error('[Socket] Error de conexión:', err.message);
  });

  // Trae el estado actual una sola vez al iniciar la app
  fetch(`${API_URL}/api/admin/whatsapp-status`, {
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
  })
    .then((r) => r.json())
    .then(manejarEstado)
    .catch(() => {});
}

export function useWhatsappStatus() {
  inicializar(); // no hace nada si ya se inicializó antes
  return { estado, qrImage, qrExpiraEn };
}