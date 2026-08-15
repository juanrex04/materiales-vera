import { API_URL } from '@/config';

export const manejarNoAutorizado = () => {
  localStorage.removeItem('token');
  if (window.location.pathname !== '/login') {
    window.location.href = '/login';
  }
};

export async function peticion(ruta, opciones = {}) {
  const { metodo, cuerpo } = opciones;
  const headers = { ...(opciones.headers || {}) };
  const token = localStorage.getItem('token');
  if (token) headers['Authorization'] = `Bearer ${token}`;

  let respuesta;
  try {
    respuesta = await fetch(`${API_URL}${ruta}`, {
      method: metodo || 'GET',
      headers: cuerpo ? { ...headers, 'Content-Type': 'application/json' } : headers,
      body: cuerpo ? JSON.stringify(cuerpo) : undefined
    });
  } catch {
    throw new Error('No se pudo conectar con el servidor. Verifique su conexión a internet.');
  }

  let datos = null;
  try { datos = await respuesta.json(); } catch { /* sin cuerpo JSON */ }

  if (respuesta.status === 401) {
    manejarNoAutorizado();
    throw new Error('Su sesión ha expirado. Inicie sesión nuevamente.');
  }

  if (!respuesta.ok) {
    throw new Error(datos?.error || 'Ocurrió un error inesperado. Intente de nuevo.');
  }

  return datos;
}
