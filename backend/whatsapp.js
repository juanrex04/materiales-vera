const makeWASocket = require('@whiskeysockets/baileys').default;
const { DisconnectReason, Browsers, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { useMySQLAuthState } = require('./whatsappAuthStore');
const qrcode = require('qrcode');
const pino = require('pino');

let sock = null;
let estado = 'desconectado';
let qrImageBase64 = null;
let qrExpiraEn = null;
let io = null;
let dbPool = null;
let reconnectTimer = null;
let qrTimer = null;
let authStore = null; // guarda { saveCreds, clearAuth } de la sesión activa

const logger = pino({ level: process.env.BAILEYS_LOG_LEVEL || 'error' });

const CODIGOS_TERMINALES = [
  DisconnectReason.loggedOut,
  DisconnectReason.forbidden,
  DisconnectReason.connectionReplaced,
];

function configurarSocket(socketIo) {
  io = socketIo;
}

// Debe llamarse una vez que el pool de MySQL/TiDB esté creado en server.js
function configurarDB(pool) {
  dbPool = pool;
}

function obtenerEstado() {
  return { estado, qr: qrImageBase64, expiraEn: qrExpiraEn };
}

function limpiarSock() {
  if (qrTimer) {
    clearTimeout(qrTimer);
    qrTimer = null;
  }
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (sock) {
    try { sock.end(); } catch { }
    sock = null;
  }
}

async function eliminarSesion() {
  try {
    if (authStore) {
      await authStore.clearAuth();
    } else if (dbPool) {
      await dbPool.query('DELETE FROM whatsapp_auth');
    }
    console.log('[WhatsApp] Sesión eliminada de la base de datos.');
  } catch (e) {
    console.error('[WhatsApp] Error eliminando sesión:', e.message);
  }
}

function resetearEstado() {
  limpiarSock();
  estado = 'desconectado';
  qrImageBase64 = null;
  qrExpiraEn = null;
}

function iniciarTimerQR() {
  if (qrTimer) clearTimeout(qrTimer);
  qrExpiraEn = Date.now() + 60000;
  qrTimer = setTimeout(() => {
    if (estado === 'qr_pendiente') {
      console.log('[WhatsApp] QR expiró (60s), sesión terminada.');
      resetearEstado();
      emitirEstado();
    }
  }, 60000);
}

async function cerrarSesion() {
  const estabaConectado = estado === 'conectado';
  if (estabaConectado && sock) {
    try { await sock.logout(); } catch { }
  } else if (sock) {
    try { sock.end(); } catch { }
  }
  resetearEstado();
  await eliminarSesion();
  emitirEstado();
}

async function iniciarSesion() {
  if (!dbPool) {
    throw new Error('whatsapp.configurarDB(pool) no fue llamado antes de iniciarSesion()');
  }

  if (sock && (estado === 'qr_pendiente' || estado === 'conectado')) {
    return;
  }

  limpiarSock();
  estado = 'qr_pendiente';
  qrImageBase64 = null;
  qrExpiraEn = null;
  emitirEstado();

  const { state, saveCreds, clearAuth } = await useMySQLAuthState(dbPool);
  authStore = { saveCreds, clearAuth };

  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    auth: state,
    version,
    logger,
    printQRInTerminal: false,
    browser: Browsers.ubuntu('Materiales Vera'),
    connectTimeoutMs: 60000,
    defaultQueryTimeoutMs: 60000,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('[WhatsApp] QR recibido, generando imagen...');
      try {
        qrImageBase64 = await qrcode.toDataURL(qr, { width: 256 });
      } catch (e) {
        console.error('[WhatsApp] Error generando imagen QR:', e.message);
      }
      iniciarTimerQR();
      emitirEstado();
    }

    if (connection === 'open') {
      console.log('[WhatsApp] Cliente conectado y listo.');
      if (qrTimer) { clearTimeout(qrTimer); qrTimer = null; }
      estado = 'conectado';
      qrImageBase64 = null;
      qrExpiraEn = null;
      emitirEstado();
    }

    if (connection === 'close') {
      if (estado === 'desconectado') return;

      const statusCode = (lastDisconnect?.error)?.output?.statusCode;

      if (CODIGOS_TERMINALES.includes(statusCode)) {
        console.log('[WhatsApp] Sesión terminal (StatusCode:', statusCode, '), limpiando...');
        resetearEstado();
        await eliminarSesion();
        emitirEstado();
        return;
      }

      if (statusCode === 515) {
        console.log('[WhatsApp] Restart required (515), reconectando...');
        sock = null;
        reconnectTimer = setTimeout(() => {
          if (estado !== 'desconectado') iniciarSesion();
        }, 0);
      } else {
        console.log('[WhatsApp] Conexión cerrada (StatusCode:', statusCode, '), reconectando en 3s...');
        reconnectTimer = setTimeout(() => {
          if (estado !== 'desconectado') iniciarSesion();
        }, 3000);
      }
    }
  });
}

function cancelarSesion() {
  if (estado !== 'qr_pendiente') return false;
  console.log('[WhatsApp] Conexión cancelada por el usuario.');
  resetearEstado();
  emitirEstado();
  return true;
}

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function enviarMensaje(numero, texto) {
  if (estado !== 'conectado' || !sock) {
    throw new Error('WhatsApp no está conectado');
  }

  const limpio = numero.replace(/[^0-9]/g, '');
  if (limpio.length < 10 || limpio.length > 15) {
    throw new Error('Número inválido: ' + numero);
  }

  const jid = limpio + '@s.whatsapp.net';
  await sock.sendMessage(jid, { text: texto });
}

// Envía a varios destinatarios con espera aleatoria entre cada uno
// para no disparar detección de spam por ráfagas de mensajes.
async function enviarMensajesEnLote(destinatarios, { minMs = 2000, maxMs = 5000 } = {}) {
  const resultados = [];
  for (const { numero, texto } of destinatarios) {
    try {
      await enviarMensaje(numero, texto);
      resultados.push({ numero, ok: true });
    } catch (e) {
      resultados.push({ numero, ok: false, error: e.message });
    }
    await delay(minMs + Math.random() * (maxMs - minMs));
  }
  return resultados;
}

// Solo a la sala de admins autenticados por socket (ver socket.io auth en server.js)
function emitirEstado() {
  if (io) {
    io.to('admin-room').emit('whatsapp-status', obtenerEstado());
  }
}

module.exports = {
  configurarSocket,
  configurarDB,
  obtenerEstado,
  iniciarSesion,
  cancelarSesion,
  cerrarSesion,
  enviarMensaje,
  enviarMensajesEnLote,
};