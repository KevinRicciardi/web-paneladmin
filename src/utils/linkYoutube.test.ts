import { describe, expect, it } from "vitest";
import { clasificarLinkYoutube } from "./linkYoutube";

describe("clasificarLinkYoutube", () => {
  it("los links de un canal sirven", () => {
    expect(clasificarLinkYoutube("https://www.youtube.com/@mi-canal")).toBe("canal");
    expect(clasificarLinkYoutube("https://youtube.com/@mi-canal/live")).toBe("canal");
    expect(clasificarLinkYoutube("https://www.youtube.com/channel/UCabcdefghijklmnopqrstuv")).toBe("canal");
    expect(clasificarLinkYoutube("https://m.youtube.com/@mi-canal")).toBe("canal");
    expect(clasificarLinkYoutube("https://www.youtube.com/user/miusuario")).toBe("canal");
  });

  it("el link de un video no sirve (el caso que falló en la prueba)", () => {
    expect(clasificarLinkYoutube("https://www.youtube.com/watch?v=MEJRgfzKh6s")).toBe("video");
    expect(clasificarLinkYoutube("https://youtu.be/MEJRgfzKh6s")).toBe("video");
    expect(clasificarLinkYoutube("https://www.youtube.com/live/MEJRgfzKh6s")).toBe("video");
    expect(clasificarLinkYoutube("https://www.youtube.com/shorts/MEJRgfzKh6s")).toBe("video");
    expect(clasificarLinkYoutube("https://www.youtube.com/embed/MEJRgfzKh6s")).toBe("video");
  });

  it("un ID de canal con formato inválido no se toma por un canal", () => {
    expect(clasificarLinkYoutube("https://www.youtube.com/channel/corto")).toBe("otro");
  });

  it("el formato viejo /c/ se avisa aparte porque la API lo rechaza", () => {
    expect(clasificarLinkYoutube("https://www.youtube.com/c/MiCanal")).toBe("personalizado");
  });

  it("lo que no es de YouTube o no es un link queda como otro", () => {
    expect(clasificarLinkYoutube("https://kick.com/canal")).toBe("otro");
    expect(clasificarLinkYoutube("https://youtube.com.malicioso.net/@canal")).toBe("otro");
    expect(clasificarLinkYoutube("")).toBe("otro");
    expect(clasificarLinkYoutube("youtube.com/@canal")).toBe("otro");
  });
});
