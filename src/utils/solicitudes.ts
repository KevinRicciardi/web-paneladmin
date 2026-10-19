import type { BuildRequestStatus } from "../types";

// Estados en los que ya no tiene sentido seguir operando sobre la solicitud —
// igual que en el backend (src/build-requests/build-requests.service.ts).
export const ESTADOS_FINALES: BuildRequestStatus[] = ["PUBLISHED", "FAILED", "CANCELLED"];

export function esEstadoFinal(status: BuildRequestStatus) {
  return ESTADOS_FINALES.includes(status);
}

/**
 * Índice del paso activo en la línea de tiempo de una solicitud. Una solicitud
 * publicada tiene TODOS los pasos completos: antes quedaba el último marcado
 * como "en curso" y parecía que faltaba algo.
 */
export function pasoActivoDeSolicitud(status: BuildRequestStatus, orden: BuildRequestStatus[]) {
  if (status === "PUBLISHED") return orden.length;
  return orden.indexOf(status);
}

const CONFIRMACIONES: Partial<Record<BuildRequestStatus, { titulo: string; mensaje: string; boton: string }>> = {
  PUBLISHED: {
    titulo: "Marcar como publicada",
    mensaje:
      "Vas a marcar la solicitud como publicada en Google Play. Es un estado final: después no se puede cambiar.",
    boton: "Marcar como publicada",
  },
  FAILED: {
    titulo: "Marcar como fallida",
    mensaje: "Vas a marcar la solicitud como fallida. Es un estado final: después no se puede cambiar.",
    boton: "Marcar como fallida",
  },
  CANCELLED: {
    titulo: "Cancelar la solicitud",
    mensaje: "Vas a cancelar la solicitud. Es un estado final: el cliente tendrá que crear una nueva.",
    boton: "Cancelar la solicitud",
  },
};

/** Texto del diálogo de confirmación, o null si el cambio de estado no lo necesita. */
export function confirmacionDeEstado(status: BuildRequestStatus) {
  return esEstadoFinal(status) ? (CONFIRMACIONES[status] ?? null) : null;
}
