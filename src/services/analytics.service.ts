import { getCachedAuthHeaders as getAuthHeaders } from "./authenticatedFetch";
import type { Estadisticas, PeriodoEstadisticas } from "../types";

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

export async function obtenerEstadisticas(periodo: PeriodoEstadisticas): Promise<Estadisticas> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${API_URL}/analytics/mi-tenant/estadisticas?periodo=${periodo}`, {
    headers,
  });

  return parseResponse<Estadisticas>(res);
}
