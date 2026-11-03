import { getCachedAuthHeaders as getAuthHeaders } from "./authenticatedFetch";
import { crearConsultaCacheada } from "../utils/consultaCacheada";
import type { Estadisticas, PeriodoEstadisticas } from "../types";
import { API_URL } from "../config/api";

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

// Una entrada de caché por período: volver a la página o cambiar entre
// períodos ya vistos (o precargados) es instantáneo.
const consultaEstadisticas = crearConsultaCacheada(
  async (periodo: PeriodoEstadisticas): Promise<Estadisticas> => {
    const headers = await getAuthHeaders();

    const res = await fetch(`${API_URL}/analytics/mi-tenant/estadisticas?periodo=${periodo}`, {
      headers,
    });

    return parseResponse<Estadisticas>(res);
  },
);

export const obtenerEstadisticas = consultaEstadisticas.obtener;
export const estadisticasEnCache = consultaEstadisticas.enCache;
export const precargarEstadisticas = consultaEstadisticas.precargar;
