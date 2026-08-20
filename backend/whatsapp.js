const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const qrcodeTerminal = require('qrcode-terminal');
const path = require('path');
const os = require('os');

let client = null;
let estado = 'desconectado'; // desconectado | qr_pendiente | conectado
let qrImageBase64 = null;
let io = null;

function configurarSocket(socketIo) {
  io = socketIo;
}

function obtenerEstado() {
  return {
    estado,
    qr: qrImageBase64,
  };
}

function iniciarSesion() {
  if (client && (estado === 'qr_pendiente' || estado === 'conectado')) {
    return;
  }

  estado = 'qr_pendiente';
  qrImageBase64 = null;
  emitirEstado();

  client = new Client({
    authStrategy: new LocalAuth({ dataPath: path.join(os.tmpdir(), 'materiales-vera-whatsapp') }),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    },
  });

  client.on('qr', async (qr) => {
    console.log('[WhatsApp] QR recibido, generando imagen...');
    qrImageBase64 = await qrcode.toDataURL(qr, { width: 256 });
    qrcodeTerminal.generate(qr, { small: true });
    emitirEstado();
  });

  client.on('ready', () => {
    console.log('[WhatsApp] Cliente conectado y listo.');
    estado = 'conectado';
    qrImageBase64 = null;
    emitirEstado();
  });

  client.on('disconnected', (reason) => {
    console.log('[WhatsApp] Desconectado:', reason);
    estado = 'desconectado';
    qrImageBase64 = null;
    client = null;
    emitirEstado();
  });

  client.on('auth_failure', (msg) => {
    console.error('[WhatsApp] Fallo de autenticación:', msg);
    estado = 'desconectado';
    qrImageBase64 = null;
    client = null;
    emitirEstado();
  });

  client.initialize();
}

async function enviarMensaje(numero, texto) {
  if (estado !== 'conectado') {
    throw new Error('WhatsApp no está conectado');
  }

  const chatId = numero.replace(/[^0-9]/g, '') + '@c.us';
  await client.sendMessage(chatId, texto);
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
  enviarMensaje,
};
