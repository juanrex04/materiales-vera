const makeWASocket = require('@whiskeysockets/baileys').default;
const { useMultiFileAuthState, DisconnectReason, Browsers, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const qrcode = require('qrcode');
const path = require('path');
const os = require('os');
const fs = require('fs/promises');
const pino = require('pino');

let sock = null;
let estado = 'desconectado';
let qrImageBase64 = null;
let qrExpiraEn = null;
let io = null;
let reconnectTimer = null;
let qrTimer = null;

const logger = pino({ level: 'silent' });
const SESSION_DIR = path.join(os.tmpdir(), 'materiales-vera-whatsapp');

const CODIGOS_TERMINALES = [
  DisconnectReason.loggedOut,
  DisconnectReason.forbidden,
  DisconnectReason.connectionReplaced,
];

function configurarSocket(socketIo) {
  io = socketIo;
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
    try { sock.end(); } catch {}
    sock = null;
  }
}

async function eliminarSesion() {
  try {
    await fs.rm(SESSION_DIR, { recursive: true, force: true });
    console.log('[WhatsApp] Carpeta de sesión eliminada.');
  } catch {}
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
    try { await sock.logout(); } catch {}
  } else if (sock) {
    try { sock.end(); } catch {}
  }
  resetearEstado();
  await eliminarSesion();
  emitirEstado();
}

async function iniciarSesion() {
  if (sock && (estado === 'qr_pendiente' || estado === 'conectado')) {
    return;
  }

  limpiarSock();
  estado = 'qr_pendiente';
  qrImageBase64 = null;
  qrExpiraEn = null;
  emitirEstado();

  const sessionDir = path.join(os.tmpdir(), 'materiales-vera-whatsapp');
  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion();

  sock = makeWASocket({
    auth: state,
    version,
    logger,
    printQRInTerminal: false,
    browser: Browsers.ubuntu('Materiales Vera'),
  });

  sock.ev.on('creds.update', async () => {
    await saveCreds();
  });

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

async function enviarMensaje(numero, texto) {
  if (estado !== 'conectado' || !sock) {
    throw new Error('WhatsApp no está conectado');
  }

  const jid = numero.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
  await sock.sendMessage(jid, { text: texto });
}

function emitirEstado() {
  if (io) {
    io.emit('whatsapp-status', obtenerEstado());
  }
}

module.exports = {
  configurarSocket,
  obtenerEstado,
  iniciarSesion,
  cancelarSesion,
  cerrarSesion,
  enviarMensaje,
};
