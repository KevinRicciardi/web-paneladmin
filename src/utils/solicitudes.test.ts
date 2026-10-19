import { describe, expect, it } from "vitest";
import { SECCIONES_POR_CARGO } from "../types";
import { puedeVerSeccion } from "./permisos";
import { confirmacionDeEstado, esEstadoFinal, pasoActivoDeSolicitud } from "./solicitudes";
import type { BuildRequestStatus, Perfil } from "../types";

const PASOS: BuildRequestStatus[] = ["PENDING", "IN_PROGRESS", "BUILDING", "COMPLETED", "PUBLISHED"];

describe("pasoActivoDeSolicitud", () => {
  it("una solicitud en curso marca su paso actual", () => {
    expect(pasoActivoDeSolicitud("BUILDING", PASOS)).toBe(2);
    expect(pasoActivoDeSolicitud("PENDING", PASOS)).toBe(0);
  });

  it("una solicitud publicada tiene todos los pasos completos", () => {
    expect(pasoActivoDeSolicitud("PUBLISHED", PASOS)).toBe(PASOS.length);
  });
});

describe("confirmación de cambios de estado", () => {
  it("los estados finales piden confirmación", () => {
    expect(esEstadoFinal("PUBLISHED")).toBe(true);
    expect(confirmacionDeEstado("CANCELLED")?.mensaje).toMatch(/estado final|nueva/);
    expect(confirmacionDeEstado("FAILED")).not.toBeNull();
    expect(confirmacionDeEstado("PUBLISHED")).not.toBeNull();
  });

  it("los pasos intermedios no piden confirmación", () => {
    expect(confirmacionDeEstado("IN_PROGRESS")).toBeNull();
    expect(confirmacionDeEstado("WAITING_CLIENT")).toBeNull();
    expect(confirmacionDeEstado("COMPLETED")).toBeNull();
  });
});

describe("cargo Editor de Contenido", () => {
  const editor = { rol: "ADMIN", cargo: "Editor de Contenido" } as Perfil;

  it("ve noticias y programación, pero no streaming ni podcast", () => {
    expect(puedeVerSeccion(editor, "noticias")).toBe(true);
    expect(puedeVerSeccion(editor, "programacion")).toBe(true);
    expect(puedeVerSeccion(editor, "streaming")).toBe(false);
    expect(puedeVerSeccion(editor, "podcast")).toBe(false);
  });

  it("solo el Operador de Streaming ve el menú de streaming entre los cargos", () => {
    const conStreaming = Object.entries(SECCIONES_POR_CARGO)
      .filter(([, secciones]) => secciones.includes("streaming") || secciones.includes("podcast"))
      .map(([cargo]) => cargo);

    expect(conStreaming).toEqual(["Operador de Streaming"]);
  });
});
