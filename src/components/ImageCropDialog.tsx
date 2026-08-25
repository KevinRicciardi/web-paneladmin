import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";
import { useEffect, useState } from "react";

type CropType = "logo" | "banner" | "cover" | "event";

type CropDialogProps = {
  open: boolean;
  imageUrl: string | null;
  type: CropType;
  fileName?: string;
  onClose: () => void;
  onConfirm: (file: File) => void;
};

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

const buildDefaultCrop = (type: CropType) => {
  if (type === "logo") {
    return { x: 10, y: 10, width: 80, height: 80 };
  }
  if (type === "banner") {
    return { x: 10, y: 18, width: 80, height: 35 };
  }
  return { x: 0, y: 0, width: 100, height: 100 };
};

const getTargetAspect = (type: CropType) =>
  type === "logo" ? 1 : type === "banner" ? 6 : 16 / 9;

const buildCropForImage = (type: CropType, width: number, height: number) => {
  if (!width || !height) return buildDefaultCrop(type);

  const imageAspect = width / height;
  const targetAspect = getTargetAspect(type);

  if (imageAspect > targetAspect) {
    const cropWidth = (targetAspect / imageAspect) * 100;
    return { x: (100 - cropWidth) / 2, y: 0, width: cropWidth, height: 100 };
  }

  const cropHeight = (imageAspect / targetAspect) * 100;
  return { x: 0, y: (100 - cropHeight) / 2, width: 100, height: cropHeight };
};

async function resolveImageBlobUrl(source: string): Promise<string> {
  if (!source) return source;
  if (source.startsWith("blob:")) return source;

  try {
    const response = await fetch(source, { mode: "cors" });
    if (!response.ok) throw new Error("No se pudo cargar la imagen");
    const blob = await response.blob();
    return URL.createObjectURL(blob);
  } catch {
    return "";
  }
}

export default function ImageCropDialog({
  open,
  imageUrl,
  type,
  fileName = "imagen",
  onClose,
  onConfirm,
}: CropDialogProps) {
  const modalBackground = "#3b3b3b";
  const [cropBox, setCropBox] = useState(buildDefaultCrop(type));
  const [cropPan, setCropPan] = useState({ x: 0, y: 0 });
  const [cropZoom, setCropZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [flipHorizontal, setFlipHorizontal] = useState(false);
  const [draggingCrop, setDraggingCrop] = useState<{
    mode: "move" | "resize";
    startX: number;
    startY: number;
    startBox: { x: number; y: number; width: number; height: number };
    startPan: { x: number; y: number };
    handle?: "nw" | "ne" | "sw" | "se";
  } | null>(null);
  const [resolvedUrl, setResolvedUrl] = useState<string | null>(null);
  const [imageSize, setImageSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    if (!open || !imageUrl) {
      setResolvedUrl(null);
      setImageSize({ width: 0, height: 0 });
      return;
    }

    let isMounted = true;
    let blobUrlToRevoke: string | null = null;

    const run = async () => {
      const resolved = await resolveImageBlobUrl(imageUrl);
      if (!isMounted) return;
      if (!resolved) {
        setResolvedUrl(null);
        onClose();
        return;
      }
      blobUrlToRevoke = resolved.startsWith("blob:") && resolved !== imageUrl ? resolved : null;
      setResolvedUrl(resolved);
    };

    run();

    return () => {
      isMounted = false;
      if (blobUrlToRevoke) URL.revokeObjectURL(blobUrlToRevoke);
    };
  }, [open, imageUrl, onClose]);

  useEffect(() => {
    if (open) {
      setCropBox(buildDefaultCrop(type));
      setCropPan({ x: 0, y: 0 });
      setCropZoom(1);
      setRotation(0);
      setFlipHorizontal(false);
      setImageSize({ width: 0, height: 0 });
      setDraggingCrop(null);
    }
  }, [open, type]);

  const handleCropPointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
    mode: "move" | "resize",
    handle?: "nw" | "ne" | "sw" | "se",
  ) => {
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.setPointerCapture(event.pointerId);
    setDraggingCrop({
      mode,
      startX: event.clientX,
      startY: event.clientY,
      startBox: cropBox,
      startPan: cropPan,
      handle,
    });
  };

  const handleCropPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!draggingCrop) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const dx = ((event.clientX - draggingCrop.startX) / rect.width) * 100;
    const dy = ((event.clientY - draggingCrop.startY) / rect.height) * 100;

    if (draggingCrop.mode === "move") {
      const containerAspect = imageSize.width > 0 && imageSize.height > 0
        ? imageSize.width / imageSize.height
        : getTargetAspect(type);
      const rawImageAspect = imageSize.width > 0 && imageSize.height > 0
        ? imageSize.width / imageSize.height
        : containerAspect;
      const imageAspect = rotation % 180 === 0 ? rawImageAspect : 1 / rawImageAspect;
      const displayedWidth = Math.max(1, imageAspect / containerAspect) * cropZoom * 100;
      const displayedHeight = Math.max(1, containerAspect / imageAspect) * cropZoom * 100;
      const minPanX = cropBox.x + cropBox.width - displayedWidth;
      const maxPanX = cropBox.x;
      const minPanY = cropBox.y + cropBox.height - displayedHeight;
      const maxPanY = cropBox.y;

      setCropPan({
        x: clamp(draggingCrop.startPan.x + dx * 1.8, Math.min(minPanX, maxPanX), Math.max(minPanX, maxPanX)),
        y: clamp(draggingCrop.startPan.y + dy * 1.8, Math.min(minPanY, maxPanY), Math.max(minPanY, maxPanY)),
      });
      return;
    }

    const handle = draggingCrop.handle ?? "se";
    let { x, y, width, height } = draggingCrop.startBox;

    if (handle.includes("e")) width = clamp(draggingCrop.startBox.width + dx * 1.5, 15, 100 - x);
    if (handle.includes("s")) height = clamp(draggingCrop.startBox.height + dy * 1.5, 15, 100 - y);
    if (handle.includes("w")) {
      const newX = clamp(draggingCrop.startBox.x + dx * 1.5, 0, draggingCrop.startBox.x + draggingCrop.startBox.width - 15);
      const delta = newX - draggingCrop.startBox.x;
      x = newX;
      width = draggingCrop.startBox.width - delta;
    }
    if (handle.includes("n")) {
      const newY = clamp(draggingCrop.startBox.y + dy * 1.5, 0, draggingCrop.startBox.y + draggingCrop.startBox.height - 15);
      const delta = newY - draggingCrop.startBox.y;
      y = newY;
      height = draggingCrop.startBox.height - delta;
    }

    setCropBox({
      x: clamp(x, 0, 100 - width),
      y: clamp(y, 0, 100 - height),
      width: clamp(width, 15, 100),
      height: clamp(height, 15, 100),
    });
  };

  const handleCropWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    const delta = event.deltaY > 0 ? -0.1 : 0.1;
    setCropZoom((prev) => clamp(Number((prev + delta).toFixed(2)), 1, 2.5));
  };

  const handleCropPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const pointerTarget = event.target as Element;
    if (pointerTarget.hasPointerCapture?.(event.pointerId)) {
      pointerTarget.releasePointerCapture(event.pointerId);
    }
    setDraggingCrop(null);
  };

  const resetAdjustments = () => {
    setCropPan({ x: 0, y: 0 });
    setCropZoom(1);
    setRotation(0);
    setFlipHorizontal(false);
  };

  const rotateImage = () => {
    setRotation((current) => (current + 90) % 360);
    setCropPan({ x: 0, y: 0 });
  };

  const imageAspect = imageSize.width && imageSize.height
    ? imageSize.width / imageSize.height
    : getTargetAspect(type);
  const stageWidth = `min(100%, calc((100vh - 240px) * ${imageAspect}))`;

  const confirmCrop = async () => {
    if (!resolvedUrl) return;

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = resolvedUrl;

    try {
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error("No se pudo cargar la imagen para recortarla."));
      });
    } catch (error) {
      console.error(error);
      onClose();
      return;
    }

    const box = {
      x: (cropBox.x / 100) * img.naturalWidth,
      y: (cropBox.y / 100) * img.naturalHeight,
      width: (cropBox.width / 100) * img.naturalWidth,
      height: (cropBox.height / 100) * img.naturalHeight,
    };

    const targetWidth = type === "logo" ? 1024 : type === "banner" ? 1800 : 1600;
    const targetHeight = type === "logo" ? 1024 : type === "banner" ? 300 : 900;

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext("2d");
    if (!context) return;

    context.fillStyle = "#000000";
    context.fillRect(0, 0, targetWidth, targetHeight);

    try {
      context.drawImage(
        img,
        box.x,
        box.y,
        box.width,
        box.height,
        0,
        0,
        targetWidth,
        targetHeight,
      );
    } catch (error) {
      console.error("Canvas tainted:", error);
      onClose();
      return;
    }

    const outputCanvas = document.createElement("canvas");
    const isQuarterTurn = rotation % 180 !== 0;
    outputCanvas.width = isQuarterTurn ? targetHeight : targetWidth;
    outputCanvas.height = isQuarterTurn ? targetWidth : targetHeight;
    const outputContext = outputCanvas.getContext("2d");
    if (!outputContext) return;

    outputContext.translate(outputCanvas.width / 2, outputCanvas.height / 2);
    outputContext.rotate((rotation * Math.PI) / 180);
    outputContext.scale(flipHorizontal ? -1 : 1, 1);
    outputContext.drawImage(canvas, -targetWidth / 2, -targetHeight / 2);

    const outputBlob = await new Promise<Blob | null>((resolve) => {
      outputCanvas.toBlob((blob) => resolve(blob), "image/jpeg", 0.92);
    });

    if (!outputBlob) return;

    const output = new File([outputBlob], fileName || "imagen", { type: outputBlob.type || "image/jpeg" });
    onConfirm(output);
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      slotProps={{ paper: { sx: { bgcolor: modalBackground } } }}
    >
      <DialogTitle>Ajustá el recorte</DialogTitle>
      <DialogContent sx={{ pt: 2 }}>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Arrastrá la imagen dentro del cuadro para centrarla y ajustá los bordes para definir el recorte final.
        </Typography>

        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
          <Button
            size="small"
            variant={flipHorizontal ? "contained" : "outlined"}
            onClick={() => setFlipHorizontal((current) => !current)}
            title="Espejar horizontalmente"
            startIcon={<span className="material-symbols-outlined">flip</span>}
          >
            Espejar
          </Button>
          <Button
            size="small"
            variant="outlined"
            onClick={rotateImage}
            title="Rotar 90 grados"
            startIcon={<span className="material-symbols-outlined">rotate_right</span>}
          >
            Rotar
          </Button>
          <Button size="small" onClick={resetAdjustments} disabled={!rotation && !flipHorizontal && cropZoom === 1 && cropPan.x === 0 && cropPan.y === 0}>
            Restablecer
          </Button>
        </Box>

        <Box
          onPointerMove={handleCropPointerMove}
          onPointerUp={handleCropPointerUp}
          onWheel={handleCropWheel}
          sx={{
            position: "relative",
            width: stageWidth,
            maxWidth: "100%",
            aspectRatio: `${imageAspect}`,
            margin: "0 auto",
            borderRadius: 2,
            overflow: "hidden",
            border: "1px solid",
            borderColor: "divider",
            bgcolor: modalBackground,
            cursor: draggingCrop ? "grabbing" : "default",
          }}
        >
          {resolvedUrl && (
            <Box
              component="img"
              src={resolvedUrl}
              alt="Preview recorte"
              onLoad={(event) => {
                const image = event.currentTarget;
                setImageSize({ width: image.naturalWidth, height: image.naturalHeight });
                setCropBox(buildCropForImage(type, image.naturalWidth, image.naturalHeight));
              }}
              sx={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: `translate(${cropPan.x}%, ${cropPan.y}%) rotate(${rotation}deg) scale(${cropZoom}) scaleX(${flipHorizontal ? -1 : 1})`,
                transformOrigin: "center center",
                userSelect: "none",
                pointerEvents: "none",
              }}
            />
          )}

          <Box
            onPointerDown={(event) => handleCropPointerDown(event, "move")}
            sx={{
              position: "absolute",
              left: `${cropBox.x}%`,
              top: `${cropBox.y}%`,
              width: `${cropBox.width}%`,
              height: `${cropBox.height}%`,
              border: "2px solid #fff",
              borderRadius: 1.5,
              boxShadow: "0 0 0 9999px rgba(0, 0, 0, 0.58)",
              cursor: "move",
              touchAction: "none",
            }}
          >
            <Box
              onPointerDown={(event) => handleCropPointerDown(event, "resize", "nw")}
              sx={{ position: "absolute", left: -7, top: -7, width: 14, height: 14, borderRadius: "50%", bgcolor: "#fff", border: "2px solid #111", cursor: "nwse-resize" }}
            />
            <Box
              onPointerDown={(event) => handleCropPointerDown(event, "resize", "ne")}
              sx={{ position: "absolute", right: -7, top: -7, width: 14, height: 14, borderRadius: "50%", bgcolor: "#fff", border: "2px solid #111", cursor: "nesw-resize" }}
            />
            <Box
              onPointerDown={(event) => handleCropPointerDown(event, "resize", "sw")}
              sx={{ position: "absolute", left: -7, bottom: -7, width: 14, height: 14, borderRadius: "50%", bgcolor: "#fff", border: "2px solid #111", cursor: "nesw-resize" }}
            />
            <Box
              onPointerDown={(event) => handleCropPointerDown(event, "resize", "se")}
              sx={{ position: "absolute", right: -7, bottom: -7, width: 14, height: 14, borderRadius: "50%", bgcolor: "#fff", border: "2px solid #111", cursor: "nwse-resize" }}
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancelar</Button>
        <Button variant="contained" onClick={confirmCrop}>Usar recorte</Button>
      </DialogActions>
    </Dialog>
  );
}
