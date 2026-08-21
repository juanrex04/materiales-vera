<template>
  <div class="dashboard-container">
    <main class="content">
      <section style="display: flex; flex-direction: column; gap: 2rem;">
        <ErrorBanner v-if="errorMensaje" :mensaje="errorMensaje" @cerrar="errorMensaje = ''" />
        <WhatsAppConfig @error="errorMensaje = $event" />
        <NotificacionesConfig @error="errorMensaje = $event" />
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import ErrorBanner from '@/components/ErrorBanner.vue';
import WhatsAppConfig from '@/components/WhatsAppConfig.vue';
import NotificacionesConfig from '@/components/NotificacionesConfig.vue';

const errorMensaje = ref('');
</script>
