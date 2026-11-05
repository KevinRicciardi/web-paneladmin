import { auth } from "../firebase";

let tokenCache: { uid: string; value: string; expiresAt: number } | null = null;
let tokenRequest: Promise<string> | null = null;
const TOKEN_CACHE_DURATION = 50_000;
const TENANT_STORAGE_KEY = "pinnacle-tenant-slug";

function claveDelSelector(): string | null {
  const uid = auth.currentUser?.uid;
  if (typeof window === "undefined" || !uid) return null;
  return `${TENANT_STORAGE_KEY}:${uid}`;
}

/// Canal elegido en el selector del panel ("" = el de siempre del usuario).
/// Está en localStorage, que comparten TODAS las pestañas: solo sirve para
/// saber qué canal pedirle a /me al abrir el panel o al cambiar de canal.
function tenantElegidoEnSelector(): string {
  const clave = claveDelSelector();
  if (!clave) return "";
  try {
    return window.localStorage.getItem(clave) ?? "";
  } catch {
    return "";
  }
}

/// Guarda el canal elegido en el selector. "" vuelve al de siempre.
export function elegirCanal(slug: string) {
  const clave = claveDelSelector();
  if (!clave) return;
  try {
    if (slug) window.localStorage.setItem(clave, slug);
    else window.localStorage.removeItem(clave);
  } catch {
    // Sin localStorage: el canal elegido dura lo que la pestaña.
  }
}

// Canal que muestra ESTA pestaña (lo resuelve /me). Va en cada pedido: los
// formularios se llenan con los datos de este canal, así que lo que se guarda
// tiene que ir a este mismo canal. Antes se leía el selector de localStorage
// en cada pedido: con dos pestañas abiertas, elegir otro canal en una hacía
// que la otra guardara la marca que tenía en pantalla (nombre, logo, colores)
// encima del canal recién elegido, y quedaban dos marcas con el mismo nombre.
// Sin el header, la API usa el canal "de origen" del usuario.
let tenantDelPerfil = "";

export function recordarTenantDelPerfil(slug: string | null | undefined) {
  tenantDelPerfil = slug ?? "";
}

// Mientras /me no respondió (al abrir el panel, o al cambiar de canal, que
// borra el de antes con limpiarTokenCache) se pide el elegido en el selector.
function canalDeLosPedidos(): string {
  return tenantDelPerfil || tenantElegidoEnSelector();
}

/// Un MEGA_ADMIN le cambió el slug a un canal. Si es el que muestra el panel,
/// los pedidos siguientes van al slug nuevo: con el viejo la API responde
/// "Tenant no encontrado" y ya no se guardaba nada en ninguna pantalla.
export function renombrarCanal(anterior: string, nuevo: string) {
  if (!anterior || !nuevo || anterior === nuevo) return;
  if (tenantDelPerfil === anterior) tenantDelPerfil = nuevo;
  if (tenantElegidoEnSelector() === anterior) elegirCanal(nuevo);
}

/// El canal elegido ya no existe (le cambiaron el slug desde otra sesión, o
/// lo borraron): se olvida para volver al de siempre. Sin esto el panel
/// quedaba pidiendo un slug inexistente y no se podía entrar ni volviendo a
/// iniciar sesión. Devuelve si había uno elegido.
export function olvidarCanalElegido(): boolean {
  const habia = Boolean(canalDeLosPedidos());
  tenantDelPerfil = "";
  elegirCanal("");
  return habia;
}

/// "Este usuario en este canal": separa los caches. Solo con el uid, al
/// cambiar de canal se veían un momento las noticias o la programación del
/// canal anterior, porque el usuario es el mismo.
export function contextoDeCache(): string | null {
  const uid = auth.currentUser?.uid;
  return uid ? `${uid}:${canalDeLosPedidos()}` : null;
}

function tenantHeader() {
  const slug = canalDeLosPedidos();
  const headers: Record<string, string> = {};
  if (slug) headers["X-Tenant-Slug"] = slug;
  return headers;
}

export function limpiarTokenCache() {
  tokenCache = null;
  tokenRequest = null;
  tenantDelPerfil = "";
}

export async function getCachedAuthHeaders() {
  const user = auth.currentUser;
  if (!user) {
    throw new Error("No hay usuario autenticado");
  }

  const now = Date.now();
  if (tokenCache && tokenCache.uid === user.uid && tokenCache.expiresAt > now) {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenCache.value}`,
      ...tenantHeader(),
    };
  }

  tokenRequest ??= user.getIdToken();

  let token: string;
  try {
    token = await tokenRequest;
  } finally {
    tokenRequest = null;
  }

  if (!token) {
    throw new Error("No hay usuario autenticado");
  }

  tokenCache = {
    uid: user.uid,
    value: token,
    expiresAt: now + TOKEN_CACHE_DURATION,
  };

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
    ...tenantHeader(),
  };
}
