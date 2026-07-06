<template>
  <div class="gestion-seccion">
    <div class="titulo-acciones">
      <h2>📋 Control de Inspecciones (Volquetas)</h2>
      <button @click="cargarChecklists" class="btn-secondary">🔄 Actualizar Lista</button>
    </div>

    <div class="filtros-container">
      <div class="form-group filtro-item">
        <label>Buscar (Conductor o Placa):</label>
        <input 
          type="text" 
          v-model="filtros.texto" 
          placeholder="Ej: Juan, ABC-123..." 
          class="input-busqueda"
        />
      </div>

      <div class="form-group filtro-item">
        <label>Filtrar por Fecha:</label>
        <input 
          type="date" 
          v-model="filtros.fecha" 
          class="input-busqueda"
        />
      </div>

      <div class="form-group filtro-item">
        <label>Estado del Vehículo:</label>
        <select v-model="filtros.estado" class="input-busqueda">
          <option value="todos">Todos los estados</option>
          <option value="apto">Aptos para Operar</option>
          <option value="falla">Fallas Reportadas</option>
        </select>
      </div>

      <div class="filtro-item btn-limpiar-container">
        <button @click="limpiarFiltros" class="btn-delete" style="padding: 0.5rem 1rem;">
          Limpiar Filtros
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
              <strong>{{ chk.fecha_formateada }}</strong><br>
              <small class="text-muted">{{ chk.hora }}</small>
            </td>
            <td>{{ chk.conductor }}</td>
            <td>{{ chk.placa }} ({{ chk.marca }})</td>
            <td>
              <span :class="chk.apto_para_trabajar ? 'badge-estado disponible' : 'badge-estado mantenimiento'">
                {{ chk.apto_para_trabajar ? 'Apto para Operar' : 'Fallas Reportadas' }}
              </span>
            </td>
            <td>
              <button @click="abrirModalDetalles(chk)" class="btn-primary">Ver Reporte</button>
            </td>
          </tr>
          
          <tr v-if="checklistsFiltrados.length === 0">
            <td colspan="5" style="text-align: center; padding: 2rem; color: #64748b;">
              No se encontraron inspecciones con los filtros actuales.
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
        
        <div class="modal-body scroll-area">
          <div class="info-resumen">
            <p><strong>👨‍✈️ Conductor:</strong> {{ checklistSeleccionado.conductor }}</p>
            <p><strong>🚛 Vehículo:</strong> {{ checklistSeleccionado.placa }} ({{ checklistSeleccionado.marca }})</p>
            <p><strong>📅 Fecha de Revisión:</strong> {{ checklistSeleccionado.fecha_formateada }} a las {{ checklistSeleccionado.hora }}</p>
            <p><strong>📌 Resultado:</strong> 
              <span :style="{ color: checklistSeleccionado.apto_para_trabajar ? '#16a34a' : '#dc2626', fontWeight: 'bold' }">
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
                <li :class="{ 'falla': !checklistSeleccionado.luces_frontales }"><span>Frontales (Altas/Bajas):</span> {{ icon(checklistSeleccionado.luces_frontales) }}</li>
                <li :class="{ 'falla': !checklistSeleccionado.luces_traseras }"><span>Traseras de trabajo:</span> {{ icon(checklistSeleccionado.luces_traseras) }}</li>
                <li :class="{ 'falla': !checklistSeleccionado.direccionales_delanteras }"><span>Dir. Delanteras:</span> {{ icon(checklistSeleccionado.direccionales_delanteras) }}</li>
                <li :class="{ 'falla': !checklistSeleccionado.direccionales_traseras }"><span>Dir. Traseras:</span> {{ icon(checklistSeleccionado.direccionales_traseras) }}</li>
                <li :class="{ 'falla': !checklistSeleccionado.espejos_laterales }"><span>Espejos laterales:</span> {{ icon(checklistSeleccionado.espejos_laterales) }}</li>
                <li :class="{ 'falla': !checklistSeleccionado.alarma_retroceso }"><span>Alarma retroceso:</span> {{ icon(checklistSeleccionado.alarma_retroceso) }}</li>
                <li :class="{ 'falla': !checklistSeleccionado.pito }"><span>Pito:</span> {{ icon(checklistSeleccionado.pito) }}</li>
              </ul>
            </div>

            <div class="categoria-tarjeta">
              <h4>Cabina y Frenos</h4>
              <ul>
                <li :class="{ 'falla': !checklistSeleccionado.freno_servicio }"><span>Freno de servicio:</span> {{ icon(checklistSeleccionado.freno_servicio) }}</li>
                <li :class="{ 'falla': !checklistSeleccionado.freno_emergencia }"><span>Freno de emergencia:</span> {{ icon(checklistSeleccionado.freno_emergencia) }}</li>
                <li :class="{ 'falla': !checklistSeleccionado.direccion_suspension }"><span>Dirección/Suspensión:</span> {{ icon(checklistSeleccionado.direccion_suspension) }}</li>
                <li :class="{ 'falla': !checklistSeleccionado.cinturon_seguridad }"><span>Cinturón seguridad:</span> {{ icon(checklistSeleccionado.cinturon_seguridad) }}</li>
                <li :class="{ 'falla': !checklistSeleccionado.vidrio_frontal }"><span>Vidrio frontal:</span> {{ icon(checklistSeleccionado.vidrio_frontal) }}</li>
                <li :class="{ 'falla': !checklistSeleccionado.limpia_brisas }"><span>Limpia brisas:</span> {{ icon(checklistSeleccionado.limpia_brisas) }}</li>
                <li :class="{ 'falla': !checklistSeleccionado.silleteria }"><span>Silletería:</span> {{ icon(checklistSeleccionado.silleteria) }}</li>
                <li :class="{ 'falla': !checklistSeleccionado.indicadores_tablero }"><span>Indicadores tablero:</span> {{ icon(checklistSeleccionado.indicadores_tablero) }}</li>
                <li :class="{ 'falla': !checklistSeleccionado.baterias_cables }"><span>Baterías y cables:</span> {{ icon(checklistSeleccionado.baterias_cables) }}</li>
                <li :class="{ 'falla': !checklistSeleccionado.presion_aire }"><span>Presión de aire:</span> {{ icon(checklistSeleccionado.presion_aire) }}</li>
              </ul>
            </div>

            <div class="categoria-tarjeta">
              <h4>Mecánica y Volco</h4>
              <ul>
                <li :class="{ 'falla': !checklistSeleccionado.llantas_estado }"><span>Llantas:</span> {{ icon(checklistSeleccionado.llantas_estado) }}</li>
                <li :class="{ 'falla': !checklistSeleccionado.fugas_hidraulicas }"><span>Sin fugas hidráulicas:</span> {{ icon(checklistSeleccionado.fugas_hidraulicas) }}</li>
                <li :class="{ 'falla': !checklistSeleccionado.pasadores_suspension }"><span>Pasadores suspensión:</span> {{ icon(checklistSeleccionado.pasadores_suspension) }}</li>
                <li :class="{ 'falla': !checklistSeleccionado.fugas_aire }"><span>Sin fugas de aire:</span> {{ icon(checklistSeleccionado.fugas_aire) }}</li>
                <li :class="{ 'falla': !checklistSeleccionado.grapas_chasis }"><span>Grapas chasis:</span> {{ icon(checklistSeleccionado.grapas_chasis) }}</li>
                <li :class="{ 'falla': !checklistSeleccionado.cadena_cardan }"><span>Cadena cardán:</span> {{ icon(checklistSeleccionado.cadena_cardan) }}</li>
                <li :class="{ 'falla': !checklistSeleccionado.acoples_rapidos }"><span>Acoples rápidos:</span> {{ icon(checklistSeleccionado.acoples_rapidos) }}</li>
                <li :class="{ 'falla': !checklistSeleccionado.mangueras }"><span>Mangueras:</span> {{ icon(checklistSeleccionado.mangueras) }}</li>
                <li :class="{ 'falla': !checklistSeleccionado.estado_volco }"><span>Estado general volco:</span> {{ icon(checklistSeleccionado.estado_volco) }}</li>
                <li :class="{ 'falla': !checklistSeleccionado.soporte_volco }"><span>Soporte volco (Gato):</span> {{ icon(checklistSeleccionado.soporte_volco) }}</li>
                <li :class="{ 'falla': !checklistSeleccionado.tanque_combustible }"><span>Tanque combustible:</span> {{ icon(checklistSeleccionado.tanque_combustible) }}</li>
                <li :class="{ 'falla': !checklistSeleccionado.motor }"><span>Motor:</span> {{ icon(checklistSeleccionado.motor) }}</li>
                <li :class="{ 'falla': !checklistSeleccionado.sistema_cargado }"><span>Sistema cargado:</span> {{ icon(checklistSeleccionado.sistema_cargado) }}</li>
                <li :class="{ 'falla': !checklistSeleccionado.ganchos_compuerta }"><span>Ganchos compuerta:</span> {{ icon(checklistSeleccionado.ganchos_compuerta) }}</li>
                <li :class="{ 'falla': !checklistSeleccionado.soportes_buge }"><span>Soportes buje:</span> {{ icon(checklistSeleccionado.soportes_buge) }}</li>
              </ul>
            </div>

            <div class="categoria-tarjeta">
              <h4>Kit y Documentos</h4>
              <ul>
                <li :class="{ 'falla': !checklistSeleccionado.documentos }"><span>Documentos al día:</span> {{ icon(checklistSeleccionado.documentos) }}</li>
                <li :class="{ 'falla': !checklistSeleccionado.gato }"><span>Gato:</span> {{ icon(checklistSeleccionado.gato) }}</li>
                <li :class="{ 'falla': !checklistSeleccionado.cruceta }"><span>Cruceta:</span> {{ icon(checklistSeleccionado.cruceta) }}</li>
                <li :class="{ 'falla': !checklistSeleccionado.taco }"><span>Taco:</span> {{ icon(checklistSeleccionado.taco) }}</li>
                <li :class="{ 'falla': !checklistSeleccionado.caja_herramientas }"><span>Caja herramientas:</span> {{ icon(checklistSeleccionado.caja_herramientas) }}</li>
                <li :class="{ 'falla': !checklistSeleccionado.llanta_repuesto }"><span>Llanta repuesto:</span> {{ icon(checklistSeleccionado.llanta_repuesto) }}</li>
                <li :class="{ 'falla': !checklistSeleccionado.linterna }"><span>Linterna:</span> {{ icon(checklistSeleccionado.linterna) }}</li>
                <li :class="{ 'falla': !checklistSeleccionado.senales_carretera }"><span>Señales / Triángulos:</span> {{ icon(checklistSeleccionado.senales_carretera) }}</li>
                <li :class="{ 'falla': !checklistSeleccionado.botiquin }"><span>Botiquín:</span> {{ icon(checklistSeleccionado.botiquin) }}</li>
                <li :class="{ 'falla': !checklistSeleccionado.extintor }"><span>Extintor:</span> {{ icon(checklistSeleccionado.extintor) }}</li>
              </ul>
            </div>

          </div>
        </div>

        <div class="modal-actions" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid #cbd5e1;">
          <button @click="cerrarModal" class="btn-secondary">Cerrar Reporte</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'; // ¡Importante importar 'computed'!

const listaChecklists = ref([]);
const modalVisible = ref(false);
const checklistSeleccionado = ref(null);

// Variables reactivas para los filtros
const filtros = ref({
  texto: '',
  fecha: '',
  estado: 'todos'
});

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
    } else {
      console.error('Error cargando checklists');
    }
  } catch (error) {
    console.error('Fallo la conexión con el servidor', error);
  }
};

// ========================================================
// LÓGICA DE FILTRADO EN TIEMPO REAL
// ========================================================
const checklistsFiltrados = computed(() => {
  return listaChecklists.value.filter((chk) => {
    
    // 1. Filtro por Texto (Conductor o Placa)
    const termino = filtros.value.texto.toLowerCase();
    const coincideTexto = 
      chk.conductor.toLowerCase().includes(termino) || 
      chk.placa.toLowerCase().includes(termino);
      
    // 2. Filtro por Fecha Exacta
    // Si no hay fecha seleccionada, asumimos que coincide (true)
    const coincideFecha = filtros.value.fecha === '' ? true : chk.fecha_formateada === filtros.value.fecha;
    
    // 3. Filtro por Estado
    let coincideEstado = true;
    if (filtros.value.estado === 'apto') {
      coincideEstado = chk.apto_para_trabajar === 1 || chk.apto_para_trabajar === true;
    } else if (filtros.value.estado === 'falla') {
      coincideEstado = chk.apto_para_trabajar === 0 || chk.apto_para_trabajar === false;
    }

    // Retorna true solo si el registro cumple con TODOS los filtros aplicados
    return coincideTexto && coincideFecha && coincideEstado;
  });
});

const limpiarFiltros = () => {
  filtros.value.texto = '';
  filtros.value.fecha = '';
  filtros.value.estado = 'todos';
};
// ========================================================

const abrirModalDetalles = (checklist) => {
  checklistSeleccionado.value = checklist;
  modalVisible.value = true;
};

const cerrarModal = () => {
  modalVisible.value = false;
  checklistSeleccionado.value = null;
};

const icon = (valor) => valor ? '✅' : '❌';
</script>