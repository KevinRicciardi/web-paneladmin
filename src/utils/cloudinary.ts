import { API_URL } from "../config/api";
import { getCachedAuthHeaders } from "../services/authenticatedFetch";

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string | undefined;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string | undefined;

/// "imagen" va a /image/upload; "multimedia" (audio y video de podcast) a /auto/upload.
export type RecursoDeSubida = "imagen" | "multimedia";

type FirmaDeSubida = {
  cloudName: string;
  apiKey: string;
  timestamp: number;
  folder: string;
  allowed_formats: string;
  signature: string;
};

/// Pide a la API una firma para subir a la carpeta del tenant. null si la API
/// todavía no tiene las credenciales de Cloudinary (503): en ese caso se sube
/// con el upload preset, como antes.
async function pedirFirma(recurso: RecursoDeSubida): Promise<FirmaDeSubida | null> {
  const res = await fetch(`${API_URL}/uploads/firma`, {
    method: "POST",
    headers: await getCachedAuthHeaders(),
    body: JSON.stringify({ recurso }),
  });
  if (res.status === 503 || res.status === 404) return null;
  if (!res.ok) throw new Error("No se pudo autorizar la subida del archivo");
  return (await res.json()) as FirmaDeSubida;
}

export function cloudinaryConfigurado(): boolean {
  return Boolean(CLOUD_NAME && UPLOAD_PRESET);
}

export async function subirACloudinary(file: File, recurso: RecursoDeSubida = "imagen"): Promise<string> {
  const tipo = recurso === "multimedia" ? "auto" : "image";
  const formData = new FormData();
  formData.append("file", file);

  const firma = await pedirFirma(recurso);
  let cloudName: string | undefined;
  if (firma) {
    cloudName = firma.cloudName;
    formData.append("api_key", firma.apiKey);
    formData.append("timestamp", String(firma.timestamp));
    formData.append("folder", firma.folder);
    formData.append("allowed_formats", firma.allowed_formats);
    formData.append("signature", firma.signature);
  } else {
    if (!CLOUD_NAME || !UPLOAD_PRESET) {
      throw new Error("Faltan VITE_CLOUDINARY_CLOUD_NAME y VITE_CLOUDINARY_UPLOAD_PRESET");
    }
    cloudName = CLOUD_NAME;
    formData.append("upload_preset", UPLOAD_PRESET);
  }

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/${tipo}/upload`, {
    method: "POST",
    body: formData,
  });
  if (!res.ok) throw new Error(recurso === "multimedia" ? "No se pudo subir el archivo multimedia." : "No se pudo subir la imagen");
  const data = (await res.json()) as { secure_url?: string };
  if (!data.secure_url) throw new Error("Cloudinary no devolvió la URL del archivo");
  return data.secure_url;
}
