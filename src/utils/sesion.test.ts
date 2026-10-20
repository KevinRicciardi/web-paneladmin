import { afterEach, describe, expect, it, vi } from "vitest";

const limpiarTokenCache = vi.fn();
const limpiarCacheNoticias = vi.fn();
const limpiarCacheProgramacion = vi.fn();
const limpiarConsultasCacheadas = vi.fn();

vi.mock("../services/authenticatedFetch", () => ({ limpiarTokenCache: () => limpiarTokenCache() }));
vi.mock("../services/news.service", () => ({ limpiarCacheNoticias: () => limpiarCacheNoticias() }));
vi.mock("../services/schedule.service", () => ({ limpiarCacheProgramacion: () => limpiarCacheProgramacion() }));
vi.mock("./consultaCacheada", () => ({ limpiarConsultasCacheadas: () => limpiarConsultasCacheadas() }));

import { limpiarCachesDeSesion } from "./sesion";

describe("limpiarCachesDeSesion", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.clearAllMocks();
  });

  it("vacía sessionStorage y todos los cachés de módulo", () => {
    const clear = vi.fn();
    vi.stubGlobal("sessionStorage", { clear });

    limpiarCachesDeSesion();

    expect(clear).toHaveBeenCalledTimes(1);
    expect(limpiarCacheNoticias).toHaveBeenCalledTimes(1);
    expect(limpiarCacheProgramacion).toHaveBeenCalledTimes(1);
    expect(limpiarConsultasCacheadas).toHaveBeenCalledTimes(1);
    expect(limpiarTokenCache).toHaveBeenCalledTimes(1);
  });

  it("no falla si sessionStorage no está disponible", () => {
    vi.stubGlobal("sessionStorage", {
      clear: () => {
        throw new Error("bloqueado");
      },
    });

    expect(() => limpiarCachesDeSesion()).not.toThrow();
    expect(limpiarTokenCache).toHaveBeenCalledTimes(1);
  });
});
