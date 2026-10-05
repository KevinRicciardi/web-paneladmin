declare module "gifenc/dist/gifenc.esm.js" {
  export type GifPalette = number[][];

  export type GifFrameOptions = {
    palette?: GifPalette;
    delay?: number;
    repeat?: number;
    transparent?: boolean;
    transparentIndex?: number;
    dispose?: number;
  };

  export type GifEncoder = {
    writeFrame: (index: Uint8Array, width: number, height: number, options?: GifFrameOptions) => void;
    finish: () => void;
    bytes: () => Uint8Array;
  };

  export function GIFEncoder(options?: { initialCapacity?: number; auto?: boolean }): GifEncoder;
  export function quantize(
    rgba: Uint8Array | Uint8ClampedArray,
    maxColors: number,
    options?: { format?: "rgba4444"; oneBitAlpha?: boolean },
  ): GifPalette;
  export function applyPalette(
    rgba: Uint8Array | Uint8ClampedArray,
    palette: GifPalette,
    format?: "rgba4444",
  ): Uint8Array;
}