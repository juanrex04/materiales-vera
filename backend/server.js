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

const validar = (req, res, next) => {
  const errores = validationResult(req);
  if (!errores.isEmpty()) {
    return res.status(400).json({ error: errores.array()[0].msg });
  }
  next();
};

const esErrorDuplicado = (err) => err && err.code === 'ER_DUP_ENTRY';

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
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
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
  max: 3,
  message: { error: 'Demasiados intentos. Intente de nuevo en 5 minutos.' }
})

app.post('/api/login',loginLimiter, [
  body('email')
    .isEmail()
    .withMessage('Debe ser un correo electronico válido'),
  body('password')
    .notEmpty()
    .withMessage('La contraseña es requerida')
], validar, async (req, res) => {
  const { email, password } = req.body;
  try {
    const [usuarios] = await pool.query(`
      SELECT c.*, r.nombre as nombre_rol 
      FROM colaboradores c 
      JOIN roles r ON c.rol_id = r.id 
      WHERE c.email = ?
    `, [email]);

    if (usuarios.length === 0) return res.status(401).json({ error: 'Credenciales incorrectas.' });

    const usuario = usuarios[0];
    const contraseñaValida = await bcrypt.compare(password, usuario.password);

    if (!contraseñaValida) return res.status(401).json({ error: 'Credenciales incorrectas.' });

    const token = jwt.sign(
      { id: usuario.id, rol: usuario.nombre_rol, nombre: usuario.nombre },
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
app.get('/api/admin/colaboradores', verificarToken, esAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT c.id, c.nombre, c.email, r.nombre as rol, c.licencia_conducir FROM colaboradores c JOIN roles r ON c.rol_id = r.id`);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: 'Error interno en el servidor, notifique administración' }); }
});

app.post('/api/admin/colaboradores', verificarToken, esAdmin, [
  body('nombre')
    .trim()
    .notEmpty()
    .withMessage('El nombre es requerido'),
  body('email')
    .isEmail()
    .withMessage('Debe ser un correo electrónico válido'),
  body('rol_id')
    .isInt({ min: 1 })
    .withMessage('El rol asignado no es válido')
], validar, async (req, res) => {
  const { nombre, email, rol_id, licencia_conducir } = req.body;
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('12345', salt);
    const [result] = await pool.query(
      'INSERT INTO colaboradores (nombre, email, password, rol_id, licencia_conducir, debe_cambiar_password) VALUES (?, ?, ?, ?, ?, TRUE)',
      [nombre, email, hashedPassword, rol_id, licencia_conducir || null]
    );
    res.status(201).json({ mensaje: 'Colaborador creado exitosamente', id: result.insertId });
  } catch (err) {
    if (esErrorDuplicado(err)) return res.status(400).json({ error: 'Ya existe un colaborador con ese correo electrónico.' });
    res.status(500).json({ error: 'Error interno en el servidor, notifique administración' });
  }
});

app.put('/api/admin/colaboradores/:id', verificarToken, esAdmin, [
  body('nombre')
    .trim()
    .notEmpty()
    .withMessage('El nombre es requerido'),
  body('email')
    .isEmail()
    .withMessage('Debe ser un correo electrónico válido'),
  body('rol_id')
    .isInt({ min: 1 })
    .withMessage('El rol asignado no es válido')
], validar, async (req, res) => {
  const { id } = req.params;
  const { nombre, email, rol_id, licencia_conducir } = req.body;
  try {
    await pool.query('UPDATE colaboradores SET nombre = ?, email = ?, rol_id = ?, licencia_conducir = ? WHERE id = ?', [nombre, email, rol_id, licencia_conducir || null, id]);
    res.json({ mensaje: 'Colaborador actualizado' });
  } catch (err) {
    if (esErrorDuplicado(err)) return res.status(400).json({ error: 'Ya existe un colaborador con ese correo electrónico.' });
    res.status(500).json({ error: 'Error interno en el servidor, notifique administración' });
  }
});

app.delete('/api/admin/colaboradores/:id', verificarToken, esAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM colaboradores WHERE id = ?', [req.params.id]);
    res.json({ mensaje: 'Colaborador eliminado' });
  } catch (err) { res.status(400).json({ error: 'No se puede eliminar un usuario con registros activos.' }); }
});

// ==========================================
// 5. MÓDULO ADMIN - CRUD VEHÍCULOS
// ==========================================
// LECTURA CON CÁLCULO DE VENCIMIENTOS
app.get('/api/admin/vehiculos', verificarToken, esAdmin, async (req, res) => {
  try {
    const [vehiculos] = await pool.query('SELECT * FROM vehiculos ORDER BY id ASC');
    const fechaActual = new Date();

    const listaProcesada = vehiculos.map(vehiculo => {
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
    });
    res.json(listaProcesada);
  } catch (err) { res.status(500).json({ error: 'Error interno en el servidor, notifique administración' }); }
});


// ==========================================
// 6. CHECKLIST VERIFICACIÓN DIARIA VEHICULO
// ==========================================
// OBTENER VEHICULOS LIBRES
app.get('/api/conductor/vehiculos-disponibles', verificarToken, async (req, res) => {
  try {
    // Traemos los carros que NO tienen un checklist registrado con la fecha del día de hoy
    const query = `
      SELECT id, placa, marca, estado, DATE_FORMAT(fecha_soat, '%Y-%m-%d') as fecha_soat, DATE_FORMAT(fecha_tecnomecanica, '%Y-%m-%d') as fecha_tecnomecanica, DATE_FORMAT(fecha_ultimo_cambio_aceite, '%Y-%m-%d') as fecha_ultimo_cambio_aceite
      FROM vehiculos 
      WHERE id NOT IN (
        SELECT vehiculo_id 
        FROM checklists_diarios 
        WHERE fecha = CURRENT_DATE()
      ) AND estado = 'Disponible';
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
    res.json(listaProcesada);
    //res.json(vehiculos);
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
  body(campo).isBoolean().withMessage(`El campo ${campo.replace(/_/g, ' ')} debe ser verdadero o falso`)
);

// GUARDAR CHECKLIST DE CARRO ENVIADO
app.post('/api/conductor/checklist', verificarToken, [
  body('vehiculo_id').isInt({ min: 1 }).withMessage('Vehículo inválido'),
  ...validacionesChecklist,
  body('observaciones').optional({ values: 'null' }).trim()
], validar, async (req, res) => {
  const data = req.body;

  // Extraemos el ID del colaborador autenticado (el conductor)
  const colaborador_id = req.usuario.id;

  // Un carro está apto si cumple con los 5 puntos críticos obligatorios de seguridad
  const apto_para_trabajar = (data.freno_servicio && data.freno_emergencia && data.llantas_estado);

  try {
    // Doble validación de seguridad: verificar que no le hayan hecho checklist hoy a ese carro
    const [existe] = await pool.query(
      'SELECT id FROM checklists_diarios WHERE vehiculo_id = ? AND fecha = CURRENT_DATE()',
      [data.vehiculo_id]
    );

    if (existe.length > 0) {
      return res.status(400).json({ error: 'Este vehículo ya fue verificado por otro conductor el día de hoy.' });
    }

    // Insertar el nuevo registro en la base de datos
    const insertQuery = `
      INSERT INTO checklists_diarios (
    vehiculo_id, colaborador_id, luces_frontales, luces_traseras, direccionales_delanteras, direccionales_traseras, 
    espejos_laterales, alarma_retroceso, pito, freno_servicio, freno_emergencia, direccion_suspension, 
    cinturon_seguridad, vidrio_frontal, limpia_brisas, silleteria, indicadores_tablero, baterias_cables, 
    presion_aire, llantas_estado, fugas_hidraulicas, pasadores_suspension, fugas_aire, grapas_chasis, 
    cadena_cardan, acoples_rapidos, mangueras, estado_volco, soporte_volco, tanque_combustible, motor, 
    sistema_cargado, ganchos_compuerta, soportes_buge, documentos, gato, cruceta, taco, caja_herramientas, 
    llanta_repuesto, linterna, senales_carretera, botiquin, extintor, observaciones, apto_para_trabajar
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
app.get('/api/admin/checklists', verificarToken, esAdmin, async (req, res) => {
  try {
    const query = `
      SELECT 
        c.*, 
        DATE_FORMAT(c.fecha, '%Y-%m-%d') as fecha_formateada,
        v.placa, v.marca, 
        v.fecha_soat, v.fecha_tecnomecanica, 
        col.nombre AS conductor
      FROM checklists_diarios c
      JOIN vehiculos v ON c.vehiculo_id = v.id
      JOIN colaboradores col ON c.colaborador_id = col.id
      ORDER BY c.fecha DESC, c.hora DESC
    `;

    const [checklists] = await pool.query(query);
    res.json(checklists);
  } catch (error) {
    console.error('Error al obtener checklists:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// CREAR
app.post('/api/admin/vehiculos', verificarToken, esAdmin, [
  body('placa')
    .trim()
    .notEmpty()
    .withMessage('La placa es requerida'),
  body('marca')
    .trim()
    .notEmpty()
    .withMessage('La marca es requerida'),
  body('capacidad_carga_kg')
    .isFloat({ min: 1 })
    .withMessage('La capacidad debe ser un número mayor a 0'),
  body('fecha_soat')
    .isISO8601()
    .withMessage('La fecha del SOAT no es válida'),
  body('fecha_tecnomecanica')
    .isISO8601()
    .withMessage('La fecha de tecnomecánica no es válida'),
  body('fecha_ultimo_cambio_aceite')
    .isISO8601()
    .withMessage('La fecha de último cambio de aceite es requerida')
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
    .notEmpty()
    .withMessage('La placa es requerida'),
  body('marca')
    .trim()
    .notEmpty()
    .withMessage('La marca es requerida'),
  body('capacidad_carga_kg')
    .isFloat({ min: 1 })
    .withMessage('La capacidad debe ser un número mayor a 0'),
  body('fecha_soat')
    .isISO8601()
    .withMessage('La fecha del SOAT no es válida'),
  body('fecha_tecnomecanica')
    .isISO8601()
    .withMessage('La fecha de tecnomecánica no es válida'),
  body('fecha_ultimo_cambio_aceite')
    .isISO8601()
    .withMessage('La fecha de último cambio de aceite es requerida')
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
app.delete('/api/admin/vehiculos/:id', verificarToken, esAdmin, async (req, res) => {
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
  body('password_actual')
    .notEmpty()
    .withMessage('La contraseña actual es requerida'),
  body('password_nuevo')
    .isLength({ min: 6 })
    .withMessage('La nueva contraseña debe tener mínimo 6 caracteres')
], validar, async (req, res) => {
  const { password_actual, password_nuevo } = req.body;

  try {
    // 1. Buscar al usuario
    const [usuarios] = await pool.query('SELECT * FROM colaboradores WHERE id = ?', [req.usuario.id]);
    if (usuarios.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // 2. Verificar que la contraseña actual sea correcta
    const usuario = usuarios[0];
    const contraseñaValida = await bcrypt.compare(password_actual, usuario.password);
    if (!contraseñaValida) {
      return res.status(401).json({ error: 'La contraseña actual es incorrecta' });
    }

    // 3. Hashear la nueva contraseña y actualizar
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password_nuevo, salt);
    await pool.query(
      'UPDATE colaboradores SET password = ?, debe_cambiar_password = FALSE WHERE id = ?',
      [hashedPassword, req.usuario.id]
    );

    res.json({ mensaje: 'Contraseña actualizada exitosamente' });
  } catch (error) {
    console.error('Error al cambiar contraseña:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ==========================================
// INICIAR EL SERVIDOR
// ==========================================
app.listen(PORT, () => {
  console.log(`Servidor de Materiales Vera corriendo de forma segura en: http://localhost:${PORT}`);
});