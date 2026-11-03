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

/// Misma regla que el menú (Layout): si una sección no aparece en el menú,
/// tampoco se puede abrir escribiendo la dirección. Es por prolijidad: el
/// backend igual rechaza lo que no corresponde.
export function puedeVerRuta(perfil: Perfil, ruta: string) {
  switch (ruta) {
    case "/branding":
    case "/programacion":
    case "/noticias":
    case "/estadisticas":
      return puedeVerSeccion(perfil, ruta.slice(1));
    case "/streaming":
      return puedeVerSeccion(perfil, "streaming") || puedeVerSeccion(perfil, "podcast");
    case "/generar-app":
      return perfil.rol !== "MEGA_ADMIN" && puedeVerSeccion(perfil, "soloDueno");
    case "/administradores":
      return perfil.rol === "SUPER_ADMIN" || perfil.rol === "MEGA_ADMIN";
    case "/solicitudes-apps":
      return perfil.rol === "MEGA_ADMIN";
    default:
      return true;
  }
}
