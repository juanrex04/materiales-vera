const { initAuthCreds, BufferJSON, proto } = require('@whiskeysockets/baileys');

// Crea la tabla si no existe (se ejecuta una sola vez al iniciar sesión)
async function asegurarTabla(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS whatsapp_auth (
      id VARCHAR(255) PRIMARY KEY,
      data LONGTEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
}

/**
 * Reemplazo de useMultiFileAuthState pero guardando en MySQL/TiDB.
 * Necesario porque el plan Free de Render no tiene disco persistente:
 * cada redeploy o reinicio del contenedor borraría la carpeta de sesión.
 */
async function useMySQLAuthState(pool) {
  await asegurarTabla(pool);

  const escribir = async (id, data) => {
    const json = JSON.stringify(data, BufferJSON.replacer);
    await pool.query(
      'INSERT INTO whatsapp_auth (id, data) VALUES (?, ?) ON DUPLICATE KEY UPDATE data = ?',
      [id, json, json]
    );
  };

  const leer = async (id) => {
    const [filas] = await pool.query('SELECT data FROM whatsapp_auth WHERE id = ?', [id]);
    if (filas.length === 0) return null;
    try {
      return JSON.parse(filas[0].data, BufferJSON.reviver);
    } catch {
      return null;
    }
  };

  const eliminar = async (id) => {
    await pool.query('DELETE FROM whatsapp_auth WHERE id = ?', [id]);
  };

  const credsGuardadas = await leer('creds');
  const creds = credsGuardadas || initAuthCreds();

  return {
    state: {
      creds,
      keys: {
        get: async (type, ids) => {
          const data = {};
          await Promise.all(
            ids.map(async (id) => {
              let value = await leer(`${type}-${id}`);
              if (type === 'app-state-sync-key' && value) {
                value = proto.Message.AppStateSyncKeyData.fromObject(value);
              }
              data[id] = value;
            })
          );
          return data;
        },
        set: async (data) => {
          const tareas = [];
          for (const categoria in data) {
            for (const id in data[categoria]) {
              const valor = data[categoria][id];
              const clave = `${categoria}-${id}`;
              tareas.push(valor ? escribir(clave, valor) : eliminar(clave));
            }
          }
          await Promise.all(tareas);
        },
      },
    },
    saveCreds: () => escribir('creds', creds),
    // Borra TODA la sesión de WhatsApp (usar en logout/reset)
    clearAuth: async () => {
      await pool.query('DELETE FROM whatsapp_auth');
    },
  };
}

module.exports = { useMySQLAuthState };