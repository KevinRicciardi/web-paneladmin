import { getCachedAuthHeaders } from "./authenticatedFetch";
import { API_URL } from "../config/api";

// Mismos headers que el resto del panel (token + canal elegido).
const getAuthHeaders = getCachedAuthHeaders;

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

/** PATCH /tenants/:id/slug — solo MEGA_ADMIN. Con el slug se arma la APK del tenant. */
export async function cambiarSlugDeTenant(
  tenantId: number,
  slug: string,
): Promise<{ id: number; nombre: string; slug: string }> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${API_URL}/tenants/${tenantId}/slug`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ slug }),
  });

  return parseResponse(res);
}
