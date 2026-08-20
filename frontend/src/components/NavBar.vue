<template>
    <header class="header">
        <div class="brand">
            <img class="brand-logo" src="/logo.png" alt="VERA S.A.S." />
            <h2>Materiales Vera - Portal</h2>
        </div>

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

                <router-link to="/configuracion-whatsapp" class="btn-nav" active-class="activo">
                    WhatsApp
                </router-link>
            </div>

            <div v-if="rolUsuario === 'Conductor'" class="admin-buttons">
                <router-link to="/conductores" class="btn-nav" active-class="activo">
                    Inspección preoperacional
                </router-link>
            </div>
            
            <router-link to="/cambiar-password" class="btn-nav" active-class="activo">
                Cambiar Contraseña
            </router-link>

            <button @click="cerrarSesion" class="btn-logout"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg> Cerrar Sesión</button>
        </div>
    </header>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { decodificarToken } from '@/auth';

const router = useRouter();
const menuAbierto = ref(false);

const usuario = decodificarToken();
const rolUsuario = usuario?.rol;
const nombreUsuario = ref(usuario?.nombre || 'Usuario');

const cerrarSesion = () => {
    localStorage.clear();
    router.push('/');
};
</script>