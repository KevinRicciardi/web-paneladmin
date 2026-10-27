import { contextoDeCache } from "../services/authenticatedFetch";

/// Clave de sessionStorage separada por usuario y canal. Con una clave fija,
/// al entrar con otra cuenta, cambiar de canal en el selector o recargar una
/// pestaña donde había otra cuenta se veían un instante las noticias o la
/// programación anteriores hasta que llegaba la respuesta de la API.
export function claveCacheSesion(nombre: "noticias" | "programacion") {
  return `${nombre}_cache:${contextoDeCache() ?? ""}`;
}
