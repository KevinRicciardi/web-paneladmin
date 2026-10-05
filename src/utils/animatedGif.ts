import { decompressFrames, parseGIF, type ParsedFrame, type ParsedGif } from "gifuct-js";
import { applyPalette, GIFEncoder, quantize, type GifPalette } from "gifenc/dist/gifenc.esm.js";

const PALETTE_FORMAT = "rgba4444";
const MAX_PALETTE_SAMPLES = 40_000;

export type GifPixelFrame = {
  data: Uint8ClampedArray;
  delay: number;
};

export type AnimatedGifCropOptions = {
  cropBox: { x: number; y: number; width: number; height: number };
  pan: { x: number; y: number };
  zoom: number;
  targetWidth: number;
  targetHeight: number;
  rotation: number;
  flipHorizontal: boolean;
};

function buildPalette(samples: Uint8ClampedArray, sampleCount: number, hasTransparency: boolean) {
  const palette = quantize(samples.slice(0, sampleCount * 4), 256, {
    format: PALETTE_FORMAT,
    oneBitAlpha: true,
  });

  let transparentIndex = palette.findIndex((color) => color[3] <= 127);
  if (hasTransparency && transparentIndex === -1) {
    palette[0] = [0, 0, 0, 0];
    transparentIndex = 0;
  }
  if (transparentIndex > 0) {
    [palette[0], palette[transparentIndex]] = [palette[transparentIndex], palette[0]];
    transparentIndex = 0;
  }

  return { palette, transparentIndex: hasTransparency ? transparentIndex : -1 };
}

function encodeFrame(
  encoder: ReturnType<typeof GIFEncoder>,
  frame: GifPixelFrame,
  width: number,
  height: number,
  palette: GifPalette,
  transparentIndex: number,
  repeat: number,
  isFirst: boolean,
) {
  const indexed = applyPalette(frame.data, palette, PALETTE_FORMAT);
  encoder.writeFrame(indexed, width, height, {
    ...(isFirst ? { palette, repeat } : {}),
    delay: Math.max(20, Math.round(frame.delay / 10) * 10),
    transparent: transparentIndex >= 0,
    transparentIndex,
    dispose: transparentIndex >= 0 ? 2 : 0,
  });
}

export function encodeAnimatedGifFrames(
  frames: GifPixelFrame[],
  width: number,
  height: number,
  repeat = 0,
) {
  if (frames.length === 0) throw new Error("La GIF no contiene cuadros para exportar.");

  const pixelsPerFrame = width * height;
  const samples = new Uint8ClampedArray((MAX_PALETTE_SAMPLES + 1) * 4);
  const sampleBudgetPerFrame = Math.max(1, Math.floor(MAX_PALETTE_SAMPLES / frames.length));
  let sampleCount = 0;
  let hasTransparency = false;
  let sampledTransparency = false;

  for (const frame of frames) {
    const stride = Math.max(1, Math.ceil(pixelsPerFrame / sampleBudgetPerFrame));
    for (let pixel = 0; pixel < pixelsPerFrame; pixel++) {
      const offset = pixel * 4;
      if (frame.data[offset + 3] <= 127) hasTransparency = true;
      if (pixel % stride !== 0 || sampleCount >= MAX_PALETTE_SAMPLES) continue;
      samples.set(frame.data.subarray(offset, offset + 4), sampleCount * 4);
      sampledTransparency ||= frame.data[offset + 3] <= 127;
      sampleCount++;
    }
  }

  if (hasTransparency && !sampledTransparency) {
    samples.set([0, 0, 0, 0], sampleCount * 4);
    sampleCount++;
  }

  const { palette, transparentIndex } = buildPalette(samples, sampleCount, hasTransparency);
  const encoder = GIFEncoder();
  frames.forEach((frame, index) => {
    encodeFrame(encoder, frame, width, height, palette, transparentIndex, repeat, index === 0);
  });
  encoder.finish();
  return encoder.bytes();
}

function getLoopCount(gif: ParsedGif) {
  const extension = gif.frames.find(
    (frame) => "application" in frame && frame.application.id.startsWith("NETSCAPE"),
  );
  if (!extension || !("application" in extension)) return -1;

  const blocks = extension.application.blocks;
  return blocks[0] === 1 ? blocks[1] | (blocks[2] << 8) : -1;
}

export async function cropAnimatedGif(source: Blob, options: AnimatedGifCropOptions) {
  const parsedGif = parseGIF(await source.arrayBuffer());
  const frames = decompressFrames(parsedGif, true);
  if (frames.length === 0) throw new Error("La GIF no contiene cuadros para recortar.");

  const sourceWidth = parsedGif.lsd.width;
  const sourceHeight = parsedGif.lsd.height;
  const box = {
    x: (options.cropBox.x / 100) * sourceWidth,
    y: (options.cropBox.y / 100) * sourceHeight,
    width: (options.cropBox.width / 100) * sourceWidth,
    height: (options.cropBox.height / 100) * sourceHeight,
  };
  const outputWidth = options.targetWidth;
  const outputHeight = options.targetHeight;
  const sourceCanvas = document.createElement("canvas");
  sourceCanvas.width = sourceWidth;
  sourceCanvas.height = sourceHeight;
  const sourceContext = sourceCanvas.getContext("2d", { willReadFrequently: true });
  const patchCanvas = document.createElement("canvas");
  const transformedCanvas = document.createElement("canvas");
  transformedCanvas.width = sourceWidth;
  transformedCanvas.height = sourceHeight;
  const transformedContext = transformedCanvas.getContext("2d");
  const cropCanvas = document.createElement("canvas");
  cropCanvas.width = options.targetWidth;
  cropCanvas.height = options.targetHeight;
  const cropContext = cropCanvas.getContext("2d", { willReadFrequently: true });

  if (!sourceContext || !transformedContext || !cropContext) {
    throw new Error("No se pudo preparar el recorte animado.");
  }

  const renderFrames = (onFrame: (frame: GifPixelFrame, index: number) => void) => {
    sourceContext.clearRect(0, 0, sourceWidth, sourceHeight);
    let previousFrame: ParsedFrame | null = null;
    let previousRestore: ImageData | null = null;

    frames.forEach((frame, index) => {
      if (previousFrame?.disposalType === 2) {
        sourceContext.clearRect(
          previousFrame.dims.left,
          previousFrame.dims.top,
          previousFrame.dims.width,
          previousFrame.dims.height,
        );
      } else if (previousFrame?.disposalType === 3 && previousRestore) {
        sourceContext.putImageData(previousRestore, 0, 0);
      }

      const restoreBeforeFrame = frame.disposalType === 3
        ? sourceContext.getImageData(0, 0, sourceWidth, sourceHeight)
        : null;
      patchCanvas.width = frame.dims.width;
      patchCanvas.height = frame.dims.height;
      const patchContext = patchCanvas.getContext("2d");
      if (!patchContext) throw new Error("No se pudo preparar un cuadro de la GIF.");
      const patchData = patchContext.createImageData(frame.dims.width, frame.dims.height);
      patchData.data.set(frame.patch);
      patchContext.putImageData(patchData, 0, 0);
      sourceContext.drawImage(patchCanvas, frame.dims.left, frame.dims.top);

      transformedContext.clearRect(0, 0, sourceWidth, sourceHeight);
      transformedContext.save();
      transformedContext.translate(sourceWidth / 2, sourceHeight / 2);
      transformedContext.translate(
        (options.pan.x / 100) * sourceWidth,
        (options.pan.y / 100) * sourceHeight,
      );
      transformedContext.rotate((options.rotation * Math.PI) / 180);
      transformedContext.scale(options.zoom, options.zoom);
      transformedContext.scale(options.flipHorizontal ? -1 : 1, 1);
      transformedContext.drawImage(sourceCanvas, -sourceWidth / 2, -sourceHeight / 2);
      transformedContext.restore();

      cropContext.clearRect(0, 0, options.targetWidth, options.targetHeight);
      cropContext.drawImage(
        transformedCanvas,
        box.x,
        box.y,
        box.width,
        box.height,
        0,
        0,
        options.targetWidth,
        options.targetHeight,
      );
      onFrame(
        { data: cropContext.getImageData(0, 0, outputWidth, outputHeight).data, delay: frame.delay },
        index,
      );
      previousFrame = frame;
      previousRestore = restoreBeforeFrame;
    });
  };

  const samples = new Uint8ClampedArray((MAX_PALETTE_SAMPLES + 1) * 4);
  const sampleBudgetPerFrame = Math.max(1, Math.floor(MAX_PALETTE_SAMPLES / frames.length));
  let sampleCount = 0;
  let hasTransparency = false;
  let sampledTransparency = false;
  const outputPixels = outputWidth * outputHeight;

  renderFrames((frame) => {
    const stride = Math.max(1, Math.ceil(outputPixels / sampleBudgetPerFrame));
    for (let pixel = 0; pixel < outputPixels; pixel++) {
      const offset = pixel * 4;
      if (frame.data[offset + 3] <= 127) hasTransparency = true;
      if (pixel % stride !== 0 || sampleCount >= MAX_PALETTE_SAMPLES) continue;
      samples.set(frame.data.subarray(offset, offset + 4), sampleCount * 4);
      sampledTransparency ||= frame.data[offset + 3] <= 127;
      sampleCount++;
    }
  });

  if (hasTransparency && !sampledTransparency) {
    samples.set([0, 0, 0, 0], sampleCount * 4);
    sampleCount++;
  }
  const { palette, transparentIndex } = buildPalette(samples, sampleCount, hasTransparency);
  const encoder = GIFEncoder();
  const repeat = getLoopCount(parsedGif);
  renderFrames((frame, index) => {
    encodeFrame(encoder, frame, outputWidth, outputHeight, palette, transparentIndex, repeat, index === 0);
  });
  encoder.finish();

  const bytes = encoder.bytes();
  return new Blob([bytes.slice().buffer as ArrayBuffer], { type: "image/gif" });
}