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