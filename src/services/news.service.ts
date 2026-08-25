import { auth } from "../firebase";
import type { News, NewsPayload } from "../types";

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

export async function listarMisNoticias(): Promise<News[]> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${API_URL}/news/mi-tenant`, {
    headers,
  });

  return parseResponse<News[]>(res);
}

export async function crearNoticia(payload: NewsPayload): Promise<News> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${API_URL}/news/mi-tenant`, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  return parseResponse<News>(res);
}

export async function actualizarNoticia(
  id: number,
  payload: Partial<NewsPayload>,
): Promise<News> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${API_URL}/news/mi-tenant/${id}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(payload),
  });

  return parseResponse<News>(res);
}

export async function publicarNoticia(id: number): Promise<News> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${API_URL}/news/mi-tenant/${id}/publish`, {
    method: "POST",
    headers,
  });

  return parseResponse<News>(res);
}

export async function despublicarNoticia(id: number): Promise<News> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${API_URL}/news/mi-tenant/${id}/unpublish`, {
    method: "POST",
    headers,
  });

  return parseResponse<News>(res);
}

export async function eliminarNoticia(
  id: number,
): Promise<{ deleted: boolean; id: number }> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${API_URL}/news/mi-tenant/${id}`, {
    method: "DELETE",
    headers,
  });

  return parseResponse<{ deleted: boolean; id: number }>(res);
}