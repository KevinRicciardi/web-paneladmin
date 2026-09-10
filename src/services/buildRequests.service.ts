import { auth } from "../firebase";
import type { BuildRequest, BuildRequestPublishInfoPayload, BuildRequestType } from "../types";

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

export type CrearSolicitudPayload = {
  type: BuildRequestType;
  notes?: string;
  publishInfo?: BuildRequestPublishInfoPayload;
};

export type EditarSolicitudPayload = {
  notes?: string;
  publishInfo?: BuildRequestPublishInfoPayload;
};

export type ActualizarEstadoPayload = {
  status: string;
  internalNotes?: string;
};

// ===================================================================
// SUPER_ADMIN — solicitudes del propio tenant
// ===================================================================

export async function crearSolicitud(payload: CrearSolicitudPayload): Promise<BuildRequest> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${API_URL}/build-requests/mi-tenant`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  return parseResponse<BuildRequest>(res);
}

export async function listarMisSolicitudes(): Promise<BuildRequest[]> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${API_URL}/build-requests/mi-tenant`, { headers });
  return parseResponse<BuildRequest[]>(res);
}

export async function editarSolicitud(
  id: number,
  payload: EditarSolicitudPayload,
): Promise<BuildRequest> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${API_URL}/build-requests/mi-tenant/${id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(payload),
  });

  return parseResponse<BuildRequest>(res);
}

// ===================================================================
// MEGA_ADMIN — cola completa, todos los tenants
// ===================================================================

export async function listarSolicitudes(status?: string): Promise<BuildRequest[]> {
  const headers = await getAuthHeaders();
  const query = status ? `?status=${encodeURIComponent(status)}` : "";

  const res = await fetch(`${API_URL}/build-requests${query}`, { headers });
  return parseResponse<BuildRequest[]>(res);
}

export async function obtenerSolicitud(id: number): Promise<BuildRequest> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${API_URL}/build-requests/${id}`, { headers });
  return parseResponse<BuildRequest>(res);
}

export async function actualizarEstadoSolicitud(
  id: number,
  payload: ActualizarEstadoPayload,
): Promise<BuildRequest> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${API_URL}/build-requests/${id}/status`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(payload),
  });

  return parseResponse<BuildRequest>(res);
}
