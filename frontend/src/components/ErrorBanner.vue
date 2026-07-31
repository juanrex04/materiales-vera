<template>
  <div v-if="mensaje" class="banner-error">
    <span>{{ mensaje }}</span>
    <button type="button" class="banner-error-cerrar" aria-label="Cerrar" @click="$emit('cerrar')">×</button>
  </div>
</template>

<script setup>
defineProps({ mensaje: { type: String, default: '' } });
defineEmits(['cerrar']);
</script>
