const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { body, param, validationResult } = require('express-validator')
const { rateLimit } = require('express-rate-limit')

require('dotenv').config();

const requiredEnvVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_DATABASE', 'JWT_SECRET'];
const missing = requiredEnvVars.filter(v => !process.env[v]);
if (missing.length > 0) {
  console.error(`Error: Faltan variables de entorno requeridas: ${missing.join(', ')}`);
  console.error('Crea un archivo .env basado en .env.example');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3000;

// Render y otros proxies envían el X-Forwarded-For; sin esto el rate limiter
// vería todas las peticiones desde la IP del proxy y bloquearía a todos juntos.
app.set('trust proxy', 1);

const validar = (req, res, next) => {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({ error: errores.array()[0].msg });
  }
  next();
};

const esErrorDuplicado = (err) => err && err.code === 'ER_DUP_ENTRY';

// ==========================================
// HELPERS DE PAGINACIÓN
// ==========================================
function obtenerPaginacion(req) {
  const pagina = Math.max(parseInt(req.query.pagina) || 1, 1);
  const porPagina = Math.min(Math.max(parseInt(req.query.porPagina) || 10, 1), 100);
  const offset = (pagina - 1) * porPagina;
  return { pagina, porPagina, limite: porPagina, offset };
}

// ==========================================
// HELPERS DE VALIDACION DEL CHECKLIST DIARIO
// ==========================================
async function obtenerVehiculosVerificadosHoy() {
  const [filas] = await pool.query(
    'SELECT DISTINCT vehiculo_id FROM checklists_diarios WHERE fecha = CURRENT_DATE()'
  );
  return new Set(filas.map(f => f.vehiculo_id));
}

async function obtenerChecklistConductorHoy(colaboradorId) {
  const [filas] = await pool.query(
    `SELECT c.id, v.placa
     FROM checklists_diarios c
     JOIN vehiculos v ON v.id = c.vehiculo_id
     WHERE c.colaborador_id = ? AND c.fecha = CURRENT_DATE()
     LIMIT 1`,
    [colaboradorId]
  );
  return filas[0] || null;
}

// ==========================================
// 1. CONFIGURACIÓN DE MIDDLEWARES Y BD
// ==========================================
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',') : 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : undefined
});

// Health check para UptimeRobot y Render (no requiere token)
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ estado: 'ok' });
  } catch {
    res.status(503).json({ estado: 'error' });
  }
});

// Ruta raiz: evita el 404 al abrir la URL del backend en el navegador
app.get('/', (req, res) => {
  res.json({ nombre: 'Materiales Vera API', estado: 'ok', health: '/health' });
});

// ==========================================
// 2. MIDDLEWARES DE SEGURIDAD
// ==========================================
const verificarToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(403).json({ error: 'Acceso denegado. Token requerido.' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = decoded; // Guardamos los datos del usuario en la petición
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
};

const esAdmin = (req, res, next) => {
  if (req.usuario && req.usuario.rol === 'Admin') {
    next();
  } else {
    res.status(403).json({ error: 'Acceso denegado. Se requiere perfil de Administrador.' });
  }
};

// ==========================================
// 3. MÓDULO DE AUTENTICACIÓN
// ==========================================
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 5,
  message: { error: 'Demasiados intentos. Intente de nuevo en 5 minutos.' }
})

app.post('/api/login',loginLimiter, [
  body('documento')
    .trim()
    .stripLow()
    .isLength({ min: 4, max: 20 })
    .withMessage('El documento debe tener entre 4 y 20 dígitos')
    .matches(/^\d+$/)
    .withMessage('El documento solo debe contener números'),
  body('password')
    .notEmpty()
    .withMessage('La contraseña es requerida')
], validar, async (req, res) => {
  const { documento, password } = req.body;
  try {
    const [usuarios] = await pool.query(`
      SELECT c.*, r.nombre as nombre_rol 
      FROM colaboradores c 
      JOIN roles r ON c.rol_id = r.id 
      WHERE c.documento = ?
    `, [documento]);

    if (usuarios.length === 0) return res.status(401).json({ error: 'Credenciales incorrectas.' });

    const usuario = usuarios[0];
    const contraseñaValida = await bcrypt.compare(password, usuario.password);

    if (!contraseñaValida) return res.status(401).json({ error: 'Credenciales incorrectas.' });

    const token = jwt.sign(
      { id: usuario.id, rol: usuario.nombre_rol, nombre: usuario.nombre, debe_cambiar_password: !!usuario.debe_cambiar_password },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      rol: usuario.nombre_rol,
      nombre: usuario.nombre,
      debe_cambiar_password: !!usuario.debe_cambiar_password
    });
  } catch (err) {
    res.status(500).json({ error: 'Error interno en el servidor, notifique administración' });
  }
});

// ==========================================
// 4. MÓDULO ADMIN - CRUD COLABORADORES
// ==========================================
function construirFiltrosColaboradores(req) {
  const condiciones = [];
  const parametros = [];
  const { nombre, rol, excluirId } = req.query;
  const tNombre = (nombre || '').trim().replace(/[^a-zA-ZÁÉÍÓÚÜÑáéíóúüñ '.0-9-]/g, '');
  const tRol = (rol || '').trim();

  if (tNombre) {
    condiciones.push('c.nombre LIKE ?');
    parametros.push(`%${tNombre}%`);
  }
  if (tRol === 'Admin' || tRol === 'Conductor') {
    condiciones.push('r.nombre = ?');
    parametros.push(tRol);
  }
  if (excluirId && /^\d+$/.test(excluirId)) {
    condiciones.push('c.id != ?');
    parametros.push(Number(excluirId));
  }

  const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';
  return { where, parametros };
}

app.get('/api/admin/colaboradores', verificarToken, esAdmin, async (req, res) => {
  try {
    const { where, parametros } = construirFiltrosColaboradores(req);
    const baseQuery = `FROM colaboradores c JOIN roles r ON c.rol_id = r.id ${where}`;
    const seleccion = `SELECT c.id, c.nombre, c.documento, r.nombre as rol, c.licencia_conducir FROM colaboradores c JOIN roles r ON c.rol_id = r.id ${where}`;

    if (req.query.pagina) {
      const { porPagina, offset } = obtenerPaginacion(req);
      const [contador] = await pool.query(`SELECT COUNT(*) as total ${baseQuery}`, parametros);
      const [rows] = await pool.query(`${seleccion} ORDER BY c.nombre ASC LIMIT ? OFFSET ?`, [...parametros, porPagina, offset]);
      return res.json({ datos: rows, total: contador[0].total });
    }

    const [rows] = await pool.query(`${seleccion} ORDER BY c.nombre ASC`, parametros);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Error interno en el servidor, notifique administración' }); }
});

app.post('/api/admin/colaboradores', verificarToken, esAdmin, [
  body('nombre')
    .trim()
    .stripLow()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres')
    .matches(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ '.]+$/)
    .withMessage('El nombre contiene caracteres no permitidos'),
  body('documento')
    .trim()
    .stripLow()
    .isLength({ min: 4, max: 20 })
    .withMessage('El documento debe tener entre 4 y 20 dígitos')
    .matches(/^\d+$/)
    .withMessage('El documento solo debe contener números'),
  body('rol_id')
    .isInt({ min: 1 })
    .toInt()
    .withMessage('El rol asignado no es válido'),
  body('licencia_conducir')
    .optional({ values: 'null' })
    .trim()
    .stripLow()
    .matches(/^[A-Za-z0-9 -]{0,20}$/)
    .withMessage('La licencia de conducción no es válida')
], validar, async (req, res) => {
  const { nombre, documento, rol_id, licencia_conducir } = req.body;
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('12345', salt);
    const [result] = await pool.query(
      'INSERT INTO colaboradores (nombre, documento, password, rol_id, licencia_conducir, debe_cambiar_password) VALUES (?, ?, ?, ?, ?, TRUE)',
      [nombre, documento, hashedPassword, rol_id, licencia_conducir || null]
    );
    res.status(201).json({ mensaje: 'Colaborador creado exitosamente', id: result.insertId });
  } catch (err) {
    if (esErrorDuplicado(err)) return res.status(400).json({ error: 'Ya existe un colaborador con ese documento.' });
    res.status(500).json({ error: 'Error interno en el servidor, notifique administración' });
  }
});

app.put('/api/admin/colaboradores/:id', verificarToken, esAdmin, [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID de colaborador inválido'),
  body('nombre')
    .trim()
    .stripLow()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres')
    .matches(/^[A-Za-zÁÉÍÓÚÜÑáéíóúüñ '.]+$/)
    .withMessage('El nombre contiene caracteres no permitidos'),
  body('documento')
    .trim()
    .stripLow()
    .isLength({ min: 4, max: 20 })
    .withMessage('El documento debe tener entre 4 y 20 dígitos')
    .matches(/^\d+$/)
    .withMessage('El documento solo debe contener números'),
  body('rol_id')
    .isInt({ min: 1 })
    .toInt()
    .withMessage('El rol asignado no es válido'),
  body('licencia_conducir')
    .optional({ values: 'null' })
    .trim()
    .stripLow()
    .matches(/^[A-Za-z0-9 -]{0,20}$/)
    .withMessage('La licencia de conducción no es válida')
], validar, async (req, res) => {
  const { id } = req.params;
  const { nombre, documento, rol_id, licencia_conducir } = req.body;
  try {
    await pool.query('UPDATE colaboradores SET nombre = ?, documento = ?, rol_id = ?, licencia_conducir = ? WHERE id = ?', [nombre, documento, rol_id, licencia_conducir || null, id]);
    res.json({ mensaje: 'Colaborador actualizado' });
  } catch (err) {
    if (esErrorDuplicado(err)) return res.status(400).json({ error: 'Ya existe un colaborador con ese documento.' });
    res.status(500).json({ error: 'Error interno en el servidor, notifique administración' });
  }
});

app.delete('/api/admin/colaboradores/:id', verificarToken, esAdmin, [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID de colaborador inválido')
], validar, async (req, res) => {
  try {
    await pool.query('DELETE FROM colaboradores WHERE id = ?', [req.params.id]);
    res.json({ mensaje: 'Colaborador eliminado' });
  } catch (err) { res.status(400).json({ error: 'No se puede eliminar un usuario con registros activos.' }); }
});

app.post('/api/admin/colaboradores/:id/reset-password', verificarToken, esAdmin, [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID de colaborador inválido')
], validar, async (req, res) => {
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('12345', salt);
    const [result] = await pool.query(
      'UPDATE colaboradores SET password = ?, debe_cambiar_password = TRUE WHERE id = ?',
      [hashedPassword, req.params.id]
    );
    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Colaborador no encontrado' });
    }
    res.json({ mensaje: 'Clave restablecida a 12345. El colaborador deberá cambiarla al iniciar sesión.' });
  } catch (err) {
    res.status(500).json({ error: 'Error interno en el servidor, notifique administración' });
  }
});

// ==========================================
// 5. MÓDULO ADMIN - CRUD VEHÍCULOS
// ==========================================
function construirFiltrosVehiculos(req) {
  const condiciones = [];
  const parametros = [];
  const { placa, estado } = req.query;
  const tPlaca = (placa || '').trim().replace(/[^a-zA-Z0-9-]/g, '').toUpperCase();
  const tEstado = (estado || '').trim();

  if (tPlaca) {
    condiciones.push('placa LIKE ?');
    parametros.push(`%${tPlaca}%`);
  }
  if (tEstado === 'Disponible' || tEstado === 'Mantenimiento') {
    condiciones.push('estado = ?');
    parametros.push(tEstado);
  }

  const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';
  return { where, parametros };
}

// LECTURA CON CÁLCULO DE VENCIMIENTOS
app.get('/api/admin/vehiculos', verificarToken, esAdmin, async (req, res) => {
  try {
    const procesarVehiculo = (vehiculo) => {
      const soat = new Date(vehiculo.fecha_soat);
      const tecno = new Date(vehiculo.fecha_tecnomecanica);

      const diasFaltanSoat = Math.ceil((soat - fechaActual) / (1000 * 60 * 60 * 24));
      const diasFaltanTecno = Math.ceil((tecno - fechaActual) / (1000 * 60 * 60 * 24));
      let aceiteProximo;
      let diasFaltanAceite;

      if (vehiculo.fecha_ultimo_cambio_aceite) {
        aceiteProximo = new Date(vehiculo.fecha_ultimo_cambio_aceite);
        aceiteProximo.setMonth(aceiteProximo.getMonth() + 3);  // Sumar 3 meses
        diasFaltanAceite = Math.ceil((aceiteProximo - fechaActual) / (1000 * 60 * 60 * 24));
      } else {
        // Sin registro = necesita cambio urgente
        diasFaltanAceite = -999;
      }

      return {
        ...vehiculo,
        soat_dias_restantes: diasFaltanSoat,
        tecno_dias_restantes: diasFaltanTecno,
        aceite_dias_restantes: diasFaltanAceite,
        soat_estado: diasFaltanSoat < 0 ? 'VENCIDO' : (diasFaltanSoat <= 15 ? 'PROXIMO' : 'OK'),
        tecno_estado: diasFaltanTecno < 0 ? 'VENCIDO' : (diasFaltanTecno <= 15 ? 'PROXIMO' : 'OK'),
        aceite_estado: diasFaltanAceite < 0 ? 'VENCIDO' : (diasFaltanAceite <= 8 ? 'PROXIMO' : 'OK')
      };
    };

    const fechaActual = new Date();
    const { where, parametros } = construirFiltrosVehiculos(req);

    if (req.query.pagina) {
      const { porPagina, offset } = obtenerPaginacion(req);
      const [contador] = await pool.query(`SELECT COUNT(*) as total FROM vehiculos ${where}`, parametros);
      const [vehiculos] = await pool.query(
        `SELECT * FROM vehiculos ${where} ORDER BY id ASC LIMIT ? OFFSET ?`,
        [...parametros, porPagina, offset]
      );
      return res.json({ datos: vehiculos.map(procesarVehiculo), total: contador[0].total });
    }

    const [vehiculos] = await pool.query(`SELECT * FROM vehiculos ${where} ORDER BY id ASC`, parametros);

    const listaProcesada = vehiculos.map(procesarVehiculo);
    res.json(listaProcesada);
  } catch (err) { res.status(500).json({ error: 'Error interno en el servidor, notifique administración' }); }
});


// ==========================================
// 6. CHECKLIST VERIFICACIÓN DIARIA VEHICULO
// ==========================================
// OBTENER VEHICULOS LIBRES
app.get('/api/conductor/vehiculos-disponibles', verificarToken, async (req, res) => {
  try {
    // Si el conductor ya hizo su checklist hoy, no puede registrar otro
    const checklistConductor = await obtenerChecklistConductorHoy(req.usuario.id);
    if (checklistConductor) {
      return res.json({ yaRealizadoHoy: true, vehiculo: { placa: checklistConductor.placa }, vehiculos: [] });
    }

    // Traemos los carros que NO tienen un checklist registrado con la fecha del día de hoy
    const query = `
      SELECT id, placa, marca, estado, DATE_FORMAT(fecha_soat, '%Y-%m-%d') as fecha_soat, DATE_FORMAT(fecha_tecnomecanica, '%Y-%m-%d') as fecha_tecnomecanica, DATE_FORMAT(fecha_ultimo_cambio_aceite, '%Y-%m-%d') as fecha_ultimo_cambio_aceite
      FROM vehiculos 
      WHERE id NOT IN (
        SELECT vehiculo_id 
        FROM checklists_diarios 
        WHERE fecha = CURRENT_DATE()
      );
    `;
    const [vehiculos] = await pool.query(query);

    const fechaActual = new Date();
    const listaProcesada = vehiculos.map(v => {
      // SOAT
      const soat = new Date(v.fecha_soat);
      const diasFaltanSoat = Math.ceil((soat - fechaActual) / (1000 * 60 * 60 * 24));

      // TECNO
      const tecno = new Date(v.fecha_tecnomecanica);
      const diasFaltanTecno = Math.ceil((tecno - fechaActual) / (1000 * 60 * 60 * 24));

      // ACEITE
      let diasFaltanAceite;
      if (v.fecha_ultimo_cambio_aceite) {
        const aceiteProximo = new Date(v.fecha_ultimo_cambio_aceite);
        aceiteProximo.setMonth(aceiteProximo.getMonth() + 3);
        diasFaltanAceite = Math.ceil((aceiteProximo - fechaActual) / (1000 * 60 * 60 * 24));
      } else {
        diasFaltanAceite = -999;
      }

      return {
        ...v,
        soat_dias_restantes: diasFaltanSoat,
        tecno_dias_restantes: diasFaltanTecno,
        aceite_dias_restantes: diasFaltanAceite,
        soat_estado: diasFaltanSoat < 0 ? 'VENCIDO' : (diasFaltanSoat <= 15 ? 'PROXIMO' : 'OK'),
        tecno_estado: diasFaltanTecno < 0 ? 'VENCIDO' : (diasFaltanTecno <= 15 ? 'PROXIMO' : 'OK'),
        aceite_estado: diasFaltanAceite < 0 ? 'VENCIDO' : (diasFaltanAceite <= 8 ? 'PROXIMO' : 'OK')
      };
    });
    res.json({ yaRealizadoHoy: false, vehiculo: null, vehiculos: listaProcesada });
  } catch (error) {
    console.error('Error al obtener vehículos:', error);
    res.status(500).json({ error: 'Error en el servidor al consultar vehículos.' });
  }
});

const camposBooleano = [
  'luces_frontales', 'luces_traseras', 'direccionales_delanteras', 'direccionales_traseras',
  'espejos_laterales', 'alarma_retroceso', 'pito', 'freno_servicio', 'freno_emergencia',
  'direccion_suspension', 'cinturon_seguridad', 'vidrio_frontal', 'limpia_brisas',
  'silleteria', 'indicadores_tablero', 'baterias_cables', 'presion_aire', 'llantas_estado',
  'fugas_hidraulicas', 'pasadores_suspension', 'fugas_aire', 'grapas_chasis', 'cadena_cardan',
  'acoples_rapidos', 'mangueras', 'estado_volco', 'soporte_volco', 'tanque_combustible',
  'motor', 'sistema_cargado', 'ganchos_compuerta', 'soportes_buge', 'documentos', 'gato',
  'cruceta', 'taco', 'caja_herramientas', 'llanta_repuesto', 'linterna', 'senales_carretera',
  'botiquin', 'extintor'
];

const validacionesChecklist = camposBooleano.map(campo =>
  body(campo)
    .isBoolean()
    .toBoolean()
    .withMessage(`El campo ${campo.replace(/_/g, ' ')} debe ser verdadero o falso`)
);

// GUARDAR CHECKLIST DE CARRO ENVIADO
app.post('/api/conductor/checklist', verificarToken, [
  body('vehiculo_id').isInt({ min: 1 }).toInt().withMessage('Vehículo inválido'),
  ...validacionesChecklist,
  body('observaciones')
    .optional({ values: 'null' })
    .trim()
    .stripLow()
    .isLength({ max: 1000 })
    .withMessage('Las observaciones no pueden superar 1000 caracteres')
], validar, async (req, res) => {
  const data = req.body;

  // Extraemos el ID del colaborador autenticado (el conductor)
  const colaborador_id = req.usuario.id;

  // Un carro está apto si cumple con los puntos críticos obligatorios de seguridad
  const apto_para_trabajar = (data.freno_servicio && data.freno_emergencia && data.llantas_estado && data.documentos);

  try {
    // La volqueta no puede recibir otro checklist en el dia
    const vehiculosVerificados = await obtenerVehiculosVerificadosHoy();
    if (vehiculosVerificados.has(Number(data.vehiculo_id))) {
      return res.status(400).json({ error: 'Este vehículo ya fue verificado por otro conductor el día de hoy.' });
    }

    // El conductor no puede hacer otro checklist hasta el siguiente dia
    const checklistConductor = await obtenerChecklistConductorHoy(colaborador_id);
    if (checklistConductor) {
      return res.status(400).json({ error: 'Ya realizaste tu inspección de hoy. Solo se permite una por día.' });
    }

    // Insertar el nuevo registro en la base de datos
    const insertQuery = `
      INSERT INTO checklists_diarios (
    vehiculo_id, colaborador_id, fecha, hora, luces_frontales, luces_traseras, direccionales_delanteras, direccionales_traseras, 
    espejos_laterales, alarma_retroceso, pito, freno_servicio, freno_emergencia, direccion_suspension, 
    cinturon_seguridad, vidrio_frontal, limpia_brisas, silleteria, indicadores_tablero, baterias_cables, 
    presion_aire, llantas_estado, fugas_hidraulicas, pasadores_suspension, fugas_aire, grapas_chasis, 
    cadena_cardan, acoples_rapidos, mangueras, estado_volco, soporte_volco, tanque_combustible, motor, 
    sistema_cargado, ganchos_compuerta, soportes_buge, documentos, gato, cruceta, taco, caja_herramientas, 
    llanta_repuesto, linterna, senales_carretera, botiquin, extintor, observaciones, apto_para_trabajar
  ) VALUES (?, ?, CURRENT_DATE(), CURRENT_TIME(), ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`;

    const values = [
      data.vehiculo_id, colaborador_id, data.luces_frontales, data.luces_traseras, data.direccionales_delanteras, data.direccionales_traseras,
      data.espejos_laterales, data.alarma_retroceso, data.pito, data.freno_servicio, data.freno_emergencia, data.direccion_suspension,
      data.cinturon_seguridad, data.vidrio_frontal, data.limpia_brisas, data.silleteria, data.indicadores_tablero, data.baterias_cables,
      data.presion_aire, data.llantas_estado, data.fugas_hidraulicas, data.pasadores_suspension, data.fugas_aire, data.grapas_chasis,
      data.cadena_cardan, data.acoples_rapidos, data.mangueras, data.estado_volco, data.soporte_volco, data.tanque_combustible, data.motor,
      data.sistema_cargado, data.ganchos_compuerta, data.soportes_buge, data.documentos, data.gato, data.cruceta, data.taco, data.caja_herramientas,
      data.llanta_repuesto, data.linterna, data.senales_carretera, data.botiquin, data.extintor, data.observaciones, apto_para_trabajar
    ];

    await pool.query(insertQuery, values);

    // Si el vehículo NO está apto, automáticamente le cambiamos el estado a 'Mantenimiento' para alertar al administrador
    if (!apto_para_trabajar) {
      await pool.query("UPDATE vehiculos SET estado = 'Mantenimiento' WHERE id = ?", [data.vehiculo_id]);
    }

    res.json({
      success: true,
      message: 'Checklist guardado con éxito.',
      apto: apto_para_trabajar
    });

  } catch (error) {
    console.error('Error al insertar checklist:', error);
    res.status(500).json({ error: 'Error interno al guardar la inspección.' });
  }
});

// Obtener el historial de checklists para la vista de admin
// CONSTRUYE LOS FILTROS Y EL JOIN PARA EL LISTADO DE CHECKLISTS
function construirFiltrosChecklists(req) {
  const condiciones = [];
  const parametros = [];
  const { texto, placa, fechaInicio, fechaFin, estado } = req.query;
  const tTexto = (texto || '').trim();
  const tPlaca = (placa || '').trim().toUpperCase();
  const tFechaInicio = (fechaInicio || '').trim();
  const tFechaFin = (fechaFin || '').trim();
  const tEstado = (estado || '').trim();

  if (tPlaca) {
    condiciones.push('v.placa = ?');
    parametros.push(tPlaca);
  }
  if (tTexto) {
    const termino = `%${tTexto}%`;
    condiciones.push('(col.nombre LIKE ?)');
    parametros.push(termino);
  }
  if (tFechaInicio) {
    condiciones.push('c.fecha >= ?');
    parametros.push(tFechaInicio);
  }
  if (tFechaFin) {
    // +1 día para incluir todo el día final
    condiciones.push('c.fecha < DATE_ADD(?, INTERVAL 1 DAY)');
    parametros.push(tFechaFin);
  }
  if (tEstado === 'apto') {
    condiciones.push('c.apto_para_trabajar = 1');
  } else if (tEstado === 'falla') {
    condiciones.push('c.apto_para_trabajar = 0');
  }

  const where = condiciones.length > 0 ? `WHERE ${condiciones.join(' AND ')}` : '';
  return { where, parametros };
}

const FROM_CHECKLISTS = `
  FROM checklists_diarios c
  JOIN vehiculos v ON c.vehiculo_id = v.id
  JOIN colaboradores col ON c.colaborador_id = col.id
`;

const SELECT_CHECKLISTS = `
  SELECT 
    c.*, 
    DATE_FORMAT(c.fecha, '%Y-%m-%d') as fecha_formateada,
    v.placa, v.marca, 
    v.fecha_soat, v.fecha_tecnomecanica, 
    col.nombre AS conductor
  ${FROM_CHECKLISTS}
`;

app.get('/api/admin/checklists', verificarToken, esAdmin, async (req, res) => {
  try {
    const { where, parametros } = construirFiltrosChecklists(req);
    const { porPagina, offset } = obtenerPaginacion(req);

    const [contador] = await pool.query(
      `SELECT COUNT(*) as total ${FROM_CHECKLISTS} ${where}`,
      parametros
    );
    const [checklists] = await pool.query(
      `${SELECT_CHECKLISTS} ${where} ORDER BY c.fecha DESC, c.hora DESC LIMIT ? OFFSET ?`,
      [...parametros, porPagina, offset]
    );
    res.json({ datos: checklists, total: contador[0].total });
  } catch (error) {
    console.error('Error al obtener checklists:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// EXPORTACIÓN COMPLETA (SIN PAGINACIÓN) PARA EL PDF SEMANAL
app.get('/api/admin/checklists/exportar', verificarToken, esAdmin, async (req, res) => {
  try {
    const { where, parametros } = construirFiltrosChecklists(req);
    const [checklists] = await pool.query(
      `${SELECT_CHECKLISTS} ${where} ORDER BY c.fecha ASC, c.hora ASC`,
      parametros
    );
    res.json(checklists);
  } catch (error) {
    console.error('Error al exportar checklists:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// CREAR
app.post('/api/admin/vehiculos', verificarToken, esAdmin, [
  body('placa')
    .trim()
    .stripLow()
    .toUpperCase()
    .notEmpty()
    .withMessage('La placa es requerida')
    .matches(/^[A-Z0-9-]{4,10}$/)
    .withMessage('La placa no es válida'),
  body('marca')
    .trim()
    .stripLow()
    .notEmpty()
    .withMessage('La marca es requerida')
    .isLength({ max: 60 })
    .withMessage('La marca no puede superar 60 caracteres')
    .matches(/^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ .,-]+$/)
    .withMessage('La marca contiene caracteres no permitidos'),
  body('capacidad_carga_kg')
    .isFloat({ min: 1 })
    .toFloat()
    .withMessage('La capacidad debe ser un número mayor a 0'),
  body('fecha_soat')
    .isISO8601()
    .withMessage('La fecha del SOAT no es válida'),
  body('fecha_tecnomecanica')
    .isISO8601()
    .withMessage('La fecha de tecnomecánica no es válida'),
  body('fecha_ultimo_cambio_aceite')
    .isISO8601()
    .withMessage('La fecha de último cambio de aceite es requerida'),
  body('estado')
    .optional({ values: 'null' })
    .trim()
    .isIn(['Disponible', 'Mantenimiento'])
    .withMessage('El estado no es válido')
], validar, async (req, res) => {
  const { placa, marca, capacidad_carga_kg, fecha_soat, fecha_tecnomecanica, estado, fecha_ultimo_cambio_aceite } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO vehiculos (placa, marca, capacidad_carga_kg, fecha_soat, fecha_tecnomecanica, estado, fecha_ultimo_cambio_aceite) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [placa, marca, capacidad_carga_kg, fecha_soat, fecha_tecnomecanica, estado || 'Disponible', fecha_ultimo_cambio_aceite || null]
    );
    res.status(201).json({ mensaje: 'Vehículo registrado', id: result.insertId });
  } catch (err) {
    if (esErrorDuplicado(err)) return res.status(400).json({ error: 'Ya existe un vehículo con esa placa.' });
    res.status(500).json({ error: 'Error interno en el servidor, notifique administración' });
  }
});

// ACTUALIZAR
app.put('/api/admin/vehiculos/:id', verificarToken, esAdmin, [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID de vehículo inválido'),
  body('placa')
    .trim()
    .stripLow()
    .toUpperCase()
    .notEmpty()
    .withMessage('La placa es requerida')
    .matches(/^[A-Z0-9-]{4,10}$/)
    .withMessage('La placa no es válida'),
  body('marca')
    .trim()
    .stripLow()
    .notEmpty()
    .withMessage('La marca es requerida')
    .isLength({ max: 60 })
    .withMessage('La marca no puede superar 60 caracteres')
    .matches(/^[A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ .,-]+$/)
    .withMessage('La marca contiene caracteres no permitidos'),
  body('capacidad_carga_kg')
    .isFloat({ min: 1 })
    .toFloat()
    .withMessage('La capacidad debe ser un número mayor a 0'),
  body('fecha_soat')
    .isISO8601()
    .withMessage('La fecha del SOAT no es válida'),
  body('fecha_tecnomecanica')
    .isISO8601()
    .withMessage('La fecha de tecnomecánica no es válida'),
  body('fecha_ultimo_cambio_aceite')
    .isISO8601()
    .withMessage('La fecha de último cambio de aceite es requerida'),
  body('estado')
    .optional({ values: 'null' })
    .trim()
    .isIn(['Disponible', 'Mantenimiento'])
    .withMessage('El estado no es válido')
], validar, async (req, res) => {
  const { id } = req.params;
  const { placa, marca, capacidad_carga_kg, fecha_soat, fecha_tecnomecanica, estado, fecha_ultimo_cambio_aceite } = req.body;
  try {
    await pool.query(
      'UPDATE vehiculos SET placa = ?, marca = ?, capacidad_carga_kg = ?, fecha_soat = ?, fecha_tecnomecanica = ?, estado = ?, fecha_ultimo_cambio_aceite = ? WHERE id = ?',
      [placa, marca, capacidad_carga_kg, fecha_soat, fecha_tecnomecanica, estado, fecha_ultimo_cambio_aceite || null, id]
    );
    res.json({ mensaje: 'Vehículo modificado con éxito' });
  } catch (err) {
    if (esErrorDuplicado(err)) return res.status(400).json({ error: 'Ya existe un vehículo con esa placa.' });
    res.status(500).json({ error: 'Error interno en el servidor, notifique administración' });
  }
});

// ELIMINAR
app.delete('/api/admin/vehiculos/:id', verificarToken, esAdmin, [
  param('id')
    .isInt({ min: 1 })
    .withMessage('ID de vehículo inválido')
], validar, async (req, res) => {
  try {
    await pool.query('DELETE FROM vehiculos WHERE id = ?', [req.params.id]);
    res.json({ mensaje: 'Vehículo eliminado de la flota' });
  } catch (err) { res.status(400).json({ error: 'Error al eliminar. Verifique dependencias de asignación.' }); }
});

//MIDDLEWARE GLOBAL PARA ERRORES
app.use((err, req, res, next) => {
  console.error('Error no capturado:', err.stack);
  res.status(500).json({ error: 'Error interno del servidor' });
});

/*MIDDLEWARE PARA VALIDAR SI EL USUARIO DEBE CAMBIAR LA CONTRASEÑA AL 
INICIAR SESION POR PRIMERA VEZ*/

app.put('/api/cambiar-password', verificarToken, [
  body('password_nuevo')
    .isLength({ min: 8 })
    .withMessage('La nueva contraseña debe tener mínimo 8 caracteres')
    .matches(/\d/)
    .withMessage('La nueva contraseña debe contener al menos un número')
], validar, async (req, res) => {
  const { password_nuevo } = req.body;

  try {
    // 1. Hashear la nueva contraseña y actualizar
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password_nuevo, salt);
    const [result] = await pool.query(
      'UPDATE colaboradores SET password = ?, debe_cambiar_password = FALSE WHERE id = ?',
      [hashedPassword, req.usuario.id]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // 2. Emitir un token nuevo con el flag ya en false (el usuario sigue con sesión activa)
    const token = jwt.sign(
      { id: req.usuario.id, rol: req.usuario.rol, nombre: req.usuario.nombre, debe_cambiar_password: false },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({ mensaje: 'Contraseña actualizada exitosamente', token });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ==========================================
// INICIAR EL SERVIDOR
// ==========================================
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Servidor de Materiales Vera corriendo de forma segura en: http://localhost:${PORT}`);
  });
}

module.exports = { app, pool };