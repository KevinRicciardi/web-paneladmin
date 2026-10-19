import { describe, expect, it } from "vitest";
import { enlacesDelTenant, parsearTemas } from "./temas";

type C = { fondo: string; texto: string };
const normalizar = (c?: Partial<C>): C => ({ fondo: c?.fondo ?? "#000000", texto: c?.texto ?? "#ffffff" });

describe("parsearTemas", () => {
  it("lee los temas guardados y completa los colores que falten", () => {
    const raw = JSON.stringify([
      { nombre: "Noche", colores: { fondo: "#111111" }, fontFamily: "Inter" },
    ]);

    expect(parsearTemas(raw, normalizar)).toEqual([
      { nombre: "Noche", colores: { fondo: "#111111", texto: "#ffffff" }, fontFamily: "Inter" },
    ]);
  });

  it("devuelve una lista vacía cuando el tenant guardó [] (borró todos sus temas)", () => {
    expect(parsearTemas("[]", normalizar)).toEqual([]);
  });

  it("devuelve null si no hay nada o el JSON está roto, para no pisar la lista en pantalla", () => {
    expect(parsearTemas(undefined, normalizar)).toBeNull();
    expect(parsearTemas(null, normalizar)).toBeNull();
    expect(parsearTemas("", normalizar)).toBeNull();
    expect(parsearTemas("{no es json", normalizar)).toBeNull();
    expect(parsearTemas('{"nombre":"x"}', normalizar)).toBeNull();
  });

  it("ignora entradas sin nombre", () => {
    const raw = JSON.stringify([{ colores: {} }, null, { nombre: "Ok" }]);

    expect(parsearTemas(raw, normalizar)?.map((tema) => tema.nombre)).toEqual(["Ok"]);
  });
});

describe("enlacesDelTenant", () => {
  it("conserva el sitio web y los enlaces guardados", () => {
    const enlaces = enlacesDelTenant({
      websiteUrl: "https://mi-canal.com",
      socialMediasJson: '["instagram","website"]',
      otherContentJson: '[{"id":"1","nombre":"Tienda","enlace":"https://tienda.com"}]',
    });

    expect(enlaces).toEqual({
      websiteUrl: "https://mi-canal.com",
      socialMediasJson: '["instagram","website"]',
      otherContentJson: '[{"id":"1","nombre":"Tienda","enlace":"https://tienda.com"}]',
    });
  });

  it("sin datos devuelve valores vacíos, no null", () => {
    expect(enlacesDelTenant(null)).toEqual({
      websiteUrl: "",
      socialMediasJson: undefined,
      otherContentJson: undefined,
    });
  });
});
