import { afterEach, describe, expect, it, vi } from "vitest";
import { getSignalStatus, getStreamData } from "./stream.service";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getSignalStatus", () => {
  it("marca conectado cuando la plataforma reporta stream en vivo", () => {
    expect(getSignalStatus("youtube", { isLive: true })).toEqual({ label: "Conectado", conectado: true });
    expect(getSignalStatus("twitch", { isLive: true })).toEqual({ label: "Conectado", conectado: true });
    expect(getSignalStatus("kick", { isLive: true })).toEqual({ label: "Conectado", conectado: true });
  });

  it("marca desconectado cuando no hay stream activo", () => {
    expect(getSignalStatus("youtube", { isLive: false })).toEqual({ label: "Desconectado", conectado: false });
    expect(getSignalStatus("kick", null)).toEqual({ label: "Desconectado", conectado: false });
  });

  it("reutiliza el estado del stream durante unos segundos", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({ isLive: true, viewers: 12 }),
    } as Response);

    const first = await getStreamData("https://youtube.com/canal", "youtube", "cache-test-stream-status");
    const second = await getStreamData("https://youtube.com/canal", "youtube", "cache-test-stream-status");

    expect(first?.isLive).toBe(true);
    expect(second).toBe(first);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("conserva el estado en vivo aunque YouTube no pueda devolver métricas", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        isLive: true,
        viewers: null,
        startedAt: null,
        videoId: "live-video",
      }),
    } as Response);

    const data = await getStreamData(
      "https://youtube.com/canal",
      "youtube",
      "youtube-quota-limited",
    );

    expect(data).toMatchObject({
      isLive: true,
      viewerCount: null,
      duration: null,
      videoId: "live-video",
    });
  });
});
