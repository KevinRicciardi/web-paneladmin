import { auth } from "../firebase";
import type { Tenant } from "../types";

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
      // Si la API no devuelve JSON, dejamos el mensaje genérico.
    }

    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

/** Campos que acepta PATCH /tenants/mi-tenant */
export interface BrandingPayload {
  nombre?: string;
  logoUrl?: string;
  bannerUrl?: string;
  streamUrl?: string;
  tipoTransmision?: string;
  imagenPortada?: string;

  colorPrimario?: string;
  colorSecundario?: string;
  colorFondo?: string;
  colorCabecera?: string;
  colorTexto?: string;

  colorTextoCabecera?: string; // extra
  colorBotones?: string; // extra
  colorCardFondo?: string; // extra
  colorIconos?: string; // extra
}

/** GET /tenants — listado (público) */
export async function listarTenants(): Promise<Tenant[]> {
  const res = await fetch(`${API_URL}/tenants`);
  return parseResponse<Tenant[]>(res);
}

/** GET /tenants/:slug — un tenant por slug (público) */
export async function obtenerTenantPorSlug(slug: string): Promise<Tenant> {
  const res = await fetch(`${API_URL}/tenants/${slug}`);
  return parseResponse<Tenant>(res);
}

/** PATCH /tenants/mi-tenant — guarda el branding del admin logueado */
export async function actualizarMiBranding(
  payload: BrandingPayload,
): Promise<Tenant> {
  const headers = await getAuthHeaders();

  const res = await fetch(`${API_URL}/tenants/mi-tenant`, {
    method: "PATCH",
    headers,
    body: JSON.stringify(payload),
  });

  return parseResponse<Tenant>(res);
}