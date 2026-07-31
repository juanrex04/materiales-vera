<template>
  <tr v-for="f in filas" :key="f">
    <td v-for="c in columnas" :key="c">
      <div class="skeleton"></div>
    </td>
  </tr>
</template>

<script setup>
defineProps({
  columnas: { type: Number, default: 5 },
  filas: { type: Number, default: 5 }
});
</script>
