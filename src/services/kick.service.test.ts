import { afterEach, describe, expect, it, vi } from "vitest";
import { getKickAudioUrl } from "./kick.service";

describe("getKickAudioUrl", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("consulta la API con el canal codificado y el token Firebase", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      provider: "kick",
      isLive: true,
      audioUrl: "https://cdn.example.com/live/playlist.m3u8",
    }), { status: 200, headers: { "Content-Type": "application/json" } }));

    await expect(getKickAudioUrl("canal demo", "firebase-token")).resolves.toBe(
      "https://cdn.example.com/live/playlist.m3u8",
    );

    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/streams/kick-audio?channel=canal%20demo"),
      expect.objectContaining({
        cache: "no-store",
        headers: expect.objectContaining({ Authorization: "Bearer firebase-token" }),
      }),
    );
  });

  it("rechaza una respuesta sin una URL de audio válida", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      provider: "kick",
      isLive: true,
      audioUrl: "https://kick.com/canal",
    }), { status: 200 }));

    await expect(getKickAudioUrl("canal", "token")).resolves.toBeNull();
  });

  it("conserva el código y status de error de la API", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(JSON.stringify({
      code: "STREAM_OFFLINE",
      message: "offline",
    }), { status: 404 }));

    await expect(getKickAudioUrl("canal", "token")).rejects.toMatchObject({
      status: 404,
      code: "STREAM_OFFLINE",
    });
  });
});
