import { describe, expect, it } from "vitest";
import {
  ajustarFinAlCambiarInicio,
  esRangoHorarioValido,
  shouldShowLoadingState,
} from "./programacion.utils";

describe("shouldShowLoadingState", () => {
  it("no muestra loading si ya hay cache disponible", () => {
    expect(shouldShowLoadingState({ hasCache: true, hasLoadedOnce: false })).toBe(false);
  });

  it("muestra loading solo cuando no hay cache y aún no cargó nada", () => {
    expect(shouldShowLoadingState({ hasCache: false, hasLoadedOnce: false })).toBe(true);
  });

  it("deja de mostrar loading después de la primera carga", () => {
    expect(shouldShowLoadingState({ hasCache: false, hasLoadedOnce: true })).toBe(false);
  });
});

describe("validación de rango horario", () => {
  it("ajusta el fin al nuevo inicio si queda antes", () => {
    expect(ajustarFinAlCambiarInicio("14:00", "12:00")).toBe("14:00");
  });

  it("mantiene el fin si ya es posterior al inicio", () => {
    expect(ajustarFinAlCambiarInicio("14:00", "16:00")).toBe("16:00");
  });

  it("no permite guardar rangos iguales o invertidos", () => {
    expect(esRangoHorarioValido("14:00", "14:00")).toBe(false);
    expect(esRangoHorarioValido("15:00", "14:00")).toBe(false);
    expect(esRangoHorarioValido("14:00", "14:30")).toBe(true);
  });
});
