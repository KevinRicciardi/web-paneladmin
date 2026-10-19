import { describe, expect, it } from "vitest";
import { normalizarHex } from "./colores";

describe("normalizarHex", () => {
  it("acepta un hex válido tal cual", () => {
    expect(normalizarHex("#FF0000")).toBe("#FF0000");
    expect(normalizarHex("#ff00aa")).toBe("#ff00aa");
  });

  it("agrega el # si falta", () => {
    expect(normalizarHex("FF0000")).toBe("#FF0000");
  });

  it("ignora espacios alrededor", () => {
    expect(normalizarHex("  #00ff00 ")).toBe("#00ff00");
  });

  it("rechaza lo que no es un color (el caso que dejaba la pantalla en blanco)", () => {
    expect(normalizarHex("rojo")).toBeNull();
    expect(normalizarHex("")).toBeNull();
    expect(normalizarHex("#FFF")).toBeNull();
    expect(normalizarHex("#GGGGGG")).toBeNull();
    expect(normalizarHex("#FF00000")).toBeNull();
  });
});
