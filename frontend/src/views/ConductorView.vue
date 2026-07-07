<template>
  <div class="dashboard-container">
    <main class="content">
      <div class="bienvenida-card">
        <h3>📋 Inspección Preoperacional - Volquetas</h3>
        <p>Conductor: {{ nombreUsuario }}. Diligencie el estado de todos los componentes antes de iniciar ruta.</p>
      </div>

      <div class="gestion-seccion checklist-container">
        <div v-if="mensajeExito" class="alerta-vacia" style="margin-bottom: 1.5rem;">
          ✅ {{ mensajeExito }}
        </div>

        <form v-if="!checklistEnviado" @submit.prevent="enviarChecklist">

          <div class="form-group vehiculo-selector">
            <label for="vehiculoSelect">Vehículo Asignado:</label>
            <select v-model="formulario.vehiculo_id" id="vehiculoSelect" required @change="seleccionarVehiculo">
              <option value="" disabled>-- Seleccione su volqueta --</option>
              <option v-for="v in listaVehiculos" :key="v.id" :value="v.id">
                Placa: {{ v.placa }} - {{ v.marca }} ({{ v.estado }})
              </option>
            </select>
          </div>

          <div v-if="vehiculoActual" class="alert-documentos"
            style="background: #e0f2fe; padding: 1rem; border-radius: 6px; margin-bottom: 1rem; border-left: 5px solid #0284c7;">
            <h4 style="margin: 0 0 10px 0; color: #0369a1;">📅 Estado de Documentos</h4>
            <div style="display: flex; gap: 2rem;">
              <p style="margin: 0;">
                <strong>SOAT vence:</strong>
                {{ formatearFecha(vehiculoActual.fecha_soat) }}
              </p>
              <p style="margin: 0;">
                <strong>Tecnomecánica vence:</strong>
                {{ formatearFecha(vehiculoActual.fecha_tecnomecanica) }}
              </p>
            </div>
            <p style="margin: 5px 0 0 0; font-size: 0.85rem; color: #dc2626; font-weight: bold;">
              * Si la fecha está próxima a vencer o ya venció, notifique inmediatamente a administración.
            </p>
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

const nombreUsuario = ref(localStorage.getItem('nombre'));
const listaVehiculos = ref([]);
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
  try {
    const res = await fetch('http://localhost:3000/api/conductor/vehiculos-disponibles', {
      headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (res.ok) listaVehiculos.value = await res.json();
  } catch (error) {
    console.error('Fallo la conexión', error);
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
  try {
    const res = await fetch('http://localhost:3000/api/conductor/checklist', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
      body: JSON.stringify(formulario.value)
    });
    const data = await res.json();
    if (res.ok) {
      mensajeExito.value = "Inspección registrada. Su firma electrónica ha sido aplicada al documento.";
      checklistEnviado.value = true;
    } else {
      alert(data.error || 'Error al guardar.');
    }
  } catch (error) {
    alert('Error de red.');
  } finally {
    guardando.value = false;
  }
};
</script>