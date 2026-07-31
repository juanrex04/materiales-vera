import { ref } from 'vue';

export const cargandoGlobal = ref(false);
export const mensajeCarga = ref('');

export const iniciarCarga = (msg = '') => {
  mensajeCarga.value = msg;
  cargandoGlobal.value = true;
};

export const detenerCarga = () => {
  mensajeCarga.value = '';
  cargandoGlobal.value = false;
};
