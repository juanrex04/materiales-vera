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
import { decodificarToken } from '@/auth';
import Navbar from '../src/components/NavBar.vue';
import OverlayCarga from '../src/components/OverlayCarga.vue';

const route = useRoute();

const mostrarNavbar = computed(() => {
  if (route.path === '/') return false;
  if (route.path === '/cambiar-password') {
    const usuario = decodificarToken();
    return usuario?.debe_cambiar_password === false;
  }
  return true;
});
</script>