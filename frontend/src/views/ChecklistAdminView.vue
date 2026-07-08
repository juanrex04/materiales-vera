<template>
  <div class="dashboard-container">
    <div class="content">
      <div class="bienvenida-card">
        <p>Recuerda que para crear un PDF de reporte semanal debes llenar los filtros de acuerdo con lo que necesitas; y al no seleccionar vehiculo y solo fechas será algo general el reporte.</p>
      </div>
      <div class="gestion-seccion">
        <div class="titulo-acciones">
          <h2>Control de Inspecciones (Volquetas)</h2>
          <button @click="cargarChecklists" class="btn-primary">Actualizar Lista</button>
        </div>

        <div class="filtros-container">
          <div class="form-group filtro-item">
            <label>Buscar (Conductor o Placa):</label>
            <input type="text" v-model="filtros.texto" placeholder="Ej: Juan, ABC-123..." class="input-busqueda" />
          </div>

          <div class="form-group filtro-item">
            <label>Fecha Desde:</label>
            <input type="date" v-model="filtros.fechaInicio" class="input-busqueda" />
          </div>

          <div class="form-group filtro-item">
            <label>Fecha Hasta:</label>
            <input type="date" v-model="filtros.fechaFin" class="input-busqueda" />
          </div>

          <div class="form-group filtro-item">
            <label>Estado:</label>
            <select v-model="filtros.estado" class="input-busqueda">
              <option value="todos">Todos los estados</option>
              <option value="apto">Aptos para Operar</option>
              <option value="falla">Fallas Reportadas</option>
            </select>
          </div>

          <div class="acciones-filtros">
            <button @click="limpiarFiltros" class="btn-edit">
              Limpiar
            </button>
            <button @click="generarPDFSemanal" class="btn-primary">
              Descargar PDF Semanal
            </button>
          </div>
        </div>

        <div class="tabla-contenedor">
          <table>
            <thead>
              <tr>
                <th>Fecha y Hora</th>
                <th>Conductor</th>
                <th>Vehículo (Placa)</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="chk in checklistsFiltrados" :key="chk.id">
                <td>
                  <strong>{{ formatearFecha(chk.fecha_formateada) }}</strong><br>
                  <small class="text-muted">{{ chk.hora }}</small>
                </td>
                <td>{{ chk.conductor }}</td>
                <td>{{ chk.placa }} ({{ chk.marca }})</td>
                <td>
                  <span :class="chk.apto_para_trabajar ? 'badge-estado disponible' : 'badge-estado mantenimiento'">
                    {{ chk.apto_para_trabajar ? 'Apto' : 'Con Fallas' }}
                  </span>
                </td>
                <td>
                  <button @click="abrirModalDetalles(chk)" class="btn-primary">Ver Reporte</button>
                </td>
              </tr>
              <tr v-if="checklistsFiltrados.length === 0">
                <td colspan="5" style="text-align: center; padding: 2rem; color: #64748b;">
                  No se encontraron inspecciones en ese rango de fechas.
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div v-if="modalVisible" class="modal-overlay" @click.self="cerrarModal">
          <div class="modal-content modal-largo">
            <div class="modal-header">
              <h3>Reporte de Inspección Preoperacional</h3>
              <button @click="cerrarModal" class="btn-close">✖</button>
            </div>

            <div class="modal-body scroll-area" id="contenido-pdf">
              <div class="info-resumen">
                <p><strong>Conductor:</strong> {{ checklistSeleccionado.conductor }}</p>
                <p><strong>Vehículo:</strong> {{ checklistSeleccionado.placa }} ({{ checklistSeleccionado.marca }})
                </p>
                <p><strong>Fecha de Revisión:</strong> {{ formatearFecha(checklistSeleccionado.fecha_formateada) }} a
                  las {{
                    checklistSeleccionado.hora }}</p>
                <p><strong>Resultado:</strong>
                  <span
                    :style="{ color: checklistSeleccionado.apto_para_trabajar ? '#16a34a' : '#dc2626', fontWeight: 'bold' }">
                    {{ checklistSeleccionado.apto_para_trabajar ? 'VEHÍCULO APTO' : 'NO APTO / REQUIERE REVISIÓN' }}
                  </span>
                </p>
              </div>

              <div class="observaciones-caja">
                <label><strong>Novedades y Observaciones del Conductor:</strong></label>
                <p>{{ checklistSeleccionado.observaciones || 'Ninguna observación registrada.' }}</p>
              </div>

              <div class="grid-categorias">

                <div class="categoria-tarjeta">
                  <h4>Luces y Seguridad</h4>
                  <ul>
                    <li :class="{ 'falla': !checklistSeleccionado.luces_frontales }"><span>Frontales:</span> {{
                      icon(checklistSeleccionado.luces_frontales) }}</li>
                    <li :class="{ 'falla': !checklistSeleccionado.luces_traseras }"><span>Traseras:</span> {{
                      icon(checklistSeleccionado.luces_traseras) }}</li>
                    <li :class="{ 'falla': !checklistSeleccionado.direccionales_delanteras }"><span>Dir. Del:</span> {{
                      icon(checklistSeleccionado.direccionales_delanteras) }}</li>
                    <li :class="{ 'falla': !checklistSeleccionado.direccionales_traseras }"><span>Dir. Tras:</span> {{
                      icon(checklistSeleccionado.direccionales_traseras) }}</li>
                    <li :class="{ 'falla': !checklistSeleccionado.espejos_laterales }"><span>Espejos:</span> {{
                      icon(checklistSeleccionado.espejos_laterales) }}</li>
                    <li :class="{ 'falla': !checklistSeleccionado.alarma_retroceso }"><span>Alarma retro:</span> {{
                      icon(checklistSeleccionado.alarma_retroceso) }}</li>
                    <li :class="{ 'falla': !checklistSeleccionado.pito }"><span>Pito:</span> {{
                      icon(checklistSeleccionado.pito) }}</li>
                  </ul>
                </div>

                <div class="categoria-tarjeta">
                  <h4>Cabina y Frenos</h4>
                  <ul>
                    <li :class="{ 'falla': !checklistSeleccionado.freno_servicio }"><span>Freno serv:</span> {{
                      icon(checklistSeleccionado.freno_servicio) }}</li>
                    <li :class="{ 'falla': !checklistSeleccionado.freno_emergencia }"><span>Freno emer:</span> {{
                      icon(checklistSeleccionado.freno_emergencia) }}</li>
                    <li :class="{ 'falla': !checklistSeleccionado.direccion_suspension }"><span>Dir/Susp:</span> {{
                      icon(checklistSeleccionado.direccion_suspension) }}</li>
                    <li :class="{ 'falla': !checklistSeleccionado.cinturon_seguridad }"><span>Cinturón:</span> {{
                      icon(checklistSeleccionado.cinturon_seguridad) }}</li>
                    <li :class="{ 'falla': !checklistSeleccionado.vidrio_frontal }"><span>Vidrio:</span> {{
                      icon(checklistSeleccionado.vidrio_frontal) }}</li>
                    <li :class="{ 'falla': !checklistSeleccionado.limpia_brisas }"><span>Limpia brisas:</span> {{
                      icon(checklistSeleccionado.limpia_brisas) }}</li>
                    <li :class="{ 'falla': !checklistSeleccionado.silleteria }"><span>Silletería:</span> {{
                      icon(checklistSeleccionado.silleteria) }}</li>
                    <li :class="{ 'falla': !checklistSeleccionado.indicadores_tablero }"><span>Tablero:</span> {{
                      icon(checklistSeleccionado.indicadores_tablero) }}</li>
                    <li :class="{ 'falla': !checklistSeleccionado.baterias_cables }"><span>Baterías:</span> {{
                      icon(checklistSeleccionado.baterias_cables) }}</li>
                    <li :class="{ 'falla': !checklistSeleccionado.presion_aire }"><span>Pres. Aire:</span> {{
                      icon(checklistSeleccionado.presion_aire) }}</li>
                  </ul>
                </div>

                <div class="categoria-tarjeta">
                  <h4>Mecánica y Volco</h4>
                  <ul>
                    <li :class="{ 'falla': !checklistSeleccionado.llantas_estado }"><span>Llantas:</span> {{
                      icon(checklistSeleccionado.llantas_estado) }}</li>
                    <li :class="{ 'falla': !checklistSeleccionado.fugas_hidraulicas }"><span>Fugas Hidr:</span> {{
                      icon(checklistSeleccionado.fugas_hidraulicas) }}</li>
                    <li :class="{ 'falla': !checklistSeleccionado.pasadores_suspension }"><span>Pasadores:</span> {{
                      icon(checklistSeleccionado.pasadores_suspension) }}</li>
                    <li :class="{ 'falla': !checklistSeleccionado.fugas_aire }"><span>Fugas Aire:</span> {{
                      icon(checklistSeleccionado.fugas_aire) }}</li>
                    <li :class="{ 'falla': !checklistSeleccionado.grapas_chasis }"><span>Grapas chasis:</span> {{
                      icon(checklistSeleccionado.grapas_chasis) }}</li>
                    <li :class="{ 'falla': !checklistSeleccionado.cadena_cardan }"><span>Cardán:</span> {{
                      icon(checklistSeleccionado.cadena_cardan) }}</li>
                    <li :class="{ 'falla': !checklistSeleccionado.acoples_rapidos }"><span>Acoples:</span> {{
                      icon(checklistSeleccionado.acoples_rapidos) }}</li>
                    <li :class="{ 'falla': !checklistSeleccionado.mangueras }"><span>Mangueras:</span> {{
                      icon(checklistSeleccionado.mangueras) }}</li>
                    <li :class="{ 'falla': !checklistSeleccionado.estado_volco }"><span>Volco:</span> {{
                      icon(checklistSeleccionado.estado_volco) }}</li>
                    <li :class="{ 'falla': !checklistSeleccionado.soporte_volco }"><span>Soporte volco:</span> {{
                      icon(checklistSeleccionado.soporte_volco) }}</li>
                    <li :class="{ 'falla': !checklistSeleccionado.tanque_combustible }"><span>Tanque comb:</span> {{
                      icon(checklistSeleccionado.tanque_combustible) }}</li>
                    <li :class="{ 'falla': !checklistSeleccionado.motor }"><span>Motor:</span> {{
                      icon(checklistSeleccionado.motor) }}</li>
                    <li :class="{ 'falla': !checklistSeleccionado.sistema_cargado }"><span>Sist. Cargado:</span> {{
                      icon(checklistSeleccionado.sistema_cargado) }}</li>
                    <li :class="{ 'falla': !checklistSeleccionado.ganchos_compuerta }"><span>Ganchos:</span> {{
                      icon(checklistSeleccionado.ganchos_compuerta) }}</li>
                    <li :class="{ 'falla': !checklistSeleccionado.soportes_buge }"><span>Sop. Buje:</span> {{
                      icon(checklistSeleccionado.soportes_buge) }}</li>
                  </ul>
                </div>

                <div class="categoria-tarjeta">
                  <h4>Kit y Documentos</h4>
                  <ul>
                    <li :class="{ 'falla': !checklistSeleccionado.documentos }"><span>Documentos:</span> {{
                      icon(checklistSeleccionado.documentos) }}</li>
                    <li :class="{ 'falla': !checklistSeleccionado.gato }"><span>Gato:</span> {{
                      icon(checklistSeleccionado.gato) }}</li>
                    <li :class="{ 'falla': !checklistSeleccionado.cruceta }"><span>Cruceta:</span> {{
                      icon(checklistSeleccionado.cruceta) }}</li>
                    <li :class="{ 'falla': !checklistSeleccionado.taco }"><span>Taco:</span> {{
                      icon(checklistSeleccionado.taco) }}</li>
                    <li :class="{ 'falla': !checklistSeleccionado.caja_herramientas }"><span>Herramientas:</span> {{
                      icon(checklistSeleccionado.caja_herramientas) }}</li>
                    <li :class="{ 'falla': !checklistSeleccionado.llanta_repuesto }"><span>Repuesto:</span> {{
                      icon(checklistSeleccionado.llanta_repuesto) }}</li>
                    <li :class="{ 'falla': !checklistSeleccionado.linterna }"><span>Linterna:</span> {{
                      icon(checklistSeleccionado.linterna) }}</li>
                    <li :class="{ 'falla': !checklistSeleccionado.senales_carretera }"><span>Señales:</span> {{
                      icon(checklistSeleccionado.senales_carretera) }}</li>
                    <li :class="{ 'falla': !checklistSeleccionado.botiquin }"><span>Botiquín:</span> {{
                      icon(checklistSeleccionado.botiquin) }}</li>
                    <li :class="{ 'falla': !checklistSeleccionado.extintor }"><span>Extintor:</span> {{
                      icon(checklistSeleccionado.extintor) }}</li>
                  </ul>
                </div>
              </div>
            </div>

            <div class="modal-actions"
              style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #cbd5e1; display: flex; justify-content: space-between;">
              <button @click="descargarPDF" class="btn-primary">
                Descargar Reporte PDF
              </button>

              <button @click="cerrarModal" class="btn-secondary">Cerrar</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div style="display: none;">
    <div id="matriz-pdf" style="padding: 20px; font-family: Arial, sans-serif; font-size: 10px; color: black;">

      <div style="text-align: center; margin-bottom: 10px;">
        <h2 style="margin: 0;">INSPECCIÓN PREOPERACIONAL VEHÍCULOS (VOLQUETAS)</h2>
        <h3 style="margin: 5px 0;">VERA S.A.S</h3>
      </div>

      <table border="1" style="width: 100%; border-collapse: collapse; margin-bottom: 10px; text-align: left;">
        <tbody>
          <tr>
            <td style="padding: 5px; width: 50%;"><strong>PLACA DEL VEHÍCULO:</strong> {{ placaPDF }}</td>
            <td style="padding: 5px; width: 50%;"><strong>FECHA (Semana):</strong> {{
              formatearFecha(filtros.fechaInicio)
            }} al {{ formatearFecha(filtros.fechaFin) }}</td>
          </tr>
          <tr>
            <td style="padding: 5px;"><strong>SOAT Vence:</strong> {{ fechaSoatPDF }}</td>
            <td style="padding: 5px;"><strong>TECNOMECÁNICA Vence:</strong> {{ fechaTecnoPDF }}</td>
          </tr>
        </tbody>
      </table>

      <table border="1" style="width: 100%; border-collapse: collapse; text-align: center; font-size: 9px;">
        <thead style="background-color: #e2e8f0;">
          <tr>
            <th style="padding: 5px; width: 10%;">ITEM</th>
            <th style="padding: 5px; width: 34%;">CONCEPTO</th>
            <th style="width: 8%;">LUNES</th>
            <th style="width: 8%;">MARTES</th>
            <th style="width: 8%;">MIÉRCOLES</th>
            <th style="width: 8%;">JUEVES</th>
            <th style="width: 8%;">VIERNES</th>
            <th style="width: 8%;">SÁBADO</th>
            <th style="width: 8%;">DOMINGO</th>
          </tr>
        </thead>
        <tbody>
          <template v-for="cat in categoriasRevision" :key="cat.titulo">
            <tr v-for="(item, index) in cat.items" :key="item.key">
              <td v-if="index === 0" :rowspan="cat.items.length" style="font-weight: bold; vertical-align: middle;">
                {{ cat.titulo }}
              </td>
              <td style="text-align: center; padding: 3px;">
                {{ item.label }}
              </td>
              <td v-for="dia in 7" :key="dia">
                {{ obtenerValorMatriz(item.key, dia) }}
              </td>
            </tr>
          </template>
        </tbody>
      </table>

      <div style="margin-top: 15px;">
        <strong>Observaciones de la Semana:</strong>
        <div style="min-height: 40px; border: 1px solid #ccc; padding: 5px; margin-top: 5px;">
          <p v-for="chk in checklistsFiltrados" :key="'obs' + chk.id" style="font-size: 9px; margin: 2px 0;">
            <span v-if="chk.observaciones"><strong>{{ formatearFecha(chk.fecha_formateada) }}:</strong> {{
              chk.observaciones }}</span>
          </p>
        </div>
      </div>

      <div style="margin-top: 40px; display: flex; justify-content: space-between;">
        <div style="width: 45%; border-top: 1px solid black; padding-top: 5px;">
          <strong>Realizado Por (Nombre):</strong><br>
          {{ conductorFrecuentePDF }}
        </div>
        <div style="width: 45%; border-top: 1px solid black; padding-top: 5px;">
          <strong>Firma del Conductor Con Cédula:</strong>
        </div>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import html2pdf from 'html2pdf.js';

const listaChecklists = ref([]);
const modalVisible = ref(false);
const checklistSeleccionado = ref(null);

const filtros = ref({
  texto: '',
  fechaInicio: '',
  fechaFin: '',
  estado: 'todos'
});

const formatearFecha = (fecha) => {
  if (!fecha) return 'No registrada';

  // Se convierte a texto y quitamos la hora si viene formato ISO (ej. 2026-07-05T00:00:00Z)
  const fechaTexto = String(fecha).split('T')[0];
  const partes = fechaTexto.split('-');

  //DETECCIÓN DEL ERROR: Si la base de datos guardó la palabra "undefined" o está vacía
  if (partes.includes('undefined') || partes.includes('null') || partes.includes('')) {
    return 'Fecha corrupta (Actualizar vehículo)';
  }

  //Valido que tenga las 3 partes (Año, Mes, Día)
  if (partes.length !== 3) return fechaTexto;

  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const dia = partes[2];
  const mes = meses[parseInt(partes[1]) - 1];
  const anio = partes[0];

  // Si por alguna razón el mes es inválido, mostramos la fecha original para que no se rompa
  if (!mes) return fechaTexto;

  return `${dia} de ${mes} de ${anio}`;
};

// LÓGICA DE FILTRADO
const checklistsFiltrados = computed(() => {
  return listaChecklists.value.filter((chk) => {
    const termino = filtros.value.texto.toLowerCase();
    const coincideTexto = chk.conductor.toLowerCase().includes(termino) || chk.placa.toLowerCase().includes(termino);

    let coincideFecha = true;
    if (filtros.value.fechaInicio) {
      coincideFecha = coincideFecha && (chk.fecha_formateada >= filtros.value.fechaInicio);
    }
    if (filtros.value.fechaFin) {
      coincideFecha = coincideFecha && (chk.fecha_formateada <= filtros.value.fechaFin);
    }

    let coincideEstado = true;
    if (filtros.value.estado === 'apto') coincideEstado = chk.apto_para_trabajar;
    if (filtros.value.estado === 'falla') coincideEstado = !chk.apto_para_trabajar;

    return coincideTexto && coincideFecha && coincideEstado;
  });
});

//VARIABLES DEL PDF (Que dependen de los filtros)
const placaPDF = computed(() => {
  // Si hay reportes filtrados, tomamos la placa real del primer registro
  if (checklistsFiltrados.value.length > 0 && checklistsFiltrados.value[0].placa) {
    return checklistsFiltrados.value[0].placa.toUpperCase();
  }
  return 'Todas (Filtre por placa)';
});

const fechaSoatPDF = computed(() => {
  if (checklistsFiltrados.value.length > 0 && checklistsFiltrados.value[0].fecha_soat) {
    return formatearFecha(checklistsFiltrados.value[0].fecha_soat);
  }
  return 'N/A';
});

const fechaTecnoPDF = computed(() => {
  if (checklistsFiltrados.value.length > 0 && checklistsFiltrados.value[0].fecha_tecnomecanica) {
    return formatearFecha(checklistsFiltrados.value[0].fecha_tecnomecanica);
  }
  return 'N/A';
});

const conductorFrecuentePDF = computed(() => {
  if (checklistsFiltrados.value.length > 0) {
    return checklistsFiltrados.value[0].conductor;
  }
  return '';
});

// CARGA DE DATOS
onMounted(() => {
  cargarChecklists();
});

const cargarChecklists = async () => {
  try {
    const res = await fetch('http://localhost:3000/api/admin/checklists', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (res.ok) {
      listaChecklists.value = await res.json();
    }
  } catch (error) {
    console.error('Fallo la conexión con el servidor', error);
  }
};

const limpiarFiltros = () => {
  filtros.value.texto = '';
  filtros.value.fechaInicio = '';
  filtros.value.fechaFin = '';
  filtros.value.estado = 'todos';
};

//ESTRUCTURA DESGLOSADA DEL PDF SEMANAL
const categoriasRevision = [
  {
    titulo: 'LUCES',
    items: [
      { key: 'luces_frontales', label: 'Frontales de servicio (altas y bajas)' },
      { key: 'luces_traseras', label: 'Traseras de trabajo (Reflector)' },
      { key: 'direccionales_delanteras', label: 'Direccionales delanteras de parqueo' },
      { key: 'direccionales_traseras', label: 'Direccionales traseras de parqueo' },
      { key: 'espejos_laterales', label: 'Espejos laterales' },
      { key: 'alarma_retroceso', label: 'Alarma de retroceso' },
      { key: 'pito', label: 'Pito' }
    ]
  },
  {
    titulo: 'CABINA',
    items: [
      { key: 'freno_servicio', label: 'Freno de servicio' },
      { key: 'freno_emergencia', label: 'Freno de emergencia' },
      { key: 'direccion_suspension', label: 'Dirección/suspensión (terminales)' },
      { key: 'cinturon_seguridad', label: 'Cinturon de seguridad' },
      { key: 'vidrio_frontal', label: 'Vidrio frontal (en buen estado)' },
      { key: 'limpia_brisas', label: 'Limpia brisas' },
      { key: 'silleteria', label: 'Silleteria y tapiceria' },
      { key: 'indicadores_tablero', label: 'Indicadores (hidráulicos, voltímetro, etc)' },
      { key: 'baterias_cables', label: 'Baterias y cables' },
      { key: 'presion_aire', label: 'Presion de Aire' }
    ]
  },
  {
    titulo: 'LLANTAS',
    items: [
      { key: 'llantas_estado', label: 'En buen estado sin cortaduras ni abultamientos' }
    ]
  },
  {
    titulo: 'ESTADO MECÁNICO',
    items: [
      { key: 'fugas_hidraulicas', label: 'Control de fugas hidráulicas' },
      { key: 'pasadores_suspension', label: 'Pasadores, suspensión' },
      { key: 'fugas_aire', label: 'Control fuga aires' },
      { key: 'grapas_chasis', label: 'Grapas y anclajes de chasis' },
      { key: 'cadena_cardan', label: 'Cadena del cardan' },
      { key: 'acoples_rapidos', label: 'Acoples rapidos' },
      { key: 'mangueras', label: 'Mangueras' },
      { key: 'estado_volco', label: 'Estado general del volco' },
      { key: 'soporte_volco', label: 'Soporte del volco (Gato hidraulico)' },
      { key: 'tanque_combustible', label: 'Tanque de combustible (abrazaderas soporte)' },
      { key: 'motor', label: 'Motor' },
      { key: 'sistema_cargado', label: 'Sistema de cargado' },
      { key: 'ganchos_compuerta', label: 'Ganchos compuerta' },
      { key: 'soportes_buge', label: 'Soportes buge volco' }
    ]
  },
  {
    titulo: 'KIT CARRETERA',
    items: [
      { key: 'documentos', label: 'Documentos conductor y del vehiculo' },
      { key: 'gato', label: 'Gato' },
      { key: 'cruceta', label: 'Cruzeta y Taco' },
      { key: 'caja_herramientas', label: 'Caja de Herramientas' },
      { key: 'llanta_repuesto', label: 'Llanta de Repuesto' },
      { key: 'linterna', label: 'Linterna' },
      { key: 'senales_carretera', label: 'Señales de Carretera (Triángulos)' },
      { key: 'botiquin', label: 'Botiquin de Primeros Auxilios' },
      { key: 'extintor', label: 'Extintor de incendio(10 lbs) PQS' }
    ]
  }
];

const obtenerValorMatriz = (llavePropiedad, numeroDia) => {
  const reporteDelDia = checklistsFiltrados.value.find(chk => {
    let fechaObj = new Date(chk.fecha_formateada + 'T12:00:00');
    let diaSemana = fechaObj.getDay();
    let diaAdaptado = diaSemana === 0 ? 7 : diaSemana;
    return diaAdaptado === numeroDia;
  });

  if (!reporteDelDia) return '';
  return reporteDelDia[llavePropiedad] ? 'OK' : 'ERROR';
};

//FUNCIONES DE INTERFAZ Y DESCARGA
const generarPDFSemanal = () => {
  if (checklistsFiltrados.value.length === 0) {
    alert("No hay reportes para exportar. Seleccione una placa y un rango de fechas válido.");
    return;
  }

  const elemento = document.getElementById('matriz-pdf');
  const opciones = {
    margin: 10,
    filename: `Matriz_Semanal_${filtros.value.texto || 'General'}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(opciones).from(elemento).save();
};

const descargarPDF = () => {
  const elemento = document.getElementById('contenido-pdf');
  const nombreArchivo = `Reporte_${checklistSeleccionado.value.placa}_${checklistSeleccionado.value.fecha_formateada}.pdf`;

  const opciones = {
    margin: 10,
    filename: nombreArchivo,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2 },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
  };

  html2pdf().set(opciones).from(elemento).save();
};

const abrirModalDetalles = (checklist) => {
  checklistSeleccionado.value = checklist;
  modalVisible.value = true;
};

const cerrarModal = () => {
  modalVisible.value = false;
  checklistSeleccionado.value = null;
};

const icon = (valor) => valor ? 'OK' : 'ERROR';
</script>