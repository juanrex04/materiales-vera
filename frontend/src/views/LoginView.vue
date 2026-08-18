<template>
  <div class="login-container">
    <div class="login-layout">
      <div class="login-brand">
        <img class="login-logo" src="/logo.png" alt="VERA S.A.S." />
      </div>
      <div class="login-box">
      <h2>Materiales Vera</h2>
      <p>Ingresa tus credenciales</p>

      <form @submit.prevent="hacerLogin">
        <div class="form-group">
          <label for="documento">Número de Documento</label>
          <input type="text" id="documento" inputmode="numeric" pattern="[0-9]*" maxlength="20" v-model="documento" required placeholder="Ingresa tu documento (cédula)" autocomplete="username" />
        </div>

        <div class="form-group">
          <label for="password">Contraseña</label>
          <div class="password-input-wrap">
            <input :type="mostrarPassword ? 'text' : 'password'" id="password" v-model="password" required placeholder="******" autocomplete="current-password" />
            <TogglePassword v-model:visible="mostrarPassword" />
          </div>
        </div>

        <p v-if="mensajeError" class="error">{{ mensajeError }}</p>

        <button type="submit" :disabled="cargando">
          {{ cargando ? 'Conectando...' : 'Iniciar Sesión' }}
        </button>
      </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { API_URL } from '@/config';
import { iniciarCarga, detenerCarga } from '@/loading';
import TogglePassword from '@/components/TogglePassword.vue';

// Variables reactivas
const documento = ref('');
const password = ref('');
const mostrarPassword = ref(false);
const mensajeError = ref('');
const cargando = ref(false);

const router = useRouter();

const hacerLogin = async () => {
  cargando.value = true;
  mensajeError.value = '';
  iniciarCarga('Iniciando sesión...');

  try {
    const respuesta = await fetch(`${API_URL}/api/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ documento: documento.value, password: password.value })
    });

    const data = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(data.error || 'Error al iniciar sesión');
    }

    localStorage.setItem('token', data.token);

    if (data.debe_cambiar_password) {
      router.push('/cambiar-password');
    } else if (data.rol == 'Admin') {
      router.push('/dashboard');
    } else if (data.rol == 'Conductor') {
      router.push('/conductores');
    }

  } catch (error) {
    mensajeError.value = error.message;
    detenerCarga();
  } finally {
    cargando.value = false;
  }
};
</script>