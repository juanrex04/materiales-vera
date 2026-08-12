-- ============================================================
-- MATERIALES VERA - ESQUEMA PARA TIDB CLOUD (SERVERLESS)
-- Motor: TiDB (compatible con MySQL 8)
-- Como usarlo:
--   1. Crea tu cluster Serverless en TiDB Cloud y anota la BD.
--   2. Abre la consola "Chat2Query" o conéctate con tu cliente MySQL.
--   3. Ejecuta TODO este archivo DENTRO de la base de datos del cluster.
-- NOTA: A diferencia de database.sql (local), este archivo NO crea la
--       base de datos ni usa "USE": la BD ya existe en tu cluster.
-- ============================================================

-- ------------------------------------------------------------
-- TABLA: roles
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS roles (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `nombre` (`nombre`)
);

-- ------------------------------------------------------------
-- TABLA: colaboradores
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS colaboradores (
  `id` int NOT NULL AUTO_INCREMENT,
  `documento` varchar(20) DEFAULT NULL,
  `nombre` varchar(100) NOT NULL,
  `password` varchar(255) NOT NULL,
  `rol_id` int NOT NULL,
  `licencia_conducir` varchar(50) DEFAULT NULL,
  `debe_cambiar_password` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `documento` (`documento`),
  KEY `rol_id` (`rol_id`),
  CONSTRAINT `colaboradores_ibfk_1` FOREIGN KEY (`rol_id`) REFERENCES `roles` (`id`) ON DELETE RESTRICT
);

-- ------------------------------------------------------------
-- TABLA: vehiculos
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehiculos (
  `id` int NOT NULL AUTO_INCREMENT,
  `placa` varchar(20) NOT NULL,
  `marca` varchar(50) NOT NULL,
  `capacidad_carga_kg` int NOT NULL,
  `estado` enum('Disponible','En Ruta','Mantenimiento') DEFAULT 'Disponible',
  `fecha_soat` date NOT NULL,
  `fecha_tecnomecanica` date NOT NULL,
  `fecha_ultimo_cambio_aceite` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `placa` (`placa`)
);

-- ------------------------------------------------------------
-- TABLA: asignacion_vehiculos
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS asignacion_vehiculos (
  `id` int NOT NULL AUTO_INCREMENT,
  `vehiculo_id` int NOT NULL,
  `colaborador_id` int NOT NULL,
  `fecha_asignacion` date NOT NULL,
  `estado` enum('Activa','Inactiva') DEFAULT 'Activa',
  PRIMARY KEY (`id`),
  KEY `vehiculo_id` (`vehiculo_id`),
  KEY `colaborador_id` (`colaborador_id`),
  CONSTRAINT `asignacion_vehiculos_ibfk_1` FOREIGN KEY (`vehiculo_id`) REFERENCES `vehiculos` (`id`) ON DELETE CASCADE,
  CONSTRAINT `asignacion_vehiculos_ibfk_2` FOREIGN KEY (`colaborador_id`) REFERENCES `colaboradores` (`id`) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- TABLA: checklists_diarios
-- fecha y hora las inserta el backend (CURRENT_DATE/CURRENT_TIME),
-- por lo que no dependen de defaults de la base de datos.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS checklists_diarios (
  `id` int NOT NULL AUTO_INCREMENT,
  `vehiculo_id` int NOT NULL,
  `colaborador_id` int NOT NULL,
  `fecha` date NOT NULL,
  `hora` time NOT NULL,
  `luces_frontales` tinyint(1) DEFAULT '0',
  `luces_traseras` tinyint(1) DEFAULT '0',
  `direccionales_delanteras` tinyint(1) DEFAULT '0',
  `direccionales_traseras` tinyint(1) DEFAULT '0',
  `espejos_laterales` tinyint(1) DEFAULT '0',
  `alarma_retroceso` tinyint(1) DEFAULT '0',
  `pito` tinyint(1) DEFAULT '0',
  `freno_servicio` tinyint(1) DEFAULT '0',
  `freno_emergencia` tinyint(1) DEFAULT '0',
  `direccion_suspension` tinyint(1) DEFAULT '0',
  `cinturon_seguridad` tinyint(1) DEFAULT '0',
  `vidrio_frontal` tinyint(1) DEFAULT '0',
  `limpia_brisas` tinyint(1) DEFAULT '0',
  `silleteria` tinyint(1) DEFAULT '0',
  `indicadores_tablero` tinyint(1) DEFAULT '0',
  `baterias_cables` tinyint(1) DEFAULT '0',
  `presion_aire` tinyint(1) DEFAULT '0',
  `llantas_estado` tinyint(1) DEFAULT '0',
  `fugas_hidraulicas` tinyint(1) DEFAULT '0',
  `pasadores_suspension` tinyint(1) DEFAULT '0',
  `fugas_aire` tinyint(1) DEFAULT '0',
  `grapas_chasis` tinyint(1) DEFAULT '0',
  `cadena_cardan` tinyint(1) DEFAULT '0',
  `acoples_rapidos` tinyint(1) DEFAULT '0',
  `mangueras` tinyint(1) DEFAULT '0',
  `estado_volco` tinyint(1) DEFAULT '0',
  `soporte_volco` tinyint(1) DEFAULT '0',
  `tanque_combustible` tinyint(1) DEFAULT '0',
  `motor` tinyint(1) DEFAULT '0',
  `sistema_cargado` tinyint(1) DEFAULT '0',
  `ganchos_compuerta` tinyint(1) DEFAULT '0',
  `soportes_buge` tinyint(1) DEFAULT '0',
  `documentos` tinyint(1) DEFAULT '0',
  `gato` tinyint(1) DEFAULT '0',
  `cruceta` tinyint(1) DEFAULT '0',
  `taco` tinyint(1) DEFAULT '0',
  `caja_herramientas` tinyint(1) DEFAULT '0',
  `llanta_repuesto` tinyint(1) DEFAULT '0',
  `linterna` tinyint(1) DEFAULT '0',
  `senales_carretera` tinyint(1) DEFAULT '0',
  `botiquin` tinyint(1) DEFAULT '0',
  `extintor` tinyint(1) DEFAULT '0',
  `observaciones` text,
  `apto_para_trabajar` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `vehiculo_id` (`vehiculo_id`),
  KEY `colaborador_id` (`colaborador_id`),
  CONSTRAINT `checklists_diarios_ibfk_1` FOREIGN KEY (`vehiculo_id`) REFERENCES `vehiculos` (`id`),
  CONSTRAINT `checklists_diarios_ibfk_2` FOREIGN KEY (`colaborador_id`) REFERENCES `colaboradores` (`id`)
);

-- ------------------------------------------------------------
-- TABLA: inventario
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventario (
  `id` int NOT NULL AUTO_INCREMENT,
  `nombre_producto` varchar(150) NOT NULL,
  `sku` varchar(50) NOT NULL,
  `cantidad` int NOT NULL DEFAULT '0',
  `ubicacion` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `sku` (`sku`)
);

-- ============================================================
-- DATOS INICIALES (SEED)
-- ============================================================

-- Roles del sistema
INSERT INTO roles (id, nombre) VALUES (1, 'Admin'), (2, 'Conductor')
ON DUPLICATE KEY UPDATE nombre = VALUES(nombre);

-- Usuario administrador inicial
-- Documento: 11111
-- Clave:  12345  (debe cambiarla en el primer inicio de sesion)
INSERT INTO colaboradores (documento, nombre, password, rol_id, licencia_conducir, debe_cambiar_password)
VALUES ('11111', 'Administrador', '$2b$10$39p50K5ENpGM6812WkotHOpGDnNR6FtYZrkadZQ1EenAo1XVUmafa', 1, NULL, TRUE)
ON DUPLICATE KEY UPDATE documento = documento;
