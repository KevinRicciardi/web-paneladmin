import { auth } from "../firebase";
import type { Administrador } from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

let tokenCache: { value: string; expiresAt: number } | null = null;
let tokenRequest: Promise<string> | null = null;

async function getAuthHeaders() {
  const now = Date.now();
  if (tokenCache && tokenCache.expiresAt > now) {
    return {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenCache.value}`,
    };
  }

  tokenRequest ??= auth.currentUser?.getIdToken() ?? Promise.reject(new Error("No hay usuario autenticado"));

  let token: string;
  try {
    token = await tokenRequest;
  } finally {
    tokenRequest = null;
  }

  if (!token) {
    throw new Error("No hay usuario autenticado");
  }

  tokenCache = { value: token, expiresAt: now + 50_000 };

  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
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

export async function listarAdministradores(): Promise<Administrador[]> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${API_URL}/users?rol=ADMIN`, {
    headers,
  });

  return parseResponse<Administrador[]>(res);
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
