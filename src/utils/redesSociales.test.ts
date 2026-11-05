import { describe, expect, it } from "vitest";
import { REDES_PRINCIPALES, ordenDeEnlaces } from "./redesSociales";

describe("ordenDeEnlaces", () => {
  it("sin una lista guardada muestra las seis redes", () => {
    expect(ordenDeEnlaces({}, [])).toEqual(REDES_PRINCIPALES);
    expect(ordenDeEnlaces({ socialMediasJson: "" }, [])).toEqual(REDES_PRINCIPALES);
    expect(ordenDeEnlaces({ socialMediasJson: "{roto" }, [])).toEqual(REDES_PRINCIPALES);
  });

  // Regresión: quitar una red y guardar no se guardaba. Al volver a entrar
  // se le sumaban las redes que faltaban y aparecía de nuevo, vacía.
  it("una red que el admin quitó no vuelve a aparecer", () => {
    const orden = ordenDeEnlaces(
      {
        socialMediasJson: JSON.stringify(["tiktokUrl", "instagramUrl"]),
        instagramUrl: "https://instagram.com/canal",
        youtubeUrl: "",
      },
      [],
    );

    expect(orden).toEqual(["tiktokUrl", "instagramUrl"]);
  });

  it("si el admin quitó todas, la lista queda vacía", () => {
    expect(ordenDeEnlaces({ socialMediasJson: "[]" }, [])).toEqual([]);
  });

  it("respeta el orden guardado, con el sitio web y el contenido personalizado", () => {
    const orden = ordenDeEnlaces(
      {
        socialMediasJson: JSON.stringify(["custom:1", "websiteUrl", "youtubeUrl"]),
        websiteUrl: "https://canal.com",
      },
      ["custom:1"],
    );

    expect(orden).toEqual(["custom:1", "websiteUrl", "youtubeUrl"]);
  });

  it("suma al final los enlaces con link que no están en la lista (la app los muestra)", () => {
    const orden = ordenDeEnlaces(
      {
        socialMediasJson: JSON.stringify(["instagramUrl"]),
        facebookUrl: "https://facebook.com/canal",
        websiteUrl: "https://canal.com",
      },
      ["custom:7"],
    );

    expect(orden).toEqual(["instagramUrl", "facebookUrl", "websiteUrl", "custom:7"]);
  });

  it("descarta claves desconocidas, repetidas o de contenido que ya no existe", () => {
    const orden = ordenDeEnlaces(
      { socialMediasJson: JSON.stringify(["instagramUrl", "instagramUrl", "myspaceUrl", "custom:borrado", 3]) },
      [],
    );

    expect(orden).toEqual(["instagramUrl"]);
  });
});
