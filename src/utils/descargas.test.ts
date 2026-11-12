import { describe, expect, it } from "vitest";
import { textoDeDescargas } from "./descargas";

describe("textoDeDescargas", () => {
  it("muestra la variación contra el período anterior", () => {
    expect(textoDeDescargas({ descargas: 12, variacion: 20 })).toBe("+20% vs. período anterior");
    expect(textoDeDescargas({ descargas: 3, variacion: -50 })).toBe("-50% vs. período anterior");
  });

  it("sin descargas en ningún período lo dice", () => {
    expect(textoDeDescargas({ descargas: 0, variacion: 0 })).toBe("Sin descargas en el período anterior");
  });

  it("una API anterior que no manda las otras instalaciones no cambia el texto", () => {
    expect(textoDeDescargas({ descargas: 5, variacion: 0, otrasInstalaciones: undefined })).toBe("+0% vs. período anterior");
    expect(textoDeDescargas({ descargas: 5, variacion: 0, otrasInstalaciones: 0 })).toBe("+0% vs. período anterior");
  });

  it("aclara cuántas instalaciones hubo por fuera de Play Store", () => {
    expect(textoDeDescargas({ descargas: 0, variacion: 0, otrasInstalaciones: 14 })).toBe(
      "Sin descargas en el período anterior · Además, 14 instalaciones fuera de Play Store (APK directo o pruebas)",
    );
  });

  it("usa el singular con una sola", () => {
    expect(textoDeDescargas({ descargas: 2, variacion: 100, otrasInstalaciones: 1 })).toContain("1 instalación fuera");
  });
});
