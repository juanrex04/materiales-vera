<template>
    <header class="header">
        <h2>Materiales Vera - Portal</h2>
        
        <button class="hamburger" @click="menuAbierto = !menuAbierto">
            {{ menuAbierto ? '✖' : '☰' }}
        </button>

        <div class="nav-menu" :class="{ 'nav-active': menuAbierto }" @click="menuAbierto = false">
            <span class="user-tag"><strong>{{ nombreUsuario }}</strong></span>

            <div v-if="rolUsuario === 'Admin'" class="admin-buttons">
                <router-link to="/dashboard" class="btn-nav" active-class="activo">
                    Inicio
                </router-link>

                <router-link to="/vehiculos" class="btn-nav" active-class="activo">
                    Vehículos
                </router-link>

                <router-link to="/colaboradores" class="btn-nav" active-class="activo">
                    Trabajadores
                </router-link>

                <router-link to="/checklistAdmin" class="btn-nav" active-class="activo">
                    Verificar Checklist
                </router-link>
            </div>
            <button @click="cerrarSesion" class="btn-logout">Cerrar Sesión</button>
        </div>
    </header>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

const router = useRouter();
const menuAbierto = ref(false);

const nombreUsuario = ref(localStorage.getItem('nombre') || 'Usuario');
const rolUsuario = ref(localStorage.getItem('rol') || '');

const cerrarSesion = () => {
    localStorage.clear();
    router.push('/');
};
</script>