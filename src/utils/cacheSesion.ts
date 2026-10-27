import { auth } from "../firebase";

/// Clave de sessionStorage separada por usuario logueado. Con una clave fija,
/// al entrar con la cuenta de otro tenant (o recargar una pestaña donde había
/// otra cuenta) se veían un instante las noticias o la programación del
/// anterior hasta que llegaba la respuesta de la API.
export function claveCacheSesion(nombre: "noticias" | "programacion") {
  return `${nombre}_cache:${auth.currentUser?.uid ?? ""}`;
}
