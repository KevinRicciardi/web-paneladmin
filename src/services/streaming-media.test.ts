import { describe, expect, it } from "vitest";
import { esLinkDeYoutube } from "./streaming-media";

describe("esLinkDeYoutube", () => {
  it("acepta los formatos habituales de YouTube", () => {
    expect(esLinkDeYoutube("https://www.youtube.com/watch?v=abc123")).toBe(true);
    expect(esLinkDeYoutube("https://youtu.be/abc123")).toBe(true);
    expect(esLinkDeYoutube("https://www.youtube.com/@mi-canal/live")).toBe(true);
    expect(esLinkDeYoutube("https://m.youtube.com/channel/UC123")).toBe(true);
    expect(esLinkDeYoutube("  https://youtube.com/live/abc123  ")).toBe(true);
  });

  it("rechaza Kick, Twitch y cualquier otro sitio", () => {
    expect(esLinkDeYoutube("https://kick.com/canal")).toBe(false);
    expect(esLinkDeYoutube("https://www.twitch.tv/canal")).toBe(false);
    expect(esLinkDeYoutube("https://ejemplo.com/radio.mp3")).toBe(false);
  });

  it("rechaza un dominio que solo contiene la palabra youtube", () => {
    expect(esLinkDeYoutube("https://youtube.com.malicioso.net/watch?v=1")).toBe(false);
    expect(esLinkDeYoutube("https://notyoutube.com/watch?v=1")).toBe(false);
  });

  it("rechaza vacío, texto suelto y links sin https://", () => {
    expect(esLinkDeYoutube("")).toBe(false);
    expect(esLinkDeYoutube("youtube")).toBe(false);
    expect(esLinkDeYoutube("youtube.com/watch?v=abc123")).toBe(false);
  });
});
