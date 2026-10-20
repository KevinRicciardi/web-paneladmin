import { getCachedAuthHeaders as getAuthHeaders } from "./authenticatedFetch";
import { crearConsultaCacheada } from "../utils/consultaCacheada";
import type { BuildRequest, BuildRequestPublishInfoPayload } from "../types";

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

export type CrearSolicitudPayload = {
  notes?: string;
  publishInfo: BuildRequestPublishInfoPayload;
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

// En caché: al volver a "Generar App" se muestra al instante y se actualiza
// en segundo plano.
const consultaMisSolicitudes = crearConsultaCacheada(async () => {
  const headers = await getAuthHeaders();

  const res = await fetch(`${API_URL}/build-requests/mi-tenant`, { headers });
  return parseResponse<BuildRequest[]>(res);
});

export const listarMisSolicitudes = () => consultaMisSolicitudes.obtener("lista");
export const misSolicitudesEnCache = () => consultaMisSolicitudes.enCache("lista");
export const precargarMisSolicitudes = () => consultaMisSolicitudes.precargar("lista");

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

/// Etapa 4: el .aab vive en disco del servidor, detrás del mismo auth
/// de MEGA_ADMIN — no hay link público, hay que pedirlo con el token y
/// bajarlo como blob para poder disparar la descarga en el navegador.
export async function descargarAab(id: number, nombreSugerido: string): Promise<void> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${API_URL}/build-requests/${id}/download`, { headers });
  if (!res.ok) {
    throw new Error("No se pudo descargar el .aab");
  }

  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = nombreSugerido;
  link.click();
  URL.revokeObjectURL(url);
}
