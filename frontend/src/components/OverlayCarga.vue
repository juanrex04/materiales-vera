<template>
  <div v-if="cargandoGlobal" class="overlay-carga">
    <div class="spinner"></div>
    <p v-if="mensajeCarga" class="overlay-mensaje">{{ mensajeCarga }}</p>
  </div>
</template>

<script setup>
import { cargandoGlobal, mensajeCarga } from '@/loading';
</script>
