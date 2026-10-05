import { decompressFrames, parseGIF } from "gifuct-js";
import { describe, expect, it } from "vitest";
import { encodeAnimatedGifFrames } from "./animatedGif";

describe("encodeAnimatedGifFrames", () => {
  it("conserva los cuadros y sus duraciones", () => {
    const firstFrame = new Uint8ClampedArray([
      255, 0, 0, 255,
      255, 0, 0, 255,
    ]);
    const secondFrame = new Uint8ClampedArray([
      0, 0, 255, 255,
      0, 0, 255, 255,
    ]);
    const bytes = encodeAnimatedGifFrames(
      [
        { data: firstFrame, delay: 80 },
        { data: secondFrame, delay: 160 },
      ],
      2,
      1,
    );
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) as ArrayBuffer;
    const frames = decompressFrames(parseGIF(buffer), true);

    expect(frames).toHaveLength(2);
    expect(frames.map((frame) => frame.delay)).toEqual([80, 160]);
  });
});