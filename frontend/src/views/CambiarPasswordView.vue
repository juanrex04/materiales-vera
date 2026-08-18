<template>
  <div class="login-container password-form">
    <div class="login-layout">
      <div class="login-box">
      <h2>Cambiar Contraseña</h2>
      <p v-if="esPrimerIngreso">Es tu primer inicio de sesión. Debes cambiar tu contraseña para continuar.</p>
      <p v-else>Puedes cambiar tu contraseña en cualquier momento.</p>

      <form @submit.prevent="cambiarContraseña">
        <input type="text" autocomplete="username" hidden />
        <div class="form-group">
          <label>Nueva Contraseña</label>
          <div class="password-input-wrap">
            <input :type="mostrarNueva ? 'text' : 'password'" v-model="passwordNueva" required placeholder="Mínimo 8 caracteres con un número" autocomplete="new-password" />
            <TogglePassword v-model:visible="mostrarNueva" />
          </div>
        </div>

        <div class="form-group">
          <label>Confirmar Nueva Contraseña</label>
          <div class="password-input-wrap">
            <input :type="mostrarConfirmar ? 'text' : 'password'" v-model="passwordConfirmar" required placeholder="Repite la nueva contraseña" autocomplete="new-password" />
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
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { decodificarToken } from '@/auth';
import { peticion } from '@/api';
import { iniciarCarga, detenerCarga } from '@/loading';
import TogglePassword from '@/components/TogglePassword.vue';

const router = useRouter();
const passwordNueva = ref('');
const passwordConfirmar = ref('');
const mostrarNueva = ref(false);
const mostrarConfirmar = ref(false);
const mensajeError = ref('');
const mensajeExito = ref('');
const cargando = ref(false);
const usuario = decodificarToken();
const esPrimerIngreso = ref(usuario?.debe_cambiar_password === true);

onMounted(() => {
  document.body.style.overflow = 'hidden';
});

onUnmounted(() => {
  document.body.style.overflow = '';
});

const cambiarContraseña = async () => {
  mensajeError.value = '';
  mensajeExito.value = '';

  if (passwordNueva.value !== passwordConfirmar.value) {
    mensajeError.value = 'Las contraseñas nuevas no coinciden';
    return;
  }

  if (passwordNueva.value.length < 8) {
    mensajeError.value = 'La nueva contraseña debe tener mínimo 8 caracteres';
    return;
  }

  if (!/\d/.test(passwordNueva.value)) {
    mensajeError.value = 'La nueva contraseña debe contener al menos un número';
    return;
  }

  cargando.value = true;
  iniciarCarga('Actualizando contraseña...');
  try {
    const data = await peticion('/api/cambiar-password', {
      metodo: 'PUT',
      cuerpo: {
        password_nuevo: passwordNueva.value
      }
    });

    localStorage.setItem('token', data.token);
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