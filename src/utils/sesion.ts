import { limpiarTokenCache } from "../services/authenticatedFetch";
import { limpiarCacheNoticias } from "../services/news.service";
import { limpiarCacheProgramacion } from "../services/schedule.service";
import { limpiarConsultasCacheadas } from "./consultaCacheada";

/// Borra todo lo que el panel guarda "de la sesión": noticias, programación,
/// administradores y estadísticas cacheados, y el token. Sin esto, al cerrar
/// sesión y entrar con otra cuenta (típico en una demo con varios roles) se
/// veían primero los datos del usuario anterior, o se pedía con su token.
export function limpiarCachesDeSesion() {
  try {
    sessionStorage.clear();
  } catch {
    // Sin acceso a sessionStorage (modo privado, etc.): no hay nada que limpiar.
  }
  limpiarCacheNoticias();
  limpiarCacheProgramacion();
  limpiarConsultasCacheadas();
  limpiarTokenCache();
}
