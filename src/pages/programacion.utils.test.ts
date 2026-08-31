import { describe, expect, it } from "vitest";
import { shouldShowLoadingState } from "./programacion.utils";

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
