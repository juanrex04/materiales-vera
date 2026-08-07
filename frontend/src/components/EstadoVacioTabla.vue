<template>
  <tr>
    <td :colspan="columnas" style="text-align: center; padding: 2rem; color: #64748b;">
      {{ mensaje }}
    </td>
  </tr>
</template>

<script setup>
defineProps({
  mensaje: { type: String, required: true },
  columnas: { type: Number, required: true }
});
</script>
