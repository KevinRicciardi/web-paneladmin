// URL de la API, en un solo lugar. En los builds de producción vite.config.ts
// exige VITE_API_URL (https), así que el fallback solo aplica en desarrollo.
export const API_URL: string = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
