<template>
  <div class="dashboard-container">
    <main class="content">
      <section style="display: flex; flex-direction: column; gap: 2rem;">
        <WhatsAppConfig />
        <NotificacionesConfig />
      </section>
    </main>
  </div>
</template>

<script setup>
import WhatsAppConfig from '@/components/WhatsAppConfig.vue';
import NotificacionesConfig from '@/components/NotificacionesConfig.vue';
</script>
