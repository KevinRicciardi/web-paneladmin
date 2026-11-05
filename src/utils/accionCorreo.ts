// Lógica de la página que abre los links de los correos de Firebase
// (verificar correo, elegir contraseña, recuperar o cambiar el correo).
//
// Firebase manda a UNA sola página para todo el proyecto: la que se configura
// en la consola (Authentication > Templates > "Customize action URL"). Llegan
// ahí los correos del panel, de la webyogur y de la app de todas las marcas,
// así que la página es neutra (sin logo ni colores de ninguna marca).
//
// El link trae: mode, oobCode, apiKey, lang y, si quien lo mandó lo pidió,
// continueUrl (a dónde volver al terminar).

export type ModoDeAccion = "verifyEmail" | "resetPassword" | "recoverEmail" | "verifyAndChangeEmail";

const MODOS: readonly ModoDeAccion[] = ["verifyEmail", "resetPassword", "recoverEmail", "verifyAndChangeEmail"];

export interface AccionDeCorreo {
  /** null: el link no trae un modo que esta página sepa resolver. */
  modo: ModoDeAccion | null;
  oobCode: string | null;
  /** A dónde volver al terminar, solo si es una dirección nuestra. */
  continuar: string | null;
  /** Link de invitación a un admin (la API lo arma con continueUrl = <panel>/activate). */
  esInvitacion: boolean;
}

function esHostLocal(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "[::1]";
}

/**
 * Solo se vuelve a direcciones nuestras: el panel o *.gpinnacle.com (https), y
 * localhost en desarrollo. Así un link armado a mano no puede usar esta página
 * para mandar a la persona a otro sitio después de "verificar".
 */
export function continuarPermitido(url: string | null, origenPanel: string): string | null {
  if (!url) return null;
  let destino: URL;
  try {
    destino = new URL(url);
  } catch {
    return null;
  }

  if (destino.protocol === "http:" && esHostLocal(destino.hostname)) return destino.toString();
  if (destino.protocol !== "https:") return null;

  const host = destino.hostname.toLowerCase();
  let hostPanel = "";
  try {
    hostPanel = new URL(origenPanel).hostname.toLowerCase();
  } catch {
    // Sin origen del panel, solo cuentan los dominios de Pinnacle.
  }
  const esNuestro = host === hostPanel || host === "gpinnacle.com" || host.endsWith(".gpinnacle.com");
  return esNuestro ? destino.toString() : null;
}

export function leerAccion(params: URLSearchParams, origenPanel: string): AccionDeCorreo {
  const modoCrudo = params.get("mode") as ModoDeAccion | null;
  const modo = modoCrudo && MODOS.includes(modoCrudo) ? modoCrudo : null;
  const oobCode = params.get("oobCode")?.trim() || null;
  const continuar = continuarPermitido(params.get("continueUrl"), origenPanel);

  const esInvitacion =
    modo === "resetPassword" && continuar !== null && new URL(continuar).pathname.replace(/\/+$/, "") === "/activate";

  return { modo, oobCode, continuar, esInvitacion };
}

/**
 * Sin mode ni oobCode: pasa mientras la consola de Firebase sigue usando su
 * página por defecto. Ahí la persona elige la contraseña y el botón
 * "Continuar" la trae acá sin datos. No es un error: ya está todo hecho.
 */
export function llegoSinDatos(params: URLSearchParams): boolean {
  return !params.get("mode") && !params.get("oobCode");
}

export const TEXTOS: Record<ModoDeAccion, { titulo: string; cargando: string }> = {
  verifyEmail: { titulo: "Verificar correo", cargando: "Verificando tu correo…" },
  resetPassword: { titulo: "Elegí una contraseña nueva", cargando: "Revisando el enlace…" },
  recoverEmail: { titulo: "Recuperar tu correo", cargando: "Recuperando tu correo…" },
  verifyAndChangeEmail: { titulo: "Cambiar tu correo", cargando: "Confirmando el cambio…" },
};

/** Texto para la persona a partir del código de error de Firebase. */
export function mensajeDeError(codigo: string | undefined, modo: ModoDeAccion | null, esInvitacion: boolean): string {
  switch (codigo) {
    case "auth/expired-action-code":
      return esInvitacion
        ? "La invitación venció. Pedile a quien te invitó que te la reenvíe."
        : "El enlace venció. Pedí uno nuevo desde donde lo solicitaste.";
    case "auth/invalid-action-code":
      if (esInvitacion) {
        return "Este enlace ya no es válido. Si ya definiste tu contraseña, iniciá sesión normalmente. Si no llegaste a hacerlo, pedile a quien te invitó que te reenvíe la invitación.";
      }
      if (modo === "verifyEmail") {
        return "Este enlace ya se usó o no es válido. Si ya verificaste tu correo, está todo listo.";
      }
      return "Este enlace ya se usó o no es válido. Pedí uno nuevo desde donde lo solicitaste.";
    case "auth/user-disabled":
      return "Esta cuenta está deshabilitada.";
    case "auth/user-not-found":
      return "La cuenta de este enlace ya no existe.";
    case "auth/weak-password":
    case "auth/password-does-not-meet-requirements":
      return "La contraseña no cumple los requisitos. Probá con una más larga, que mezcle letras y números.";
    case "auth/network-request-failed":
      return "No se pudo conectar. Revisá tu conexión e intentá de nuevo.";
    case "auth/too-many-requests":
      return "Hubo demasiados intentos. Esperá unos minutos y volvé a probar.";
    default:
      return "No se pudo completar. Intentá de nuevo en unos minutos.";
  }
}
