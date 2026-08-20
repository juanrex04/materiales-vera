<template>
  <div class="dashboard-container">
    <div class="content">
      <div class="bienvenida-card">
        <p><strong>Importante: </strong>Para generar el reporte semanal en formato PDF, seleccione la <strong>placa del
            vehículo</strong> y complete el <strong>rango de fechas</strong> que desee consultar. Sin estos tres campos
          el sistema no generará el PDF.</p>
      </div>
      <ErrorBanner v-if="errorMensaje" :mensaje="errorMensaje" @cerrar="errorMensaje = ''" />
      <div class="gestion-seccion">
        <div class="titulo-acciones">
          <h2>Control de Inspecciones (Volquetas)</h2>
          <button @click="cargarChecklists" class="btn-primary"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg> Actualizar Lista</button>
        </div>

        <div class="filtros-container">
          <div class="form-group filtro-item">
            <label>Buscar inspección por conductor:</label>
            <input type="text" v-model="filtros.texto" placeholder="Ej: Juan, Carlos..." class="input-busqueda" />
          </div>
          
          <div class="form-group filtro-item">
            <label>Placa:</label>
            <select v-model="filtros.placa" class="input-busqueda">
              <option value="">Seleccione la placa...</option>
              <option v-for="v in listaVehiculos" :key="v.id" :value="v.placa">{{ v.placa }} ({{ v.marca }})</option>
            </select>
          </div>

          <div class="fecha-input-wrapper filtro-item">
            <label>Fecha Desde:</label>
            <input type="date" v-model="filtros.fechaInicio" class="fecha-input" />
          </div>

          <div class="fecha-input-wrapper filtro-item">
            <label>Fecha Hasta:</label>
            <input type="date" v-model="filtros.fechaFin" class="fecha-input" />
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
              <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/></svg>
              Limpiar filtros
            </button>
            <button @click="generarPDFSemanal" class="btn-primary" :disabled="generandoPDF"
              title="Generar reporte semanal por volqueta">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              {{ generandoPDF ? 'Generando...' : 'Descargar PDF Semanal' }}
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
              <SkeletonTabla v-if="cargando" :columnas="5" :filas="5" />
              <tr v-for="chk in listaChecklists" :key="chk.id">
                <td data-label="Fecha y Hora">
                  <strong>{{ formatearFecha(chk.fecha_formateada) }}</strong><br>
                  <small class="text-muted">{{ chk.hora }}</small>
                </td>
                <td data-label="Conductor">{{ chk.conductor }}</td>
                <td data-label="Vehículo">
                  <span class="placa-badge" style="margin-right: 6px;">{{ chk.placa }}</span>
                </td>
                <td data-label="Estado">
                  <span :class="chk.apto_para_trabajar ? 'badge-estado disponible' : 'badge-estado mantenimiento'">
                    <span class="dot-indicador"></span>
                    {{ chk.apto_para_trabajar ? 'Apto' : 'Con Fallas' }}
                  </span>
                </td>
                <td data-label="Acciones">
                  <div class="acciones-tabla">
                    <button @click="abrirModalDetalles(chk)" class="btn-action btn-primary"
                      title="Ver reporte individual">
                      <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                        <polyline points="14 2 14 8 20 8"></polyline>
                        <line x1="16" y1="13" x2="8" y2="13"></line>
                        <line x1="16" y1="17" x2="8" y2="17"></line>
                        <polyline points="10 9 9 9 8 9"></polyline>
                      </svg>
                      <span>Ver Reporte</span>
                    </button>
                  </div>
                </td>
              </tr>
              <EstadoVacioTabla v-if="!cargando && listaChecklists.length === 0" :columnas="5"
                :mensaje="errorMensaje ? 'No se pudieron cargar las inspecciones.' : 'No se encontraron inspecciones en ese rango de fechas.'" />
            </tbody>
          </table>

          <PaginadorTabla v-model:pagina="pagina" v-model:porPagina="porPagina" :total="totalChecklists"
            :cargando="cargando" />
        </div>

        <BaseModal v-model="modalVisible" title="Reporte de Inspección Preoperacional" size="large"
          :close-on-overlay="true">
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

          <div class="modal-actions">
            <button @click="descargarPDF" class="btn-primary btn-modalCheck" :disabled="generandoPDF"
              title="Descargar reporte individual de la volqueta">
              <svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <line x1="16" y1="13" x2="8" y2="13"></line>
                <line x1="16" y1="17" x2="8" y2="17"></line>
                <polyline points="10 9 9 9 8 9"></polyline>
              </svg>
              {{ generandoPDF ? 'Generando...' : 'Descargar Reporte PDF' }}
            </button>
          </div>
        </BaseModal>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue';
import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';
import { precargarLogo, generarReporteIndividual, generarMatrizSemanal } from '@/utils/pdfTemplates';
import { peticion } from '@/api';
import { mostrarAlerta, mostrarToast } from '@/utils/alertas';
import PaginadorTabla from '@/components/PaginadorTabla.vue';
import EstadoVacioTabla from '@/components/EstadoVacioTabla.vue';
import { debounce } from '@/utils/debounce';
import SkeletonTabla from '@/components/SkeletonTabla.vue';
import ErrorBanner from '@/components/ErrorBanner.vue';
import { iniciarCarga, detenerCarga } from '@/loading';
import BaseModal from '@/components/BaseModal.vue';

pdfMake.vfs = pdfFonts;

const MESES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
];

const listaChecklists = ref([]);
const listaVehiculos = ref([]);
const cargando = ref(false);
const errorMensaje = ref('');
const generandoPDF = ref(false);
const modalVisible = ref(false);
const checklistSeleccionado = ref(null);

// ESTADO DE PAGINACIÓN SERVER-SIDE
const pagina = ref(1);
const porPagina = ref(10);
const totalChecklists = ref(0);
const checklistsExportados = ref([]);

const filtros = ref({
  texto: '',
  placa: '',
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

  const dia = partes[2];
  const mes = MESES[parseInt(partes[1]) - 1];
  const anio = partes[0];

  // Si por alguna razón el mes es inválido, mostramos la fecha original para que no se rompa
  if (!mes) return fechaTexto;

  return `${dia} de ${mes} de ${anio}`;
};

// LÓGICA DE FILTRADO (SERVER-SIDE: los filtros viajan al backend en cargarChecklists)
const construirQueryChecklists = () => {
  const params = new URLSearchParams();
  params.set('pagina', String(pagina.value));
  params.set('porPagina', String(porPagina.value));
  if (filtros.value.texto) params.set('texto', filtros.value.texto);
  if (filtros.value.placa) params.set('placa', filtros.value.placa);
  if (filtros.value.fechaInicio) params.set('fechaInicio', filtros.value.fechaInicio);
  if (filtros.value.fechaFin) params.set('fechaFin', filtros.value.fechaFin);
  if (filtros.value.estado && filtros.value.estado !== 'todos') params.set('estado', filtros.value.estado);
  return params.toString();
};

//VARIABLES DEL PDF (Que dependen de los filtros)
const placaPDF = computed(() => {
  // Si hay una placa seleccionada en los filtros, la usamos directamente
  if (filtros.value.placa) {
    return filtros.value.placa.toUpperCase();
  }
  return 'Todas (Filtre por placa)';
});

const vehiculoSeleccionado = computed(() => {
  if (!filtros.value.placa) return null;
  return listaVehiculos.value.find((v) => v.placa === filtros.value.placa) || null;
});

// CARGA DE DATOS
onMounted(() => {
  precargarLogo();
  cargarChecklists();
  cargarVehiculos();
});

// Debounce compartido: colapsa disparos de filtros/paginación en una sola recarga
const recargarLista = debounce(() => {
  cargarChecklists();
}, 250);

// Al cambiar un filtro volvemos a la página 1 y recargamos
watch(
  () => filtros.value,
  () => {
    pagina.value = 1;
    recargarLista();
  },
  { deep: true }
);

// Al cambiar de página o de tamaño de página, recargamos
watch([pagina, porPagina], () => {
  recargarLista();
});

const cargarVehiculos = async () => {
  try {
    listaVehiculos.value = await peticion('/api/admin/vehiculos');
  } catch (error) {
    console.error('Error cargando vehículos', error);
  }
};

const cargarChecklists = async () => {
  cargando.value = true;
  errorMensaje.value = '';
  try {
    const respuesta = await peticion(`/api/admin/checklists?${construirQueryChecklists()}`);
    const normalizada = Array.isArray(respuesta) ? respuesta : (respuesta?.datos || []);
    listaChecklists.value = normalizada;
    totalChecklists.value = Array.isArray(respuesta) ? normalizada.length : (respuesta?.total || 0);

    // Si la página queda vacía tras eliminar/buscar, retrocedemos una página
    const totalPaginas = Math.max(1, Math.ceil(totalChecklists.value / porPagina.value));
    if (pagina.value > totalPaginas) {
      pagina.value = totalPaginas;
      cargarChecklists();
    }
  } catch (error) {
    errorMensaje.value = error.message;
  } finally {
    cargando.value = false;
  }
};

const limpiarFiltros = () => {
  filtros.value.texto = '';
  filtros.value.placa = '';
  filtros.value.fechaInicio = '';
  filtros.value.fechaFin = '';
  filtros.value.estado = 'todos';
  pagina.value = 1;
};

//VALIDA QUE EL PDF SEMANAL TENGA PLACA (REGISTRADA) Y RANGO DE FECHAS COMPLETO
const validarPDFSemanal = () => {
  const faltantes = [];
  if (!filtros.value.placa) faltantes.push('Placa');
  if (!filtros.value.fechaInicio) faltantes.push('Fecha Desde');
  if (!filtros.value.fechaFin) faltantes.push('Fecha Hasta');

  if (faltantes.length > 0) {
    return `Faltan los campos ${faltantes.join(', ')}.`;
  }

  const placaRegistrada = listaVehiculos.value.some(
    (v) => v.placa.toLowerCase() === filtros.value.placa.toLowerCase()
  );
  if (!placaRegistrada) {
    return `La placa ${filtros.value.placa.toUpperCase()} no está registrada en el sistema.`;
  }

  if (filtros.value.fechaInicio > filtros.value.fechaFin) {
    return 'La Fecha Desde no puede ser posterior a la Fecha Hasta.';
  }

  return '';
};

const generarPDFSemanal = async () => {
  const errorValidacion = validarPDFSemanal();
  if (errorValidacion) {
    await mostrarAlerta('warning', 'No se puede generar el PDF semanal', errorValidacion);
    return;
  }

  generandoPDF.value = true;
  iniciarCarga('Generando PDF semanal...');
  try {
    const filtrosExport = new URLSearchParams();
    if (filtros.value.placa) filtrosExport.set('placa', filtros.value.placa);
    if (filtros.value.fechaInicio) filtrosExport.set('fechaInicio', filtros.value.fechaInicio);
    if (filtros.value.fechaFin) filtrosExport.set('fechaFin', filtros.value.fechaFin);
    if (filtros.value.estado && filtros.value.estado !== 'todos') filtrosExport.set('estado', filtros.value.estado);

    checklistsExportados.value = await peticion(`/api/admin/checklists/exportar?${filtrosExport.toString()}`);

    if (checklistsExportados.value.length === 0) {
      await mostrarAlerta('info', 'Sin reportes para exportar', 'No hay reportes para exportar. Verifique la placa y el rango de fechas seleccionado.');
      return;
    }

    const doc = generarMatrizSemanal(checklistsExportados.value, filtros.value, vehiculoSeleccionado.value);
    if (!doc) return;
    pdfMake.createPdf(doc).download(`Matriz_Semanal_${filtros.value.placa.toUpperCase()}.pdf`);
    await mostrarToast('success', 'PDF semanal generado correctamente');
  } catch (error) {
    console.error('Error generando PDF', error);
    await mostrarAlerta('error', 'Error generando el PDF', 'Ocurrió un problema al generar el PDF. Inténtelo de nuevo.');
  } finally {
    detenerCarga();
    generandoPDF.value = false;
  }
};

const descargarPDF = async () => {
  generandoPDF.value = true;
  iniciarCarga('Generando reporte PDF...');
  try {
    const doc = generarReporteIndividual(checklistSeleccionado.value);
    if (!doc) return;
    const nombreArchivo = `Reporte_${checklistSeleccionado.value.placa}_${checklistSeleccionado.value.fecha_formateada}.pdf`;
    pdfMake.createPdf(doc).download(nombreArchivo);
    await mostrarToast('success', 'Reporte generado correctamente');
  } catch (error) {
    console.error('Error generando PDF', error);
    await mostrarAlerta('error', 'Error generando el reporte', 'Ocurrió un problema al generar el reporte. Inténtelo de nuevo.');
  } finally {
    detenerCarga();
    generandoPDF.value = false;
  }
};

const abrirModalDetalles = (checklist) => {
  checklistSeleccionado.value = checklist;
  modalVisible.value = true;
};

const cerrarModal = () => {
  modalVisible.value = false;
  checklistSeleccionado.value = null;
};

watch(modalVisible, (nuevo) => { if (!nuevo) checklistSeleccionado.value = null; });

const icon = (valor) => valor ? 'OK' : 'ERROR';
</script>