<template>
  <div class="login-container">
    <div class="login-box">
      <h2>Cambiar Contraseña</h2>
      <p>Es tu primer inicio de sesión. Debes cambiar tu contraseña para continuar.</p>

      <form @submit.prevent="cambiarContraseña">
        <div class="form-group">
          <label>Contraseña Actual</label>
          <input type="password" v-model="passwordActual" required placeholder="Ingresa tu contraseña actual (12345)" />
        </div>

        <div class="form-group">
          <label>Nueva Contraseña</label>
          <input type="password" v-model="passwordNueva" required placeholder="Mínimo 6 caracteres" />
        </div>

        <div class="form-group">
          <label>Confirmar Nueva Contraseña</label>
          <input type="password" v-model="passwordConfirmar" required placeholder="Repite la nueva contraseña" />
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
import { API_URL } from '@/config';

const router = useRouter();
const passwordActual = ref('');
const passwordNueva = ref('');
const passwordConfirmar = ref('');
const mensajeError = ref('');
const mensajeExito = ref('');
const cargando = ref(false);

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
  try {
    const res = await fetch(`${API_URL}/api/cambiar-password`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        password_actual: passwordActual.value,
        password_nuevo: passwordNueva.value
      })
    });

    const data = await res.json();

    if (!res.ok) throw new Error(data.error);

    localStorage.setItem('debe_cambiar_password', 'false');
    mensajeExito.value = 'Contraseña actualizada. Redirigiendo...';

    setTimeout(() => {
      const rol = localStorage.getItem('rol');
      if (rol === 'Admin') router.push('/dashboard');
      else router.push('/conductores');
    }, 1500);
  } catch (error) {
    mensajeError.value = error.message;
  } finally {
    cargando.value = false;
  }
};
</script>