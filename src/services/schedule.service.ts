import { auth } from "../firebase";
import type { Programa, ProgramaPayload } from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

async function getAuthHeaders() {
  const token = await auth.currentUser?.getIdToken();

  if (!token) {
    throw new Error("No hay usuario autenticado");
  }

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
      // Si la API no devuelve JSON, dejamos el mensaje generico.
    }

    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

export async function listarMiProgramacion(): Promise<Programa[]> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${API_URL}/programacion/mi-tenant`, { headers });

  return parseResponse<Programa[]>(res);
}

export async function crearPrograma(
  payload: ProgramaPayload,
): Promise<Programa> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${API_URL}/programacion/mi-tenant`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  return parseResponse<Programa>(res);
}

export async function actualizarPrograma(
  id: number,
  payload: Partial<ProgramaPayload>,
): Promise<Programa> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${API_URL}/programacion/mi-tenant/${id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(payload),
  });

  return parseResponse<Programa>(res);
}

export async function eliminarPrograma(
  id: number,
): Promise<{ deleted: boolean; id: number }> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${API_URL}/programacion/mi-tenant/${id}`, {
    method: "DELETE",
    headers,
  });

  return parseResponse<{ deleted: boolean; id: number }>(res);
}

/** Público, para la app: GET /tenants/:slug/programacion */
export async function listarProgramacionPorSlug(
  slug: string,
): Promise<Programa[]> {
  const res = await fetch(`${API_URL}/tenants/${slug}/programacion`);
  return parseResponse<Programa[]>(res);
}