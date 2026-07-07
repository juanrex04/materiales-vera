const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// ==========================================
// 1. CONFIGURACIÓN DE MIDDLEWARES Y BD
// ==========================================
app.use(cors());
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

// --- RUTA DE EMERGENCIA PARA ARREGLAR CONTRASEÑA ---
/*app.get('/api/fix-admin', async (req, res) => {
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('123456', salt); // Encriptamos '123456'
    
    await pool.query(
      'UPDATE colaboradores SET password = ? WHERE email = "admin@materialesvera.com"', 
      [hashedPassword]
    );
    
    res.json({ mensaje: '¡Éxito! Contraseña del admin actualizada correctamente a 123456.' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});*/

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
app.post('/api/login', async (req, res) => {
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

    res.json({ token, rol: usuario.nombre_rol, nombre: usuario.nombre });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// 4. MÓDULO CONDUCTORES
// ==========================================
app.get('/api/conductor/mi-vehiculo', verificarToken, async (req, res) => {
  if (req.usuario.rol !== 'Conductor') return res.status(403).json({ error: 'Ruta exclusiva para conductores.' });

  try {
    const [vehiculos] = await pool.query(`
      SELECT v.placa, v.marca, v.capacidad_carga_kg, a.fecha_asignacion 
      FROM vehiculos v
      JOIN asignacion_vehiculos a ON v.id = a.vehiculo_id
      WHERE a.colaborador_id = ? AND a.estado = 'Activa'
    `, [req.usuario.id]);

    if (vehiculos.length === 0) return res.json({ mensaje: 'No tienes ningún vehículo asignado actualmente.' });
    res.json(vehiculos[0]);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 5. MÓDULO ADMIN - CRUD COLABORADORES
// ==========================================
app.get('/api/admin/colaboradores', verificarToken, esAdmin, async (req, res) => {
  try {
    const [rows] = await pool.query(`SELECT c.id, c.nombre, c.email, r.nombre as rol, c.licencia_conducir FROM colaboradores c JOIN roles r ON c.rol_id = r.id`);
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/admin/colaboradores', verificarToken, esAdmin, async (req, res) => {
  const { nombre, email, password, rol_id, licencia_conducir } = req.body;
  try {
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const [result] = await pool.query(
      'INSERT INTO colaboradores (nombre, email, password, rol_id, licencia_conducir) VALUES (?, ?, ?, ?, ?)',
      [nombre, email, hashedPassword, rol_id, licencia_conducir || null]
    );
    res.status(201).json({ mensaje: 'Colaborador creado exitosamente', id: result.insertId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/admin/colaboradores/:id', verificarToken, esAdmin, async (req, res) => {
  const { id } = req.params;
  const { nombre, email, rol_id, licencia_conducir } = req.body;
  try {
    await pool.query('UPDATE colaboradores SET nombre = ?, email = ?, rol_id = ?, licencia_conducir = ? WHERE id = ?', [nombre, email, rol_id, licencia_conducir || null, id]);
    res.json({ mensaje: 'Colaborador actualizado' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/admin/colaboradores/:id', verificarToken, esAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM colaboradores WHERE id = ?', [req.params.id]);
    res.json({ mensaje: 'Colaborador eliminado' });
  } catch (err) { res.status(400).json({ error: 'No se puede eliminar un usuario con registros activos.' }); }
});

// ==========================================
// 6. MÓDULO ADMIN - CRUD VEHÍCULOS
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

      return {
        ...vehiculo,
        soat_dias_restantes: diasFaltanSoat,
        tecno_dias_restantes: diasFaltanTecno,
        soat_estado: diasFaltanSoat < 0 ? 'VENCIDO' : (diasFaltanSoat <= 15 ? 'PROXIMO' : 'OK'),
        tecno_estado: diasFaltanTecno < 0 ? 'VENCIDO' : (diasFaltanTecno <= 15 ? 'PROXIMO' : 'OK')
      };
    });
    res.json(listaProcesada);
  } catch (err) { res.status(500).json({ error: err.message }); }
});


// ==========================================
// 7. CHECKLIST VERIFICACIÓN DIARIA VEHICULO
// ==========================================
// OBTENER VEHICULOS LIBRES
app.get('/api/conductor/vehiculos-disponibles', verificarToken, async (req, res) => {
  try {
    // Traemos los carros que NO tienen un checklist registrado con la fecha del día de hoy
    const query = `
      SELECT id, placa, marca, estado, DATE_FORMAT(fecha_soat, '%Y-%m-%d') as fecha_soat, DATE_FORMAT(fecha_tecnomecanica, '%Y-%m-%d') as fecha_tecnomecanica
      FROM vehiculos 
      WHERE id NOT IN (
        SELECT vehiculo_id 
        FROM checklists_diarios 
        WHERE fecha = CURRENT_DATE()
      ) AND estado != 'En Ruta';
    `;

    const [vehiculos] = await pool.query(query);
    res.json(vehiculos);
  } catch (error) {
    console.error('Error al obtener vehículos:', error);
    res.status(500).json({ error: 'Error en el servidor al consultar vehículos.' });
  }
});

// GUARDAR CHECKLIST DE CARRO ENVIADO
app.post('/api/conductor/checklist', verificarToken, async (req, res) => {
  const data = req.body;

  // Extraemos el ID del colaborador autenticado (el conductor)
  // Nota: Asegúrate de usar la propiedad exacta donde tu middleware de token guarda el ID (ej: req.colaborador.id o req.usuario.id)
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
      await pool.query("UPDATE vehiculos SET estado = 'Mantenimiento' WHERE id = ?", [vehiculo_id]);
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
// Obtener el historial de checklists (Vista Administrador)
app.get('/api/admin/checklists', verificarToken, async (req, res) => {
  try {
    const query = `
      SELECT 
        c.*, 
        DATE_FORMAT(c.fecha, '%Y-%m-%d') as fecha_formateada,
        v.placa, v.marca,
        col.nombre AS conductor
      FROM checklists_diarios c
      JOIN vehiculos v ON c.vehiculo_id = v.id
      JOIN colaboradores col ON c.colaborador_id = col.id
      ORDER BY c.fecha DESC, c.hora DESC
    `;

    // Recuerda usar pool.query o conexion.query, según como lo tengas configurado
    const [checklists] = await pool.query(query);
    res.json(checklists);
  } catch (error) {
    console.error('Error al obtener checklists:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// CREAR
app.post('/api/admin/vehiculos', verificarToken, esAdmin, async (req, res) => {
  const { placa, marca, capacidad_carga_kg, fecha_soat, fecha_tecnomecanica, estado } = req.body;
  try {
    const [result] = await pool.query(
      'INSERT INTO vehiculos (placa, marca, capacidad_carga_kg, fecha_soat, fecha_tecnomecanica, estado) VALUES (?, ?, ?, ?, ?, ?)',
      [placa, marca, capacidad_carga_kg, fecha_soat, fecha_tecnomecanica, estado || 'Disponible']
    );
    res.status(201).json({ mensaje: 'Vehículo registrado', id: result.insertId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ACTUALIZAR
app.put('/api/admin/vehiculos/:id', verificarToken, esAdmin, async (req, res) => {
  const { id } = req.params;
  const { placa, marca, capacidad_carga_kg, fecha_soat, fecha_tecnomecanica, estado } = req.body;
  try {
    await pool.query(
      'UPDATE vehiculos SET placa = ?, marca = ?, capacidad_carga_kg = ?, fecha_soat = ?, fecha_tecnomecanica = ?, estado = ? WHERE id = ?',
      [placa, marca, capacidad_carga_kg, fecha_soat, fecha_tecnomecanica, estado, id]
    );
    res.json({ mensaje: 'Vehículo modificado con éxito' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ELIMINAR
app.delete('/api/admin/vehiculos/:id', verificarToken, esAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM vehiculos WHERE id = ?', [req.params.id]);
    res.json({ mensaje: 'Vehículo eliminado de la flota' });
  } catch (err) { res.status(400).json({ error: 'Error al eliminar. Verifique dependencias de asignación.' }); }
});

// ==========================================
// 7. MÓDULO ADMIN - CRUD INVENTARIO
// ==========================================
app.get('/api/inventario', verificarToken, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM inventario ORDER BY nombre_producto ASC');
    res.json(rows);
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.post('/api/inventario', verificarToken, esAdmin, async (req, res) => {
  const { nombre_producto, sku, cantidad, ubicacion } = req.body;
  try {
    const [result] = await pool.query('INSERT INTO inventario (nombre_producto, sku, cantidad, ubicacion) VALUES (?, ?, ?, ?)', [nombre_producto, sku, cantidad, ubicacion]);
    res.status(201).json({ mensaje: 'Producto en bodega guardado', id: result.insertId });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.put('/api/inventario/:id', verificarToken, esAdmin, async (req, res) => {
  const { id } = req.params;
  const { nombre_producto, sku, cantidad, ubicacion } = req.body;
  try {
    await pool.query('UPDATE inventario SET nombre_producto = ?, sku = ?, cantidad = ?, ubicacion = ? WHERE id = ?', [nombre_producto, sku, cantidad, ubicacion, id]);
    res.json({ mensaje: 'Inventario actualizado' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

app.delete('/api/inventario/:id', verificarToken, esAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM inventario WHERE id = ?', [req.params.id]);
    res.json({ mensaje: 'Producto eliminado del catálogo' });
  } catch (err) { res.status(500).json({ error: err.message }); }
});

// ==========================================
// 8. INICIAR EL SERVIDOR
// ==========================================
app.listen(PORT, () => {
  console.log(`Servidor de Materiales Vera corriendo de forma segura en: http://localhost:${PORT}`);
});