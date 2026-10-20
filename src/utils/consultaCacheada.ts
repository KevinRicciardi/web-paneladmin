import { auth } from "../firebase";

const limpiadores = new Set<() => void>();

/// Vacía todas las consultas cacheadas (se llama al cerrar sesión).
export function limpiarConsultasCacheadas() {
  limpiadores.forEach((limpiar) => limpiar());
}

// Caché en memoria para una consulta a la API, separada por usuario logueado
// (otra cuenta en la misma pestaña nunca ve datos ajenos) y por clave (por
// ejemplo, el período de las estadísticas). Sirve para que al volver a una
// página los datos aparezcan al instante mientras se actualizan por detrás.
export function crearConsultaCacheada<T, K extends string = string>(
  pedir: (clave: K) => Promise<T>,
  vigenciaPrecargaMs = 30_000,
) {
  const cache = new Map<string, { data: T; guardadoEn: number }>();
  const enCurso = new Map<string, Promise<T>>();
  const id = (clave: K) => `${auth.currentUser?.uid ?? ""}:${clave}`;
  limpiadores.add(() => {
    cache.clear();
    enCurso.clear();
  });

  const enCache = (clave: K): T | null => cache.get(id(clave))?.data ?? null;

  const guardar = (clave: K, data: T) => {
    if (auth.currentUser) cache.set(id(clave), { data, guardadoEn: Date.now() });
  };

  // Si ya hay un pedido igual en curso (por ejemplo, la precarga del menú) se
  // reusa en lugar de hacer otro.
  const obtener = (clave: K): Promise<T> => {
    const k = id(clave);
    let pedido = enCurso.get(k);
    if (!pedido) {
      pedido = pedir(clave)
        .then((data) => {
          cache.set(k, { data, guardadoEn: Date.now() });
          return data;
        })
        .finally(() => enCurso.delete(k));
      enCurso.set(k, pedido);
    }
    return pedido;
  };

  // Para precargar al pasar el mouse por el menú: si se trajo hace poco no
  // vuelve a pedirlo. Nunca rechaza.
  const precargar = (clave: K): Promise<unknown> => {
    const guardado = cache.get(id(clave));
    if (guardado && Date.now() - guardado.guardadoEn < vigenciaPrecargaMs) {
      return Promise.resolve();
    }
    return obtener(clave).catch(() => undefined);
  };

  return { obtener, enCache, guardar, precargar };
}
