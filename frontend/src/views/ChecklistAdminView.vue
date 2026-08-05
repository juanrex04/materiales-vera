<template>
  <div class="dashboard-container">
    <div class="content">
      <div class="bienvenida-card">
        <p><strong>Importante: </strong>Para generar el reporte semanal en formato PDF, complete los filtros de búsqueda según la información que desee consultar. Si selecciona únicamente el rango de fechas y no especifica un vehículo, el sistema generará un reporte general con la información correspondiente a ese período.</p>
      </div>
      <ErrorBanner v-if="errorMensaje" :mensaje="errorMensaje" @cerrar="errorMensaje = ''" />
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
            <button @click="generarPDFSemanal" class="btn-primary" :disabled="generandoPDF">
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
              <button @click="descargarPDF" class="btn-primary" :disabled="generandoPDF">
                {{ generandoPDF ? 'Generando...' : 'Descargar Reporte PDF' }}
              </button>

              <button @click="cerrarModal" class="btn-secondary">Cerrar</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <div style="display: none;">
    <!-- ============ PLANTILLA: REPORTE INDIVIDUAL ============ -->
    <div id="reporte-impresion"
      style="width: 100%; font-family: Arial, Helvetica, sans-serif; font-size: 9px; color: #1e293b;">

      <table style="width: 100%; border-collapse: collapse;">
        <tbody>
          <tr>
            <td style="width: 15%; vertical-align: middle;">
              <img src="/logo.png" alt="VERA S.A.S." style="width: 55px; height: 55px;" />
            </td>
            <td style="vertical-align: middle; text-align: center;">
              <div style="font-size: 16px; font-weight: bold; color: #1e3a8a;">VERA S.A.S.</div>
              <div style="font-size: 9px; color: #475569;">Sistema de Gestión de Flota – Materiales Vera</div>
            </td>
            <td style="width: 24%; vertical-align: middle; text-align: right; font-size: 8px; color: #475569;">
              <strong>N° Doc:</strong> {{ numeroDocumento }}<br />
              <strong>Generado:</strong> {{ fechaGeneracion }}
            </td>
          </tr>
        </tbody>
      </table>
      <div style="border-bottom: 2px solid #1e3a8a; margin-bottom: 8px;"></div>

      <div style="text-align: center; margin-bottom: 8px;">
        <span style="font-size: 13px; font-weight: bold; color: #1e3a8a;">REPORTE DE INSPECCIÓN PREOPERACIONAL DE VEHÍCULO</span>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 8px;">
        <tbody>
          <tr>
            <td style="width: 50%; padding: 4px; border: 1px solid #94a3b8; background-color: #f1f5f9;">
              <strong>Conductor:</strong> {{ checklistSeleccionado ? checklistSeleccionado.conductor : '' }}
            </td>
            <td style="padding: 4px; border: 1px solid #94a3b8; background-color: #f1f5f9;">
              <strong>Vehículo:</strong> {{ checklistSeleccionado ? checklistSeleccionado.placa + ' (' + checklistSeleccionado.marca + ')' : '' }}
            </td>
          </tr>
          <tr>
            <td style="padding: 4px; border: 1px solid #94a3b8;">
              <strong>Fecha de Revisión:</strong> {{ checklistSeleccionado ? formatearFecha(checklistSeleccionado.fecha_formateada) : '' }}
            </td>
            <td style="padding: 4px; border: 1px solid #94a3b8;">
              <strong>Hora:</strong> {{ checklistSeleccionado ? checklistSeleccionado.hora : '' }}
            </td>
          </tr>
          <tr>
            <td colspan="2" style="padding: 4px; border: 1px solid #94a3b8;">
              <strong>Resultado:</strong>
              <span v-if="checklistSeleccionado"
                style="font-weight: bold; padding: 2px 8px; color: #ffffff;"
                :style="{ backgroundColor: checklistSeleccionado.apto_para_trabajar ? '#16a34a' : '#dc2626' }">
                {{ checklistSeleccionado.apto_para_trabajar ? 'VEHÍCULO APTO PARA TRABAJAR' : 'NO APTO – REQUIERE REVISIÓN' }}
              </span>
            </td>
          </tr>
        </tbody>
      </table>

      <table v-for="cat in categoriasRevision" :key="'t-' + cat.titulo"
        style="width: 100%; border-collapse: collapse; margin-top: 6px; page-break-inside: avoid; break-inside: avoid;">
        <thead>
          <tr style="background-color: #1e3a8a; color: #ffffff;">
            <th colspan="2" style="padding: 4px; text-align: left;">{{ cat.titulo }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in cat.items" :key="item.key">
            <td style="padding: 4px; border: 1px solid #cbd5e1;">{{ item.label }}</td>
            <td
              style="width: 12%; padding: 4px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; color: #ffffff;"
              :style="{ backgroundColor: (checklistSeleccionado && checklistSeleccionado[item.key]) ? '#16a34a' : '#dc2626' }">
              {{ checklistSeleccionado && checklistSeleccionado[item.key] ? 'OK' : 'ERROR' }}
            </td>
          </tr>
        </tbody>
      </table>

      <table style="width: 100%; border-collapse: collapse; margin-top: 8px;">
        <tbody>
          <tr>
            <td style="padding: 4px; border: 1px solid #94a3b8; text-align: center;">
              <strong>Total puntos:</strong> {{ reporteResumen.total }}
            </td>
            <td style="padding: 4px; border: 1px solid #94a3b8; text-align: center; background-color: #dcfce7;">
              <strong>OK:</strong> {{ reporteResumen.ok }}
            </td>
            <td style="padding: 4px; border: 1px solid #94a3b8; text-align: center; background-color: #fee2e2;">
              <strong>ERROR:</strong> {{ reporteResumen.error }}
            </td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top: 8px;">
        <strong>Novedades y Observaciones del Conductor:</strong>
        <div style="min-height: 35px; border: 1px solid #94a3b8; padding: 5px; margin-top: 3px;">
          {{ (checklistSeleccionado && checklistSeleccionado.observaciones) || 'Ninguna observación registrada.' }}
        </div>
      </div>

      <div style="margin-top: 28px; display: flex; justify-content: space-between;">
        <div style="width: 45%; border-top: 1px solid #334155; padding-top: 5px;">
          <strong>{{ checklistSeleccionado ? checklistSeleccionado.conductor : '' }}</strong><br />
          Firma del Conductor con Cédula
        </div>
        <div style="width: 45%; border-top: 1px solid #334155; padding-top: 5px;">
          <strong>Administrador / Jefe de Operaciones</strong><br />
          Firma y sello
        </div>
      </div>
    </div>

    <!-- ============ PLANTILLA: MATRIZ SEMANAL ============ -->
    <div id="matriz-pdf"
      style="width: 100%; font-family: Arial, Helvetica, sans-serif; font-size: 8px; color: #1e293b;">

      <table style="width: 100%; border-collapse: collapse;">
        <tbody>
          <tr>
            <td style="width: 15%; vertical-align: middle;">
              <img src="/logo.png" alt="VERA S.A.S." style="width: 50px; height: 50px;" />
            </td>
            <td style="vertical-align: middle; text-align: center;">
              <div style="font-size: 14px; font-weight: bold; color: #1e3a8a;">VERA S.A.S.</div>
              <div style="font-size: 8px; color: #475569;">Sistema de Gestión de Flota – Materiales Vera</div>
            </td>
            <td style="width: 24%; vertical-align: middle; text-align: right; font-size: 8px; color: #475569;">
              <strong>N° Doc:</strong> {{ numeroMatriz }}<br />
              <strong>Generado:</strong> {{ fechaGeneracion }}
            </td>
          </tr>
        </tbody>
      </table>
      <div style="border-bottom: 2px solid #1e3a8a; margin-bottom: 6px;"></div>

      <div style="text-align: center; margin-bottom: 6px;">
        <span style="font-size: 12px; font-weight: bold; color: #1e3a8a;">MATRIZ SEMANAL DE INSPECCIONES PREOPERACIONALES</span>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 6px;">
        <tbody>
          <tr>
            <td style="width: 50%; padding: 3px; border: 1px solid #94a3b8; background-color: #f1f5f9;">
              <strong>PLACA DEL VEHÍCULO:</strong> {{ placaPDF }}
            </td>
            <td style="padding: 3px; border: 1px solid #94a3b8; background-color: #f1f5f9;">
              <strong>FECHA (Semana):</strong> {{ formatearFecha(filtros.fechaInicio) }} al {{
                formatearFecha(filtros.fechaFin) }}
            </td>
          </tr>
          <tr>
            <td style="padding: 3px; border: 1px solid #94a3b8;"><strong>SOAT Vence:</strong> {{ fechaSoatPDF }}</td>
            <td style="padding: 3px; border: 1px solid #94a3b8;"><strong>TECNOMECÁNICA Vence:</strong> {{ fechaTecnoPDF }}</td>
          </tr>
        </tbody>
      </table>

      <table v-for="cat in categoriasRevision" :key="'tm-' + cat.titulo"
        style="width: 100%; border-collapse: collapse; text-align: center; margin-top: 4px; page-break-inside: avoid; break-inside: avoid;">
        <thead>
          <tr style="background-color: #1e3a8a; color: #ffffff;">
            <th colspan="8" style="padding: 3px; text-align: left;">{{ cat.titulo }}</th>
          </tr>
          <tr style="background-color: #e2e8f0; color: #1e293b;">
            <th style="padding: 3px; text-align: left;">CONCEPTO</th>
            <th style="padding: 3px;">LUN</th>
            <th style="padding: 3px;">MAR</th>
            <th style="padding: 3px;">MIÉ</th>
            <th style="padding: 3px;">JUE</th>
            <th style="padding: 3px;">VIE</th>
            <th style="padding: 3px;">SÁB</th>
            <th style="padding: 3px;">DOM</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in cat.items" :key="item.key">
            <td style="width: 35%; text-align: left; border: 1px solid #cbd5e1; padding: 2px;">{{ item.label }}</td>
            <td v-for="dia in 7" :key="dia"
              style="width: 9%; border: 1px solid #cbd5e1; padding: 2px; font-weight: bold; color: #ffffff;"
              :style="{ backgroundColor: obtenerValorMatriz(item.key, dia) === 'OK' ? '#16a34a' : (obtenerValorMatriz(item.key, dia) === 'ERROR' ? '#dc2626' : '#f8fafc') }">
              {{ obtenerValorMatriz(item.key, dia) }}
            </td>
          </tr>
        </tbody>
      </table>

      <div style="margin-top: 6px;">
        <strong>Observaciones de la Semana:</strong>
        <div style="min-height: 30px; border: 1px solid #94a3b8; padding: 4px; margin-top: 3px;">
          <p v-for="chk in checklistsFiltrados" :key="'obs' + chk.id" style="margin: 2px 0;">
            <span v-if="chk.observaciones"><strong>{{ formatearFecha(chk.fecha_formateada) }}:</strong> {{
              chk.observaciones }}</span>
          </p>
        </div>
      </div>

      <div style="margin-top: 28px; display: flex; justify-content: space-between;">
        <div style="width: 45%; border-top: 1px solid #334155; padding-top: 5px;">
          <strong>Realizado Por (Nombre):</strong><br />
          {{ conductorFrecuentePDF }}
        </div>
        <div style="width: 45%; border-top: 1px solid #334155; padding-top: 5px;">
          <strong>Firma del Conductor Con Cédula:</strong>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import html2pdf from 'html2pdf.js';
import { peticion } from '@/api';
import SkeletonTabla from '@/components/SkeletonTabla.vue';
import ErrorBanner from '@/components/ErrorBanner.vue';
import { iniciarCarga, detenerCarga } from '@/loading';
const listaChecklists = ref([]);
const cargando = ref(false);
const errorMensaje = ref('');
const generandoPDF = ref(false);
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

//DATOS ADMINISTRATIVOS DE LOS DOCUMENTOS PDF
const fechaGeneracion = computed(() => {
  const ahora = new Date();
  const dd = String(ahora.getDate()).padStart(2, '0');
  const mm = String(ahora.getMonth() + 1).padStart(2, '0');
  const yyyy = ahora.getFullYear();
  const hh = String(ahora.getHours()).padStart(2, '0');
  const min = String(ahora.getMinutes()).padStart(2, '0');
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
});

const numeroDocumento = computed(() => {
  const chk = checklistSeleccionado.value;
  if (!chk) return '---';
  return `INSP-${String(chk.placa).toUpperCase()}-${chk.fecha_formateada}`;
});

const numeroMatriz = computed(() => {
  const desde = filtros.value.fechaInicio || 'YYYY-MM-DD';
  const hasta = filtros.value.fechaFin || 'YYYY-MM-DD';
  return `MAT-${desde}-${hasta}`;
});

const reporteResumen = computed(() => {
  const chk = checklistSeleccionado.value;
  if (!chk) return { total: 0, ok: 0, error: 0 };
  let total = 0;
  let ok = 0;
  categoriasRevision.forEach(cat => {
    cat.items.forEach(item => {
      total++;
      if (chk[item.key]) ok++;
    });
  });
  return { total, ok, error: total - ok };
});

// CARGA DE DATOS
onMounted(() => {
  cargarChecklists();
});

const cargarChecklists = async () => {
  cargando.value = true;
  errorMensaje.value = '';
  try {
    listaChecklists.value = await peticion('/api/admin/checklists');
  } catch (error) {
    errorMensaje.value = error.message;
  } finally {
    cargando.value = false;
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
    titulo: 'LUCES Y SEGURIDAD',
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
    titulo: 'CABINA Y FRENOS',
    items: [
      { key: 'freno_servicio', label: 'Freno de servicio' },
      { key: 'freno_emergencia', label: 'Freno de emergencia' },
      { key: 'direccion_suspension', label: 'Dirección/suspensión (terminales)' },
      { key: 'cinturon_seguridad', label: 'Cinturón de seguridad' },
      { key: 'vidrio_frontal', label: 'Vidrio frontal (en buen estado)' },
      { key: 'limpia_brisas', label: 'Limpia brisas' },
      { key: 'silleteria', label: 'Silletería y tapicería' },
      { key: 'indicadores_tablero', label: 'Indicadores (hidráulicos, voltímetro, etc)' },
      { key: 'baterias_cables', label: 'Baterías y cables' },
      { key: 'presion_aire', label: 'Presión de Aire' }
    ]
  },
  {
    titulo: 'MECÁNICA Y VOLCO',
    items: [
      { key: 'llantas_estado', label: 'Llantas en buen estado (sin cortaduras ni abultamientos)' },
      { key: 'fugas_hidraulicas', label: 'Control de fugas hidráulicas' },
      { key: 'pasadores_suspension', label: 'Pasadores, suspensión' },
      { key: 'fugas_aire', label: 'Control fuga de aire' },
      { key: 'grapas_chasis', label: 'Grapas y anclajes de chasis' },
      { key: 'cadena_cardan', label: 'Cadena del cardán' },
      { key: 'acoples_rapidos', label: 'Acoples rápidos' },
      { key: 'mangueras', label: 'Mangueras' },
      { key: 'estado_volco', label: 'Estado general del volco' },
      { key: 'soporte_volco', label: 'Soporte del volco (Gato hidráulico)' },
      { key: 'tanque_combustible', label: 'Tanque de combustible (abrazaderas soporte)' },
      { key: 'motor', label: 'Motor' },
      { key: 'sistema_cargado', label: 'Sistema de cargado' },
      { key: 'ganchos_compuerta', label: 'Ganchos compuerta' },
      { key: 'soportes_buge', label: 'Soportes buje volco' }
    ]
  },
  {
    titulo: 'DOCUMENTOS Y KIT CARRETERA',
    items: [
      { key: 'documentos', label: 'Documentos conductor y del vehículo' },
      { key: 'gato', label: 'Gato' },
      { key: 'cruceta', label: 'Cruceta' },
      { key: 'taco', label: 'Taco' },
      { key: 'caja_herramientas', label: 'Caja de Herramientas' },
      { key: 'llanta_repuesto', label: 'Llanta de Repuesto' },
      { key: 'linterna', label: 'Linterna' },
      { key: 'senales_carretera', label: 'Señales de Carretera (Triángulos)' },
      { key: 'botiquin', label: 'Botiquín de Primeros Auxilios' },
      { key: 'extintor', label: 'Extintor de incendio (10 lbs) PQS' }
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
const precargarLogo = () => new Promise((resolve) => {
  const img = new Image();
  img.onload = () => resolve(true);
  img.onerror = () => resolve(false);
  img.src = '/logo.png';
});

const agregarPiePagina = (pdf) => {
  const totalPaginas = pdf.internal.getNumberOfPages();
  const ancho = pdf.internal.pageSize.getWidth();
  const alto = pdf.internal.pageSize.getHeight();
  for (let i = 1; i <= totalPaginas; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setTextColor(120);
    pdf.text(`Generado por Materiales Vera – VERA S.A.S.  |  ${fechaGeneracion.value}`, 15, alto - 7);
    pdf.text(`Página ${i} de ${totalPaginas}`, ancho - 15, alto - 7, { align: 'right' });
  }
};

const generarPDFSemanal = async () => {
  if (checklistsFiltrados.value.length === 0) {
    alert("No hay reportes para exportar. Seleccione una placa y un rango de fechas válido.");
    return;
  }

  generandoPDF.value = true;
  iniciarCarga('Generando PDF semanal...');
  try {
    const elemento = document.getElementById('matriz-pdf');
    const opciones = {
      margin: 10,
      filename: `Matriz_Semanal_${filtros.value.texto || 'General'}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
      pagebreak: { mode: ['css', 'legacy'] }
    };

    await precargarLogo();
    await html2pdf().set(opciones).from(elemento).toPdf().get('pdf').then(agregarPiePagina).save();
  } catch (error) {
    console.error('Error generando PDF', error);
  } finally {
    detenerCarga();
    generandoPDF.value = false;
  }
};

const descargarPDF = async () => {
  generandoPDF.value = true;
  iniciarCarga('Generando reporte PDF...');
  try {
    const elemento = document.getElementById('reporte-impresion');
    const nombreArchivo = `Reporte_${checklistSeleccionado.value.placa}_${checklistSeleccionado.value.fecha_formateada}.pdf`;

    const opciones = {
      margin: 10,
      filename: nombreArchivo,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' },
      pagebreak: { mode: ['css', 'legacy'] }
    };

    await precargarLogo();
    await html2pdf().set(opciones).from(elemento).toPdf().get('pdf').then(agregarPiePagina).save();
  } catch (error) {
    console.error('Error generando PDF', error);
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

const icon = (valor) => valor ? 'OK' : 'ERROR';
</script>