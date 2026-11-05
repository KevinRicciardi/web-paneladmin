import { describe, expect, it } from "vitest";
import { continuarPermitido, leerAccion, llegoSinDatos, mensajeDeError } from "./accionCorreo";

const PANEL = "https://marcablanca-panel.api.gpinnacle.com";
const params = (query: string) => new URLSearchParams(query);

describe("leerAccion", () => {
  it("lee el modo y el código de un link de verificación", () => {
    const accion = leerAccion(params("mode=verifyEmail&oobCode=ABC&apiKey=k&lang=es-419"), PANEL);

    expect(accion).toEqual({ modo: "verifyEmail", oobCode: "ABC", continuar: null, esInvitacion: false });
  });

  it("acepta los cuatro modos que la página sabe resolver", () => {
    for (const modo of ["verifyEmail", "resetPassword", "recoverEmail", "verifyAndChangeEmail"]) {
      expect(leerAccion(params(`mode=${modo}&oobCode=X`), PANEL).modo).toBe(modo);
    }
  });

  it("un modo desconocido (o el de iniciar sesión por link) queda en null", () => {
    expect(leerAccion(params("mode=signIn&oobCode=X"), PANEL).modo).toBeNull();
    expect(leerAccion(params("mode=<script>&oobCode=X"), PANEL).modo).toBeNull();
  });

  it("detecta la invitación de admin por el continueUrl /activate que arma la API", () => {
    const continueUrl = encodeURIComponent(`${PANEL}/activate`);
    const accion = leerAccion(params(`mode=resetPassword&oobCode=X&continueUrl=${continueUrl}`), PANEL);

    expect(accion.esInvitacion).toBe(true);
    expect(accion.continuar).toBe(`${PANEL}/activate`);
  });

  it("un cambio de contraseña común (sin continueUrl) no es invitación", () => {
    expect(leerAccion(params("mode=resetPassword&oobCode=X"), PANEL).esInvitacion).toBe(false);
  });

  it("un continueUrl /activate solo cuenta como invitación en el modo de elegir contraseña", () => {
    const continueUrl = encodeURIComponent(`${PANEL}/activate`);
    expect(leerAccion(params(`mode=verifyEmail&oobCode=X&continueUrl=${continueUrl}`), PANEL).esInvitacion).toBe(false);
  });
});

describe("continuarPermitido", () => {
  it("deja volver al panel y a los dominios de Pinnacle", () => {
    expect(continuarPermitido(`${PANEL}/activate`, PANEL)).toBe(`${PANEL}/activate`);
    expect(continuarPermitido("https://gpinnacle.com/", PANEL)).toBe("https://gpinnacle.com/");
    expect(continuarPermitido("https://www.gpinnacle.com/registro", PANEL)).toBe("https://www.gpinnacle.com/registro");
  });

  it("no deja mandar a la persona a otro sitio", () => {
    expect(continuarPermitido("https://sitio-malicioso.com/", PANEL)).toBeNull();
    expect(continuarPermitido("https://gpinnacle.com.sitio-malicioso.com/", PANEL)).toBeNull();
    expect(continuarPermitido("https://falso-gpinnacle.com/", PANEL)).toBeNull();
    expect(continuarPermitido("javascript:alert(1)", PANEL)).toBeNull();
    expect(continuarPermitido("http://marcablanca-panel.api.gpinnacle.com/", PANEL)).toBeNull();
    expect(continuarPermitido("no es una url", PANEL)).toBeNull();
    expect(continuarPermitido(null, PANEL)).toBeNull();
  });

  it("en desarrollo deja volver a localhost por http", () => {
    expect(continuarPermitido("http://localhost:5173/activate", PANEL)).toBe("http://localhost:5173/activate");
  });
});

describe("llegoSinDatos", () => {
  it("es true solo si el link no trae ni modo ni código", () => {
    expect(llegoSinDatos(params(""))).toBe(true);
    expect(llegoSinDatos(params("mode=verifyEmail"))).toBe(false);
    expect(llegoSinDatos(params("oobCode=X"))).toBe(false);
  });
});

describe("mensajeDeError", () => {
  it("explica un link vencido o ya usado según el caso", () => {
    expect(mensajeDeError("auth/expired-action-code", "resetPassword", true)).toMatch(/invitación venció/);
    expect(mensajeDeError("auth/expired-action-code", "verifyEmail", false)).toMatch(/enlace venció/);
    expect(mensajeDeError("auth/invalid-action-code", "verifyEmail", false)).toMatch(/ya verificaste tu correo, está todo listo/);
    expect(mensajeDeError("auth/invalid-action-code", "resetPassword", true)).toMatch(/reenvíe la invitación/);
  });

  it("no muestra texto técnico", () => {
    const mensaje = mensajeDeError("auth/internal-error", "verifyEmail", false);
    expect(mensaje).not.toMatch(/auth\/|internal/i);
    expect(mensajeDeError(undefined, null, false)).toMatch(/No se pudo completar/);
  });
});
