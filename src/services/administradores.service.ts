import { getCachedAuthHeaders as getAuthHeaders } from "./authenticatedFetch";
import { auth } from "../firebase";
import type { Administrador } from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

// Última lista conocida, por usuario logueado: al volver a entrar a la página
// se muestra al instante y se actualiza en segundo plano.
let cache: { uid: string; data: Administrador[]; guardadoEn: number } | null = null;
let pedidoEnCurso: Promise<Administrador[]> | null = null;
const PRECARGA_VIGENTE_MS = 30_000;

export function administradoresEnCache(): Administrador[] | null {
  const uid = auth.currentUser?.uid;
  return cache && cache.uid === uid ? cache.data : null;
}

export function guardarAdministradoresEnCache(data: Administrador[]) {
  const uid = auth.currentUser?.uid;
  if (uid) cache = { uid, data, guardadoEn: Date.now() };
}

// Se llama al pasar el mouse por "Administradores" en el menú, para que la
// lista ya esté pedida (o lista) cuando se entra. Si se trajo hace poco no
// vuelve a pedirla. Nunca rechaza.
export function precargarAdministradores(): Promise<unknown> {
  if (administradoresEnCache() && Date.now() - cache!.guardadoEn < PRECARGA_VIGENTE_MS) {
    return Promise.resolve();
  }
  return listarAdministradores().catch(() => undefined);
}

async function parseResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let message = "Error al comunicarse con la API";

    try {
      const data = await res.json();
      message = data?.message ?? message;
    } catch {
      // Si la API no devuelve JSON, dejamos el mensaje genérico.
    }

    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

// Si ya hay un pedido en curso (por ejemplo, la precarga del menú) se reusa
// en lugar de hacer otro.
export function listarAdministradores(): Promise<Administrador[]> {
  pedidoEnCurso ??= (async () => {
    try {
      const headers = await getAuthHeaders();
      const res = await fetch(`${API_URL}/users/administradores`, { headers });
      const data = await parseResponse<Administrador[]>(res);
      guardarAdministradoresEnCache(data);
      return data;
    } finally {
      pedidoEnCurso = null;
    }
  })();
  return pedidoEnCurso;
}

// "Quitar acceso": pasa a ser un usuario común de la app (conserva su cuenta
// y su historial) y deja de poder entrar al panel.
export function quitarAccesoAdministrador(id: number): Promise<Administrador> {
  return actualizarRolAdministrador(id, "USUARIO_FINAL", null);
}

export async function invitarAdministrador(email: string, cargo?: string): Promise<Administrador> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${API_URL}/users/administradores`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email, cargo }),
  });

  const data = await parseResponse<{ user: Administrador }>(res);
  return data.user;
}

export async function invitarSuperAdministrador(email: string): Promise<Administrador> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${API_URL}/users/super-administradores`, {
    method: "POST",
    headers,
    body: JSON.stringify({ email }),
  });

  const data = await parseResponse<{ user: Administrador }>(res);
  return data.user;
}

export async function actualizarRolAdministrador(
  id: number,
  rol: Administrador["rol"],
  cargo?: string | null,
): Promise<Administrador> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${API_URL}/users/${id}/role`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ rol, cargo }),
  });

  const data = await parseResponse<{ user: Administrador }>(res);
  return data.user;
}

export async function reenviarInvitacion(id: number): Promise<void> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${API_URL}/users/administradores/${id}/reenviar`, {
    method: "POST",
    headers,
  });

  await parseResponse(res);
}

export async function cancelarInvitacion(id: number): Promise<void> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${API_URL}/users/administradores/${id}`, {
    method: "DELETE",
    headers,
  });

  await parseResponse(res);
}
