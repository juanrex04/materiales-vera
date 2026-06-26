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

// Variables reactivas
const email = ref('');
const password = ref('');
const mensajeError = ref('');
const cargando = ref(false);

const router = useRouter();

const hacerLogin = async () => {
  cargando.value = true;
  mensajeError.value = '';

  try {
    const respuesta = await fetch('http://localhost:3000/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: email.value, password: password.value })
    });

    const data = await respuesta.json();

    if (!respuesta.ok) {
      throw new Error(data.error || 'Error al iniciar sesión');
    }

    // ¡Éxito! Guardamos el token y los datos en el navegador
    localStorage.setItem('token', data.token);
    localStorage.setItem('rol', data.rol);
    localStorage.setItem('nombre', data.nombre);

    // Redirigir al panel de control (Dashboard)
    router.push('/dashboard');
    
  } catch (error) {
    mensajeError.value = error.message;
  } finally {
    cargando.value = false;
  }
};
</script>

<style scoped>
.login-container {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100vh;
  background-color: #f4f6f9;
}
.login-box {
  background: white;
  padding: 2rem;
  border-radius: 8px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.1);
  width: 100%;
  max-width: 400px;
  text-align: center;
}
.form-group {
  margin-bottom: 1rem;
  text-align: left;
}
label { display: block; margin-bottom: 0.5rem; font-weight: bold; }
input { width: 100%; padding: 0.5rem; border: 1px solid #ccc; border-radius: 4px; box-sizing: border-box; }
button { width: 100%; padding: 0.75rem; background-color: #0056b3; color: white; border: none; border-radius: 4px; cursor: pointer; font-size: 1rem; margin-top: 1rem;}
button:disabled { background-color: #a0c4e8; cursor: not-allowed; }
.error { color: red; font-size: 0.9rem; margin-top: 0.5rem; }
</style>