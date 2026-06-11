// Configuración usada al construir la imagen Docker del frontend.
// apiUrl es relativo ('/api'): el nginx del contenedor proxya /api y /uploads
// al backend, de modo que todo va por el mismo origen (sin CORS).
export const environment = {
  production: true,
  apiUrl: '/api'
};
