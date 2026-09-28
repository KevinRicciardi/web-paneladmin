import { describe, expect, it } from "vitest";
import { getSignalStatus } from "./stream.service";

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
});
