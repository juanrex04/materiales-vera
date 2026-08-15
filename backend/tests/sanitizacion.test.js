import { describe, it, expect, beforeEach, afterAll } from 'vitest';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import 'dotenv/config';

import { app, pool } from '../server.js';

const tokenAdmin = jwt.sign(
  { id: 1, rol: 'Admin', nombre: 'Administrador' },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);
const tokenConductor = jwt.sign(
  { id: 2, rol: 'Conductor', nombre: 'Carlos Conductor' },
  process.env.JWT_SECRET,
  { expiresIn: '1h' }
);

let llamadas = [];
const queryOriginal = pool.query;

beforeEach(() => {
  llamadas = [];
  pool.query = async (sql, params) => {
    llamadas.push({ sql: String(sql), params });
    const tipo = String(sql).trim().toUpperCase().split(' ')[0];
    if (tipo === 'SELECT') {
      if (String(sql).toUpperCase().includes('COUNT(')) return [[{ total: 0 }], []];
      return [[], []];
    }
    if (tipo === 'INSERT') return [{ insertId: 999, affectedRows: 1 }];
    return [{ affectedRows: 1 }];
  };
});

afterAll(() => {
  pool.query = queryOriginal;
});

function api(metodo, ruta, body, token = tokenAdmin) {
  let req = request(app)[metodo](ruta);
  if (token) req = req.set('Authorization', `Bearer ${token}`);
  if (body !== undefined) req = req.send(body);
  return req;
}

function capturaInsert(tabla) {
  return llamadas.find((c) => c.sql.includes(`INSERT INTO ${tabla}`));
}

const campos = [
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

const vehiculoValido = {
  placa: 'AAA-111',
  marca: 'Kenworth',
  capacidad_carga_kg: 10,
  estado: 'Disponible',
  fecha_soat: '2027-01-01',
  fecha_tecnomecanica: '2027-06-01',
  fecha_ultimo_cambio_aceite: '2026-08-01'
};

function cuerpoChecklist(overrides = {}) {
  const cuerpo = { vehiculo_id: 1, observaciones: '' };
  for (const c of campos) cuerpo[c] = false;
  return { ...cuerpo, ...overrides };
}

describe('Sanitización de inputs', () => {
  describe('Rechazos (400) sin llegar a la DB', () => {
    it('login con documento <script>', async () => {
      const res = await api('post', '/api/login', { documento: '<script>alert(1)</script>', password: 'x' });
      expect(res.status).toBe(400);
      expect(llamadas).toHaveLength(0);
    });

    it('colaborador nombre <script>', async () => {
      const res = await api('post', '/api/admin/colaboradores', { nombre: '<script>alert(1)</script>', documento: '11111', rol_id: 1 });
      expect(res.status).toBe(400);
      expect(llamadas).toHaveLength(0);
    });

    it('colaborador nombre demasiado corto', async () => {
      const res = await api('post', '/api/admin/colaboradores', { nombre: 'A', documento: '11111', rol_id: 1 });
      expect(res.status).toBe(400);
      expect(llamadas).toHaveLength(0);
    });

    it('colaborador documento inválido', async () => {
      const res = await api('post', '/api/admin/colaboradores', { nombre: 'Juan Perez', documento: 'abc', rol_id: 1 });
      expect(res.status).toBe(400);
      expect(llamadas).toHaveLength(0);
    });

    it('colaborador licencia con caracteres no permitidos', async () => {
      const res = await api('post', '/api/admin/colaboradores', { nombre: 'Juan Perez', documento: '11111', rol_id: 1, licencia_conducir: '$$$' });
      expect(res.status).toBe(400);
      expect(llamadas).toHaveLength(0);
    });

    it('vehículo placa con <>', async () => {
      const res = await api('post', '/api/admin/vehiculos', { ...vehiculoValido, placa: '<>' });
      expect(res.status).toBe(400);
      expect(llamadas).toHaveLength(0);
    });

    it('vehículo placa demasiado corta', async () => {
      const res = await api('post', '/api/admin/vehiculos', { ...vehiculoValido, placa: 'AB' });
      expect(res.status).toBe(400);
      expect(llamadas).toHaveLength(0);
    });

    it('vehículo estado no permitido', async () => {
      const res = await api('post', '/api/admin/vehiculos', { ...vehiculoValido, estado: 'roto' });
      expect(res.status).toBe(400);
      expect(llamadas).toHaveLength(0);
    });

    it('vehículo capacidad 0', async () => {
      const res = await api('post', '/api/admin/vehiculos', { ...vehiculoValido, capacidad_carga_kg: 0 });
      expect(res.status).toBe(400);
      expect(llamadas).toHaveLength(0);
    });

    it('vehículo fecha SOAT inválida', async () => {
      const res = await api('post', '/api/admin/vehiculos', { ...vehiculoValido, fecha_soat: 'abc' });
      expect(res.status).toBe(400);
      expect(llamadas).toHaveLength(0);
    });

    it('vehículo marca <script>', async () => {
      const res = await api('post', '/api/admin/vehiculos', { ...vehiculoValido, marca: '<script>alert(1)</script>' });
      expect(res.status).toBe(400);
      expect(llamadas).toHaveLength(0);
    });

    it('PUT vehículo id no numérico', async () => {
      const res = await api('put', '/api/admin/vehiculos/abc', vehiculoValido);
      expect(res.status).toBe(400);
      expect(llamadas).toHaveLength(0);
    });

    it('PUT colaborador id no numérico', async () => {
      const res = await api('put', '/api/admin/colaboradores/abc', { nombre: 'Juan Perez', documento: '11111', rol_id: 1 });
      expect(res.status).toBe(400);
      expect(llamadas).toHaveLength(0);
    });

    it('DELETE vehículo id no numérico', async () => {
      const res = await api('delete', '/api/admin/vehiculos/abc');
      expect(res.status).toBe(400);
      expect(llamadas).toHaveLength(0);
    });

    it('DELETE colaborador id no numérico', async () => {
      const res = await api('delete', '/api/admin/colaboradores/abc');
      expect(res.status).toBe(400);
      expect(llamadas).toHaveLength(0);
    });

    it('checklist observaciones de más de 1000 caracteres', async () => {
      const res = await api('post', '/api/conductor/checklist', cuerpoChecklist({ observaciones: 'x'.repeat(1001) }), tokenConductor);
      expect(res.status).toBe(400);
      expect(llamadas).toHaveLength(0);
    });
  });

  describe('Normalización (se verifica lo que llega a la DB)', () => {
    it('vehículo: placa a mayúsculas, marca y capacidad limpios', async () => {
      const res = await api('post', '/api/admin/vehiculos', {
        ...vehiculoValido,
        placa: ' prb-001 ',
        marca: ' Volvo ',
        capacidad_carga_kg: '12.5'
      });
      expect(res.status).toBe(201);
      const ins = capturaInsert('vehiculos');
      expect(ins).toBeTruthy();
      expect(ins.params[0]).toBe('PRB-001');
      expect(ins.params[1]).toBe('Volvo');
      expect(ins.params[2]).toBe(12.5);
      expect(typeof ins.params[2]).toBe('number');
    });

    it('vehículo: stripLow elimina caracteres de control en marca', async () => {
      const res = await api('post', '/api/admin/vehiculos', { ...vehiculoValido, placa: 'PRB-002', marca: 'Volvo\tS.A.' });
      expect(res.status).toBe(201);
      const ins = capturaInsert('vehiculos');
      expect(ins.params[1]).toBe('VolvoS.A.');
    });

    it('vehículo PUT sanea los valores', async () => {
      const res = await api('put', '/api/admin/vehiculos/5', { ...vehiculoValido, placa: ' prb-003 ', marca: ' Mazda ' });
      expect(res.status).toBe(200);
      const upd = llamadas.find((c) => c.sql.includes('UPDATE vehiculos SET'));
      expect(upd).toBeTruthy();
      expect(upd.params[0]).toBe('PRB-003');
      expect(upd.params[1]).toBe('Mazda');
    });

    it('colaborador: documento normalizado, rol numérico, contraseña hasheada', async () => {
      const res = await api('post', '/api/admin/colaboradores', {
        nombre: ' Juan Perez ',
        documento: ' 1234567 ',
        rol_id: '2',
        licencia_conducir: ' C1-123 '
      });
      expect(res.status).toBe(201);
      const ins = capturaInsert('colaboradores');
      expect(ins).toBeTruthy();
      expect(ins.params[0]).toBe('Juan Perez');
      expect(ins.params[1]).toBe('1234567');
      expect(ins.params[3]).toBe(2);
      expect(typeof ins.params[3]).toBe('number');
      expect(ins.params[4]).toBe('C1-123');
      expect(bcrypt.compareSync('12345', ins.params[2])).toBe(true);
    });

    it('checklist: booleanos convertidos, observaciones con trim y stripLow', async () => {
      const cuerpo = cuerpoChecklist({
        luces_frontales: 'true',
        freno_servicio: 'false',
        observaciones: '  nota\u0001  '
      });
      const res = await api('post', '/api/conductor/checklist', cuerpo, tokenConductor);
      expect(res.status).toBe(200);
      const ins = capturaInsert('checklists_diarios');
      expect(ins).toBeTruthy();
      const vals = ins.params;
      expect(vals[0]).toBe(1);
      const booleans = vals.slice(2, vals.length - 2);
      expect(booleans).toHaveLength(campos.length);
      booleans.forEach((b) => expect(typeof b).toBe('boolean'));
      expect(vals[2]).toBe(true);
      expect(vals[vals.length - 2]).toBe('nota');
      expect(vals[vals.length - 1]).toBe(false);
    });

    it('filtro placa con espacios se trimea y pasa en mayúsculas', async () => {
      const res = await api('get', '/api/admin/checklists?placa=%20ABC-123%20');
      expect(res.status).toBe(200);
      const select = llamadas.find((c) => c.sql.includes('FROM checklists_diarios'));
      expect(select).toBeTruthy();
      expect(select.params[0]).toBe('ABC-123');
    });

    it('filtro texto se trimea', async () => {
      const res = await api('get', '/api/admin/checklists?texto=%20admin%20&pagina=1');
      expect(res.status).toBe(200);
      const select = llamadas.find((c) => c.sql.includes('LIKE'));
      expect(select).toBeTruthy();
      expect(select.params[0]).toBe('%admin%');
    });
  });

  describe('Auth y regresión', () => {
    it('sin token → 403', async () => {
      const res = await api('get', '/api/admin/checklists', undefined, null);
      expect(res.status).toBe(403);
    });

    it('token de conductor en ruta admin → 403', async () => {
      const res = await api('get', '/api/admin/checklists', undefined, tokenConductor);
      expect(res.status).toBe(403);
    });

    it('GET checklists paginado → 200', async () => {
      const res = await api('get', '/api/admin/checklists?pagina=1&porPagina=10');
      expect(res.status).toBe(200);
    });

    it('GET checklists exportar → 200', async () => {
      const res = await api('get', '/api/admin/checklists/exportar?placa=ABC-123');
      expect(res.status).toBe(200);
    });

    it('GET vehiculos paginado → 200', async () => {
      const res = await api('get', '/api/admin/vehiculos?pagina=1');
      expect(res.status).toBe(200);
    });

    it('GET colaboradores paginado → 200', async () => {
      const res = await api('get', '/api/admin/colaboradores?pagina=1');
      expect(res.status).toBe(200);
    });

    it('GET colaboradores legacy → 200', async () => {
      const res = await api('get', '/api/admin/colaboradores');
      expect(res.status).toBe(200);
    });

    it('health → 200', async () => {
      const res = await api('get', '/health', undefined, null);
      expect(res.status).toBe(200);
    });

    it('login con usuario inexistente (stub) → 401', async () => {
      const res = await api('post', '/api/login', { documento: '11111', password: '12345' });
      expect(res.status).toBe(401);
    });

    it('cambiar-password válido → 200, marca FALSE y devuelve token nuevo', async () => {
      const res = await api('put', '/api/cambiar-password', { password_nuevo: 'nueva123' }, tokenConductor);
      expect(res.status).toBe(200);
      expect(res.body.token).toBeTruthy();
      const update = llamadas.find((c) => c.sql.includes('UPDATE colaboradores SET password'));
      expect(update).toBeTruthy();
      expect(update.sql).toContain('debe_cambiar_password = FALSE');
      expect(update.params[1]).toBe(2);
      expect(update.params[0]).not.toBe('nueva123');
      const nuevoToken = jwt.decode(res.body.token);
      expect(nuevoToken.debe_cambiar_password).toBe(false);
    });

    it('cambiar-password con clave corta (< 8) → 400', async () => {
      const res = await api('put', '/api/cambiar-password', { password_nuevo: 'abc123' }, tokenConductor);
      expect(res.status).toBe(400);
    });

    it('cambiar-password sin número → 400', async () => {
      const res = await api('put', '/api/cambiar-password', { password_nuevo: 'solotexto' }, tokenConductor);
      expect(res.status).toBe(400);
    });

    it('reset-password con conductor → 403', async () => {
      const res = await api('post', '/api/admin/colaboradores/1/reset-password', undefined, tokenConductor);
      expect(res.status).toBe(403);
    });

    it('reset-password con ID inválido → 400', async () => {
      const res = await api('post', '/api/admin/colaboradores/abc/reset-password');
      expect(res.status).toBe(400);
    });

    it('reset-password válido → 200 y marca debe_cambiar_password = TRUE', async () => {
      const res = await api('post', '/api/admin/colaboradores/5/reset-password');
      expect(res.status).toBe(200);
      const update = llamadas.find((c) => c.sql.includes('UPDATE colaboradores SET password'));
      expect(update).toBeTruthy();
      expect(update.sql).toContain('debe_cambiar_password = TRUE');
      expect(update.params[1]).toBe('5');
      expect(update.params[0]).not.toBe('12345');
    });
  });
});
