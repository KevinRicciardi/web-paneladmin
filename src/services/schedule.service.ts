import { auth } from "../firebase";
import type { Programa, ProgramaPayload } from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

let tokenCache: { value: string; expiresAt: number } | null = null;
let tokenRequest: Promise<string> | null = null;
let listadoProgramacionEnCurso: Promise<Programa[]> | null = null;
let listadoProgramacionCache: { userId: string; data: Programa[]; expiresAt: number } | null = null;
const DURACION_CACHE_LISTADO = 30_000;

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
      // Si la API no devuelve JSON, dejamos el mensaje generico.
    }

    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

export async function listarMiProgramacion(): Promise<Programa[]> {
  const userId = auth.currentUser?.uid;
  const ahora = Date.now();

  if (
    userId &&
    listadoProgramacionCache?.userId === userId &&
    listadoProgramacionCache.expiresAt > ahora
  ) {
    return listadoProgramacionCache.data;
  }

  if (listadoProgramacionEnCurso) {
    return listadoProgramacionEnCurso;
  }

  listadoProgramacionEnCurso = (async () => {
    const headers = await getAuthHeaders();
    const res = await fetch(`${API_URL}/programacion/mi-tenant`, { headers });

    const data = await parseResponse<Programa[]>(res);
    if (userId) {
      listadoProgramacionCache = {
        userId,
        data,
        expiresAt: Date.now() + DURACION_CACHE_LISTADO,
      };
    }
    return data;
  })();

  try {
    return await listadoProgramacionEnCurso;
  } finally {
    listadoProgramacionEnCurso = null;
  }
}

export async function obtenerPrograma(id: number): Promise<Programa> {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/programacion/mi-tenant/${id}`, { headers });
  return parseResponse<Programa>(res);
}

export async function crearPrograma(
  payload: ProgramaPayload,
): Promise<Programa> {
  const headers = await getAuthHeaders();
  const body = JSON.stringify(payload);
  console.log("schedule.service crearPrograma body", body);

  const res = await fetch(`${API_URL}/programacion/mi-tenant`, {
    method: "POST",
    headers,
    body,
  });

  const data = await parseResponse<Programa>(res);
  invalidarCacheProgramacion();
  return data;
}

export async function actualizarPrograma(
  id: number,
  payload: Partial<ProgramaPayload>,
): Promise<Programa> {
  const headers = await getAuthHeaders();
  const body = JSON.stringify(payload);
  console.log("schedule.service actualizarPrograma body", body);

  const res = await fetch(`${API_URL}/programacion/mi-tenant/${id}`, {
    method: "PATCH",
    headers,
    body,
  });

  const data = await parseResponse<Programa>(res);
  invalidarCacheProgramacion();
  return data;
}

export async function eliminarPrograma(
  id: number,
): Promise<{ deleted: boolean; id: number }> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${API_URL}/programacion/mi-tenant/${id}`, {
    method: "DELETE",
    headers,
  });

  const data = await parseResponse<{ deleted: boolean; id: number }>(res);
  invalidarCacheProgramacion();
  return data;
}

/** Público, para la app: GET /tenants/:slug/programacion */
export async function listarProgramacionPorSlug(
  slug: string,
): Promise<Programa[]> {
  const res = await fetch(`${API_URL}/tenants/${slug}/programacion`);
  return parseResponse<Programa[]>(res);
}

function invalidarCacheProgramacion() {
  listadoProgramacionCache = null;
}