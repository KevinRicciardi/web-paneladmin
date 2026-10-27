import { auth } from "../firebase";

let tokenCache: { uid: string; value: string; expiresAt: number } | null = null;
let tokenRequest: Promise<string> | null = null;
const TOKEN_CACHE_DURATION = 50_000;
const TENANT_STORAGE_KEY = "pinnacle-tenant-slug";

/// Canal elegido en el selector del panel ("" = el de siempre del usuario).
export function tenantActivo(): string {
  const uid = auth.currentUser?.uid;
  if (typeof window === "undefined" || !uid) return "";
  try {
    return window.localStorage.getItem(`${TENANT_STORAGE_KEY}:${uid}`) ?? "";
  } catch {
    return "";
  }
}

/// "Este usuario en este canal": separa los caches. Solo con el uid, al
/// cambiar de canal se veían un momento las noticias o la programación del
/// canal anterior, porque el usuario es el mismo.
export function contextoDeCache(): string | null {
  const uid = auth.currentUser?.uid;
  return uid ? `${uid}:${tenantActivo()}` : null;
}

function tenantHeader() {
  const slug = tenantActivo();
  const headers: Record<string, string> = {};
  if (slug) headers["X-Tenant-Slug"] = slug;
  return headers;
}

export function limpiarTokenCache() {
  tokenCache = null;
  tokenRequest = null;
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
