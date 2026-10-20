import { getCachedAuthHeaders as getAuthHeaders } from "./authenticatedFetch";
import { crearConsultaCacheada } from "../utils/consultaCacheada";
import type { Administrador } from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

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

// La lista queda en caché: al volver a entrar a la página se muestra al
// instante y se actualiza en segundo plano.
const consultaAdministradores = crearConsultaCacheada(async () => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/users/administradores`, { headers });
  return parseResponse<Administrador[]>(res);
});

export const listarAdministradores = () => consultaAdministradores.obtener("lista");
export const administradoresEnCache = () => consultaAdministradores.enCache("lista");
export const guardarAdministradoresEnCache = (data: Administrador[]) =>
  consultaAdministradores.guardar("lista", data);
export const precargarAdministradores = () => consultaAdministradores.precargar("lista");

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
