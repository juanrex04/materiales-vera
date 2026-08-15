<template>
  <div v-if="total > 0" class="paginador">
    <span class="paginador-info">
      Mostrando {{ desde }}–{{ hasta }} de {{ total }} registros
    </span>

    <div class="paginador-controles">
      <select
        :value="porPagina"
        class="paginador-select"
        :disabled="cargando"
        @change="cambiarPorPagina($event.target.value)"
      >
        <option :value="10">10</option>
        <option :value="25">25</option>
        <option :value="50">50</option>
      </select>

      <div class="paginador-botones">
        <button
          class="paginador-btn"
          :disabled="cargando || pagina === 1"
          @click="cambiarPagina(1)"
          title="Primera página"
        >«</button>
        <button
          class="paginador-btn"
          :disabled="cargando || pagina === 1"
          @click="cambiarPagina(pagina - 1)"
          title="Página anterior"
        >‹</button>

        <template v-for="p in paginasVisibles" :key="p">
          <span v-if="p === '...'" class="paginador-ellipsis">…</span>
          <button
            v-else
            class="paginador-btn"
            :class="{ 'paginador-activo': p === pagina }"
            :disabled="cargando"
            @click="cambiarPagina(p)"
          >{{ p }}</button>
        </template>

        <button
          class="paginador-btn"
          :disabled="cargando || pagina === totalPaginas"
          @click="cambiarPagina(pagina + 1)"
          title="Página siguiente"
        >›</button>
        <button
          class="paginador-btn"
          :disabled="cargando || pagina === totalPaginas"
          @click="cambiarPagina(totalPaginas)"
          title="Última página"
        >»</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  total: { type: Number, required: true },
  pagina: { type: Number, required: true },
  porPagina: { type: Number, default: 10 },
  cargando: { type: Boolean, default: false }
});

const emit = defineEmits(['update:pagina', 'update:porPagina']);

const totalPaginas = computed(() => Math.max(1, Math.ceil(props.total / props.porPagina)));

const desde = computed(() => {
  if (props.total === 0) return 0;
  return (props.pagina - 1) * props.porPagina + 1;
});

const hasta = computed(() => Math.min(props.total, props.pagina * props.porPagina));

const paginasVisibles = computed(() => {
  const total = totalPaginas.value;
  const actual = props.pagina;
  const rango = 2;
  const lista = [];
  const agregar = (p, extremo = false) => {
    const ultima = lista[lista.length - 1];
    if (ultima === '...' || p !== ultima) {
      if (!extremo && lista.length > 0 && p - (typeof ultima === 'number' ? ultima : (lista[lista.length - 2] || 0)) > 1) {
        lista.push('...');
      }
      lista.push(p);
    }
  };

  for (let p = 1; p <= total; p++) {
    if (p === 1 || p === total || Math.abs(p - actual) <= rango) {
      agregar(p);
    } else if (lista[lista.length - 1] !== '...') {
      lista.push('...');
    }
  }
  return lista;
});

const cambiarPagina = (p) => {
  if (p < 1 || p > totalPaginas.value) return;
  emit('update:pagina', p);
};

const cambiarPorPagina = (valor) => {
  emit('update:porPagina', Number(valor));
  emit('update:pagina', 1);
};
</script>
