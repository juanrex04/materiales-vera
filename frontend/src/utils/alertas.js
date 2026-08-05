import Swal from 'sweetalert2';

const COLOR_PRIMARIO = '#1e3a8a';
const COLOR_ELIMINAR = '#dc2626';
const COLOR_SECUNDARIO = '#64748b';

export const mostrarToast = (icono, titulo, texto = '') => {
  return Swal.fire({
    icon: icono,
    title: titulo,
    text: texto,
    toast: true,
    position: 'top-end',
    showConfirmButton: false,
    timer: 2500,
    timerProgressBar: true
  });
};

export const mostrarAlerta = (icono, titulo, texto = '') => {
  return Swal.fire({
    icon: icono,
    title: titulo,
    text: texto,
    confirmButtonColor: COLOR_PRIMARIO,
    confirmButtonText: 'Entendido'
  });
};

export const confirmarAccion = async (titulo, texto) => {
  const resultado = await Swal.fire({
    title: titulo,
    text: texto,
    icon: 'warning',
    showCancelButton: true,
    confirmButtonColor: COLOR_ELIMINAR,
    cancelButtonColor: COLOR_SECUNDARIO,
    confirmButtonText: 'Sí, continuar',
    cancelButtonText: 'Cancelar'
  });
  return resultado.isConfirmed;
};
