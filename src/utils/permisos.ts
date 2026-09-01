import { SECCIONES_POR_CARGO, type Perfil } from "../types";

// Solo para mostrar/ocultar cosas en el panel — el backend es quien
// realmente aplica los permisos en cada endpoint.
export function puedeVerSeccion(perfil: Perfil, seccion: string | null) {
  if (seccion === null) return true;
  if (perfil.rol === "MEGA_ADMIN" || perfil.rol === "SUPER_ADMIN") return true;
  if (seccion === "soloDueno" || perfil.rol !== "ADMIN") return false;

  const secciones = SECCIONES_POR_CARGO[perfil.cargo ?? ""] ?? [];
  return secciones.includes(seccion);
}
