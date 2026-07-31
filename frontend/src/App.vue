<template>
  <div id="app">
    <Navbar v-if="mostrarNavbar" />

    <router-view></router-view>

    <OverlayCarga />
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import Navbar from '../src/components/NavBar.vue'; // Asegúrate de que la ruta coincida
import OverlayCarga from '../src/components/OverlayCarga.vue';

const route = useRoute();

// Computada que devuelve true si la ruta actual es diferente al login (ej: '/')
const mostrarNavbar = computed(() => {
  return route.path !== '/';
});
</script>

<style>
/* Si tienes estilos globales, se quedan aquí */
</style>