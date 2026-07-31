<template>
  <div class="dashboard-container">
    <main class="content">
      <div class="bienvenida-card">
        <h3>Inspección Preoperacional</h3>
        <p>Buen día, {{ nombreUsuario }}. Diligencie el estado de todos los componentes del vehiculo antes de iniciar ruta.</p>
      </div>

      <ErrorBanner v-if="errorMensaje" :mensaje="errorMensaje" @cerrar="errorMensaje = ''" />

      <div class="gestion-seccion checklist-container">
        <div v-if="mensajeExito" class="alerta-vacia" style="margin-bottom: 1.5rem;">
          {{ mensajeExito }}
        </div>

        <form v-if="!checklistEnviado" @submit.prevent="enviarChecklist">

          <div class="form-group vehiculo-selector">
            <label for="vehiculoSelect">Vehículo Asignado:</label>
            <div v-if="cargando" class="skeleton-bar" style="height: 40px; margin-top: 0.5rem;"></div>
            <select v-else v-model="formulario.vehiculo_id" id="vehiculoSelect" required @change="seleccionarVehiculo">
              <option value="" disabled>-- Seleccione su volqueta --</option>
              <option v-for="v in listaVehiculos" :key="v.id" :value="v.id">
                Placa: {{ v.placa }} - {{ v.marca }} ({{ v.estado }})
              </option>
            </select>
          </div>

          <div v-if="vehiculoActual" class="alert-documentos">
            <h4>Estado de Documentos</h4>
            <p><strong>Importante:</strong> Informe a la administración si alguno de los documentos del vehículo está próximo a vencer o ya se encuentra vencido. Asimismo, recuerde verificar periódicamente el estado y la fecha correspondiente al próximo cambio de aceite del vehículo.</p>
            <div class="docs-grid">
              
              <!-- SOAT -->
              <div :class="['doc-item', 'doc-' + (vehiculoActual.soat_estado?.toLowerCase() || 'ok')]">
                <strong>SOAT</strong>
                <span>{{ formatearFecha(vehiculoActual.fecha_soat) }}</span>
                <span v-if="vehiculoActual.soat_estado === 'VENCIDO'" class="doc-estado">VENCIDO hace {{
                  Math.abs(vehiculoActual.soat_dias_restantes) }} días</span>
                <span v-else-if="vehiculoActual.soat_estado === 'PROXIMO'" class="doc-estado">Faltan {{
                  vehiculoActual.soat_dias_restantes }} días</span>
                <span v-else class="doc-estado doc-ok">Al día ({{ vehiculoActual.soat_dias_restantes }} días)</span>
              </div>

              <!-- TECNOMECÁNICA -->
              <div :class="['doc-item', 'doc-' + (vehiculoActual.tecno_estado?.toLowerCase() || 'ok')]">
                <strong>Tecnomecánica</strong>
                <span>{{ formatearFecha(vehiculoActual.fecha_tecnomecanica) }}</span>
                <span v-if="vehiculoActual.tecno_estado === 'VENCIDO'" class="doc-estado">VENCIDA hace {{
                  Math.abs(vehiculoActual.tecno_dias_restantes) }} días</span>
                <span v-else-if="vehiculoActual.tecno_estado === 'PROXIMO'" class="doc-estado">Faltan {{
                  vehiculoActual.tecno_dias_restantes }} días</span>
                <span v-else class="doc-estado doc-ok">Al día ({{ vehiculoActual.tecno_dias_restantes }} días)</span>
              </div>

              <!-- ACEITE -->
              <div v-if="vehiculoActual.fecha_ultimo_cambio_aceite"
                :class="['doc-item', 'doc-' + (vehiculoActual.aceite_estado?.toLowerCase() || 'ok')]">
                <strong>Cambio Aceite</strong>
                <span>{{ formatearFecha(vehiculoActual.fecha_ultimo_cambio_aceite) }}</span>
                <span v-if="vehiculoActual.aceite_estado === 'VENCIDO'" class="doc-estado">VENCIDO hace {{
                  Math.abs(vehiculoActual.aceite_dias_restantes) }} días</span>
                <span v-else-if="vehiculoActual.aceite_estado === 'PROXIMO'" class="doc-estado">Faltan {{
                  vehiculoActual.aceite_dias_restantes }} días</span>
                <span v-else class="doc-estado doc-ok">Al día ({{ vehiculoActual.aceite_dias_restantes }} días)</span>
              </div>
              <div v-else class="doc-item doc-proximo">
                <strong>Cambio Aceite</strong>
                <span class="doc-estado">Sin registro de cambio</span>
              </div>
            </div>
          </div>
          <div v-if="vehiculoSeleccionado" class="checklist-box">
            <p class="instruccion">Marque la casilla únicamente si el elemento se encuentra en <strong>BUEN
                ESTADO</strong>.</p>

            <h4 class="categoria-titulo">LUCES Y SEGURIDAD</h4>
            <div class="grid-checkboxes">
              <label class="check-item"><input type="checkbox" v-model="formulario.luces_frontales"> Frontales
                (Altas/Bajas)</label>
              <label class="check-item"><input type="checkbox" v-model="formulario.luces_traseras"> Traseras de
                trabajo</label>
              <label class="check-item"><input type="checkbox" v-model="formulario.direccionales_delanteras">
                Direccionales delanteras</label>
              <label class="check-item"><input type="checkbox" v-model="formulario.direccionales_traseras">
                Direccionales traseras</label>
              <label class="check-item"><input type="checkbox" v-model="formulario.espejos_laterales"> Espejos
                laterales</label>
              <label class="check-item"><input type="checkbox" v-model="formulario.alarma_retroceso"> Alarma de
                retroceso</label>
              <label class="check-item"><input type="checkbox" v-model="formulario.pito"> Pito</label>
            </div>

            <h4 class="categoria-titulo">CABINA Y FRENOS</h4>
            <div class="grid-checkboxes">
              <label class="check-item"><input type="checkbox" v-model="formulario.freno_servicio"> Freno de
                servicio</label>
              <label class="check-item"><input type="checkbox" v-model="formulario.freno_emergencia"> Freno de
                emergencia</label>
              <label class="check-item"><input type="checkbox" v-model="formulario.direccion_suspension">
                Dirección/Suspensión</label>
              <label class="check-item"><input type="checkbox" v-model="formulario.cinturon_seguridad"> Cinturón de
                seguridad</label>
              <label class="check-item"><input type="checkbox" v-model="formulario.vidrio_frontal"> Vidrio
                frontal</label>
              <label class="check-item"><input type="checkbox" v-model="formulario.limpia_brisas"> Limpia brisas</label>
              <label class="check-item"><input type="checkbox" v-model="formulario.silleteria"> Silletería y
                tapicería</label>
              <label class="check-item"><input type="checkbox" v-model="formulario.indicadores_tablero"> Indicadores
                (Tablero)</label>
              <label class="check-item"><input type="checkbox" v-model="formulario.baterias_cables"> Baterías y
                cables</label>
              <label class="check-item"><input type="checkbox" v-model="formulario.presion_aire"> Presión de
                aire</label>
            </div>

            <h4 class="categoria-titulo">MECÁNICA Y VOLCO</h4>
            <div class="grid-checkboxes">
              <label class="check-item"><input type="checkbox" v-model="formulario.llantas_estado"> Llantas en buen
                estado</label>
              <label class="check-item"><input type="checkbox" v-model="formulario.fugas_hidraulicas"> Sin fugas
                hidráulicas</label>
              <label class="check-item"><input type="checkbox" v-model="formulario.pasadores_suspension"> Pasadores de
                suspensión</label>
              <label class="check-item"><input type="checkbox" v-model="formulario.fugas_aire"> Sin fugas de
                aire</label>
              <label class="check-item"><input type="checkbox" v-model="formulario.grapas_chasis"> Grapas/Anclajes
                chasis</label>
              <label class="check-item"><input type="checkbox" v-model="formulario.cadena_cardan"> Cadena del
                cardán</label>
              <label class="check-item"><input type="checkbox" v-model="formulario.acoples_rapidos"> Acoples
                rápidos</label>
              <label class="check-item"><input type="checkbox" v-model="formulario.mangueras"> Mangueras</label>
              <label class="check-item"><input type="checkbox" v-model="formulario.estado_volco"> Estado general del
                volco</label>
              <label class="check-item"><input type="checkbox" v-model="formulario.soporte_volco"> Soporte del volco
                (Gato)</label>
              <label class="check-item"><input type="checkbox" v-model="formulario.tanque_combustible"> Tanque de
                combustible</label>
              <label class="check-item"><input type="checkbox" v-model="formulario.motor"> Motor</label>
              <label class="check-item"><input type="checkbox" v-model="formulario.sistema_cargado"> Sistema de
                cargado</label>
              <label class="check-item"><input type="checkbox" v-model="formulario.ganchos_compuerta"> Ganchos
                compuerta</label>
              <label class="check-item"><input type="checkbox" v-model="formulario.soportes_buge"> Soportes buje
                volco</label>
            </div>

            <h4 class="categoria-titulo">DOCUMENTOS Y KIT CARRETERA</h4>
            <div class="grid-checkboxes">
              <label class="check-item"><input type="checkbox" v-model="formulario.documentos"> Documentos al
                día</label>
              <label class="check-item"><input type="checkbox" v-model="formulario.gato"> Gato</label>
              <label class="check-item"><input type="checkbox" v-model="formulario.cruceta"> Cruceta</label>
              <label class="check-item"><input type="checkbox" v-model="formulario.taco"> Taco</label>
              <label class="check-item"><input type="checkbox" v-model="formulario.caja_herramientas"> Caja de
                herramientas</label>
              <label class="check-item"><input type="checkbox" v-model="formulario.llanta_repuesto"> Llanta de
                repuesto</label>
              <label class="check-item"><input type="checkbox" v-model="formulario.linterna"> Linterna</label>
              <label class="check-item"><input type="checkbox" v-model="formulario.senales_carretera"> Señales
                (Triángulos)</label>
              <label class="check-item"><input type="checkbox" v-model="formulario.botiquin"> Botiquín Primeros
                Auxilios</label>
              <label class="check-item"><input type="checkbox" v-model="formulario.extintor"> Extintor (10 lbs
                PQS)</label>
            </div>

            <div class="form-group" style="margin-top: 2rem;">
              <label for="observaciones">Novedades u Observaciones (Fallas encontradas):</label>
              <textarea v-model="formulario.observaciones" id="observaciones" rows="3"
                placeholder="Si dejó alguna casilla sin marcar, explique el motivo aquí..."></textarea>
            </div>

            <div class="modal-actions" style="margin-top: 1.5rem;">
              <button type="submit" class="btn-primary" :disabled="guardando">
                {{ guardando ? 'Guardando Reporte...' : 'Firmar y Enviar Checklist' }}
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { decodificarToken } from '@/auth';
import { peticion } from '@/api';
import ErrorBanner from '@/components/ErrorBanner.vue';

const usuario = decodificarToken()
const nombreUsuario = ref(usuario?.nombre || '');
const listaVehiculos = ref([]);
const cargando = ref(false);
const errorMensaje = ref('');
const vehiculoSeleccionado = ref(false);
const guardando = ref(false);
const mensajeExito = ref('');
const checklistEnviado = ref(false);

// NUEVO: Variable para guardar toda la información del vehículo actual (incluyendo SOAT/Tecno)
const vehiculoActual = ref(null);

const formulario = ref({
  vehiculo_id: '', luces_frontales: false, luces_traseras: false, direccionales_delanteras: false, direccionales_traseras: false,
  espejos_laterales: false, alarma_retroceso: false, pito: false, freno_servicio: false, freno_emergencia: false,
  direccion_suspension: false, cinturon_seguridad: false, vidrio_frontal: false, limpia_brisas: false, silleteria: false,
  indicadores_tablero: false, baterias_cables: false, presion_aire: false, llantas_estado: false, fugas_hidraulicas: false,
  pasadores_suspension: false, fugas_aire: false, grapas_chasis: false, cadena_cardan: false, acoples_rapidos: false, mangueras:
    false, estado_volco: false, soporte_volco: false, tanque_combustible: false, motor: false, sistema_cargado: false,
  ganchos_compuerta: false, soportes_buge: false, documentos: false, gato: false, cruceta: false, taco: false, caja_herramientas:
    false, llanta_repuesto: false, linterna: false, senales_carretera: false, botiquin: false, extintor: false, observaciones: ''
});
// NUEVO: Función para poner la fecha bonita (Ej: 15 de Agosto de 2026)
const formatearFecha = (fecha) => {
  if (!fecha) return 'No registrada';

  // Asumimos que la fecha llega como YYYY-MM-DD
  const partes = fecha.split('-');
  if (partes.length !== 3) return fecha;

  const meses = [
    'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
    'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
  ];

  const dia = partes[2];
  const mes = meses[parseInt(partes[1]) - 1]; // -1 porque los arrays empiezan en 0
  const anio = partes[0];

  return `${dia} de ${mes} de ${anio}`;
};

onMounted(() => {
  cargarVehiculosDisponibles();
});

const cargarVehiculosDisponibles = async () => {
  cargando.value = true;
  errorMensaje.value = '';
  try {
    const data = await peticion('/api/conductor/vehiculos-disponibles');
    if (data.yaRealizadoHoy) {
      checklistEnviado.value = true;
      mensajeExito.value = data.vehiculo
        ? `Ya realizaste tu inspección de hoy en la volqueta ${data.vehiculo.placa}. Vuelve mañana para la próxima inspección.`
        : 'Ya realizaste tu inspección de hoy. Vuelve mañana para la próxima inspección.';
      return;
    }
    listaVehiculos.value = data.vehiculos;
  } catch (error) {
    errorMensaje.value = error.message;
  } finally {
    cargando.value = false;
  }
};

//Función que se dispara cuando el conductor elige un carro en el <select>
const seleccionarVehiculo = () => {
  // Buscamos en la lista el vehículo que coincida con el ID seleccionado
  const carroEncontrado = listaVehiculos.value.find(v => v.id === formulario.value.vehiculo_id);

  if (carroEncontrado) {
    vehiculoActual.value = carroEncontrado; // Guardamos sus datos (fechas) para mostrar la alerta
    vehiculoSeleccionado.value = true;      // Cambiamos tu variable a true para habilitar el checklist
  } else {
    vehiculoActual.value = null;
    vehiculoSeleccionado.value = false;
  }
};

const enviarChecklist = async () => {
  guardando.value = true;
  errorMensaje.value = '';
  try {
    const data = await peticion('/api/conductor/checklist', {
      metodo: 'POST',
      cuerpo: formulario.value
    });
    if (data) {
      mensajeExito.value = data.mensaje || "Inspección registrada. Su firma electrónica ha sido aplicada al documento.";
      checklistEnviado.value = true;
    }
  } catch (error) {
    if (error.message.includes('Ya realizaste tu inspección de hoy')) {
      checklistEnviado.value = true;
      mensajeExito.value = error.message;
    } else {
      errorMensaje.value = error.message;
    }
  } finally {
    guardando.value = false;
  }
};
</script>