import { describe, expect, it } from "vitest";
import { buildYoutubeChannelEmbedUrl } from "./youtube.service";

describe("buildYoutubeChannelEmbedUrl", () => {
  it("arma la URL de embed a partir del channel id", () => {
    expect(buildYoutubeChannelEmbedUrl("UCabcdefghijklmnopqrstuv")).toBe(
      "https://www.youtube.com/embed/live_stream?channel=UCabcdefghijklmnopqrstuv",
    );
  });

  it("recorta espacios en el channel id", () => {
    expect(buildYoutubeChannelEmbedUrl("  UCabcdefghijklmnopqrstuv  ")).toBe(
      "https://www.youtube.com/embed/live_stream?channel=UCabcdefghijklmnopqrstuv",
    );
  });

  it("devuelve null si no hay channel id", () => {
    expect(buildYoutubeChannelEmbedUrl(null)).toBeNull();
    expect(buildYoutubeChannelEmbedUrl(undefined)).toBeNull();
    expect(buildYoutubeChannelEmbedUrl("")).toBeNull();
    expect(buildYoutubeChannelEmbedUrl("   ")).toBeNull();
  });
});
