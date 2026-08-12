<template>
  <div class="login-container">
    <div class="login-box">
      <h2>Cambiar Contraseña</h2>
      <p>Es tu primer inicio de sesión. Debes cambiar tu contraseña para continuar.</p>

      <form @submit.prevent="cambiarContraseña">
        <div class="form-group">
          <label>Contraseña Actual</label>
          <div class="password-input-wrap">
            <input :type="mostrarActual ? 'text' : 'password'" v-model="passwordActual" required placeholder="Ingresa tu contraseña actual (12345)" />
            <TogglePassword v-model:visible="mostrarActual" />
          </div>
        </div>

        <div class="form-group">
          <label>Nueva Contraseña</label>
          <div class="password-input-wrap">
            <input :type="mostrarNueva ? 'text' : 'password'" v-model="passwordNueva" required placeholder="Mínimo 6 caracteres" />
            <TogglePassword v-model:visible="mostrarNueva" />
          </div>
        </div>

        <div class="form-group">
          <label>Confirmar Nueva Contraseña</label>
          <div class="password-input-wrap">
            <input :type="mostrarConfirmar ? 'text' : 'password'" v-model="passwordConfirmar" required placeholder="Repite la nueva contraseña" />
            <TogglePassword v-model:visible="mostrarConfirmar" />
          </div>
        </div>

        <p v-if="mensajeError" class="error">{{ mensajeError }}</p>
        <p v-if="mensajeExito" class="exito">{{ mensajeExito }}</p>

        <button type="submit" :disabled="cargando">
          {{ cargando ? 'Guardando...' : 'Cambiar Contraseña' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { decodificarToken } from '@/auth';
import { peticion } from '@/api';
import { iniciarCarga, detenerCarga } from '@/loading';
import TogglePassword from '@/components/TogglePassword.vue';

const router = useRouter();
const passwordActual = ref('');
const passwordNueva = ref('');
const passwordConfirmar = ref('');
const mostrarActual = ref(false);
const mostrarNueva = ref(false);
const mostrarConfirmar = ref(false);
const mensajeError = ref('');
const mensajeExito = ref('');
const cargando = ref(false);
const usuario = decodificarToken()

const cambiarContraseña = async () => {
  mensajeError.value = '';
  mensajeExito.value = '';

  if (passwordNueva.value !== passwordConfirmar.value) {
    mensajeError.value = 'Las contraseñas nuevas no coinciden';
    return;
  }

  if (passwordNueva.value.length < 6) {
    mensajeError.value = 'La nueva contraseña debe tener mínimo 6 caracteres';
    return;
  }

  cargando.value = true;
  iniciarCarga('Actualizando contraseña...');
  try {
    await peticion('/api/cambiar-password', {
      metodo: 'PUT',
      cuerpo: {
        password_actual: passwordActual.value,
        password_nuevo: passwordNueva.value
      }
    });

    localStorage.setItem('debe_cambiar_password', 'false');
    mensajeExito.value = 'Contraseña actualizada. Redirigiendo...';
    detenerCarga();

    setTimeout(() => {
      const rol = usuario?.rol
      if (rol === 'Admin') router.push('/dashboard');
      else router.push('/conductores');
    }, 1500);
  } catch (error) {
    mensajeError.value = error.message;
    detenerCarga();
  } finally {
    cargando.value = false;
  }
};
</script>