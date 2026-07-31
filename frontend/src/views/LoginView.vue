<template>
  <div class="login-container">
    <div class="login-box">
      <h2>Materiales Vera</h2>
      <p>Ingresa tus credenciales</p>

      <form @submit.prevent="hacerLogin">
        <div class="form-group">
          <label for="email">Correo Electrónico</label>
          <input type="email" id="email" v-model="email" required placeholder="Ingresa el correo empresarial" />
        </div>

        <div class="form-group">
          <label for="password">Contraseña</label>
          <input type="password" id="password" v-model="password" required placeholder="******" />
        </div>

        <p v-if="mensajeError" class="error">{{ mensajeError }}</p>

        <button type="submit" :disabled="cargando">
          {{ cargando ? 'Conectando...' : 'Iniciar Sesión' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { API_URL } from '@/config';
import { iniciarCarga, detenerCarga } from '@/loading';

// Variables reactivas
const email = ref('');
const password = ref('');
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
      body: JSON.stringify({ email: email.value, password: password.value })
    });

    const data = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(data.error || 'Error al iniciar sesión');
    }

    localStorage.setItem('token', data.token);
    localStorage.setItem('debe_cambiar_password', data.debe_cambiar_password);

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