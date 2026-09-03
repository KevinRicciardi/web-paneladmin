import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import ImageCropDialog from "./ImageCropDialog";
import NewsContentEditor from "./NewsContentEditor";
import type { News, NewsStatus } from "../types";

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as
  | string
  | undefined;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as
  | string
  | undefined;

export type NoticiaFormState = {
  title: string;
  coverImageUrl: string;
  content: string;
};

const EMPTY_FORM: NoticiaFormState = {
  title: "",
  coverImageUrl: "",
  content: "",
};

function formatDate(value?: string | null) {
  if (!value) return "Sin publicar";

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusLabel(status: NewsStatus) {
  return status === "published" ? "Publicado" : "Borrador";
}

async function subirACloudinary(file: File): Promise<string> {
  if (!CLOUD_NAME || !UPLOAD_PRESET) {
    throw new Error(
      "Faltan VITE_CLOUDINARY_CLOUD_NAME y VITE_CLOUDINARY_UPLOAD_PRESET",
    );
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);

  const res = await fetch(
    "https://api.cloudinary.com/v1_1/" + CLOUD_NAME + "/image/upload",
    {
      method: "POST",
      body: formData,
    },
  );

  if (!res.ok) throw new Error("No se pudo subir la imagen");

  const data = await res.json();
  return data.secure_url as string;
}

type NoticiaEditorFormProps = {
  modo: "crear" | "editar";
  initial?: NoticiaFormState;
  estadoActual?: { status: NewsStatus; publishedAt?: string | null };
  onGuardar: (status: NewsStatus, form: NoticiaFormState) => Promise<News>;
  onGuardado?: (noticia: News) => void;
  onCancelar?: () => void;
};

// Formulario del "Redactor" — autocontenido, se usa dos veces:
// una vez fija en la página (siempre en modo "crear"), y otra vez
// dentro de un modal (modo "editar") por cada noticia que se abre.
export default function NoticiaEditorForm({
  modo,
  initial,
  estadoActual,
  onGuardar,
  onGuardado,
  onCancelar,
}: NoticiaEditorFormProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState<NoticiaFormState>(initial ?? EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [cropOpen, setCropOpen] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);
  const [originalCoverSource, setOriginalCoverSource] = useState<string | null>(null);

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => setSuccess(""), 2500);
    return () => window.clearTimeout(timer);
  }, [success]);

  const setField = (field: keyof NoticiaFormState, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const validate = () => {
    if (!form.title.trim()) {
      setError("Ingresá un título para la noticia.");
      return false;
    }

    if (!form.content.trim()) {
      setError("Ingresá el contenido de la noticia.");
      return false;
    }

    return true;
  };

  const guardar = async (status: NewsStatus) => {
    if (!validate()) return;

    setSaving(true);
    setError("");

    try {
      const noticia = await onGuardar(status, {
        title: form.title.trim(),
        coverImageUrl: form.coverImageUrl.trim(),
        content: form.content.trim(),
      });

      setSuccess(status === "published" ? "Noticia publicada." : "Borrador guardado.");
      onGuardado?.(noticia);

      if (modo === "crear") {
        // El redactor de creación siempre vuelve a quedar vacío y listo
        // para la próxima noticia, en vez de convertirse en editor de la
        // que se acaba de crear.
        setForm(EMPTY_FORM);
        setOriginalCoverSource(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar la noticia");
    } finally {
      setSaving(false);
    }
  };

  const uploadCover = async (file: File) => {
    setUploading(true);
    setError("");

    try {
      const url = await subirACloudinary(file);
      setField("coverImageUrl", url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la imagen");
    } finally {
      setUploading(false);
    }
  };

  const openCropEditor = (url: string) => {
    setCropImageUrl(originalCoverSource || url);
    setCropOpen(true);
  };

  const handleCoverUrlChange = (value: string) => {
    setOriginalCoverSource(null);
    setField("coverImageUrl", value);
  };

  const validateCoverUrl = () => {
    const value = form.coverImageUrl.trim();
    if (!value) return;

    try {
      const parsed = new URL(value);
      if (!/^https?:$/.test(parsed.protocol)) {
        throw new Error("La URL debe comenzar con http:// o https://");
      }
      setError("");
    } catch {
      setError("Ingresá una URL de imagen válida (http:// o https://).");
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();

    const file = event.dataTransfer.files?.[0];
    if (file) {
      const localUrl = URL.createObjectURL(file);
      setOriginalCoverSource(localUrl);
      setCropImageUrl(localUrl);
      setCropOpen(true);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const localUrl = URL.createObjectURL(file);
      setOriginalCoverSource(localUrl);
      setCropImageUrl(localUrl);
      setCropOpen(true);
    }
    event.target.value = "";
  };

  return (
    <Stack spacing={2.5}>
      {error && (
        <Alert severity="error" onClose={() => setError("")}>
          {error}
        </Alert>
      )}
      {success && (
        <Alert severity="success" onClose={() => setSuccess("")}>
          {success}
        </Alert>
      )}

      <TextField
        label="Título"
        placeholder="Ingrese el título del artículo"
        value={form.title}
        onChange={(event) => setField("title", event.target.value)}
        fullWidth
      />

      <Box>
        <Typography
          sx={{
            fontSize: 12,
            fontWeight: 800,
            textTransform: "uppercase",
            letterSpacing: 1,
            mb: 1,
          }}
        >
          Imagen de portada
        </Typography>

        <input
          ref={fileInputRef}
          type="file"
          hidden
          accept="image/*"
          onChange={handleFileChange}
        />

        <Box
          onDragOver={(event) => event.preventDefault()}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          sx={{
            minHeight: 150,
            border: "1.5px dashed",
            borderColor: form.coverImageUrl ? "primary.main" : "divider",
            borderRadius: 2,
            bgcolor: "rgba(255,255,255,0.03)",
            cursor: "pointer",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
            p: form.coverImageUrl ? 0 : 3,
            "&:hover": {
              bgcolor: "rgba(255,255,255,0.05)",
              borderColor: "primary.main",
            },
          }}
        >
          {uploading ? (
            <CircularProgress />
          ) : form.coverImageUrl ? (
            <Box
              component="img"
              src={form.coverImageUrl}
              alt="Portada"
              sx={{ width: "100%", height: 180, objectFit: "cover" }}
            />
          ) : (
            <Box>
              <Box
                sx={{
                  width: 54,
                  height: 54,
                  borderRadius: 2,
                  bgcolor: "rgba(255,255,255,0.08)",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mb: 1,
                }}
              >
                <span className="material-symbols-outlined">cloud_upload</span>
              </Box>

              <Typography sx={{ fontWeight: 800 }}>
                Clic para subir o arrastrar y soltar
              </Typography>
              <Typography color="text.secondary" variant="body2">
                SVG, PNG, JPG o GIF
              </Typography>
              <Typography color="text.secondary" variant="caption" sx={{ display: "block", mt: 0.75 }}>
                Recomendado: 1600x900px (formato panorámico 16:9)
              </Typography>
            </Box>
          )}
        </Box>

        <Box sx={{ display: "flex", gap: 1, mt: 1.5, alignItems: "center" }}>
          <TextField
            value={form.coverImageUrl}
            onChange={(event) => handleCoverUrlChange(event.target.value)}
            onBlur={validateCoverUrl}
            placeholder="O pegá una URL de imagen"
            size="small"
            fullWidth
          />
          {form.coverImageUrl && (
            <Button size="small" variant="outlined" onClick={() => openCropEditor(form.coverImageUrl)}>Editar</Button>
          )}
        </Box>
      </Box>

      <Box>
        <Typography sx={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, mb: 1 }}>
          Contenido
        </Typography>
        <NewsContentEditor
          value={form.content}
          onChange={(content) => setField("content", content)}
          onUploadImage={subirACloudinary}
        />
      </Box>

      {estadoActual && (
        <Alert severity={estadoActual.status === "published" ? "success" : "info"}>
          Estado actual: {statusLabel(estadoActual.status)} ·{" "}
          {formatDate(estadoActual.publishedAt)}
        </Alert>
      )}

      <Divider />

      <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
        {onCancelar && (
          <Button variant="text" fullWidth onClick={onCancelar} disabled={saving || uploading}>
            Cancelar
          </Button>
        )}

        <Button
          variant="outlined"
          fullWidth
          disabled={saving || uploading}
          onClick={() => guardar("draft")}
        >
          {saving ? "Guardando..." : "Guardar borrador"}
        </Button>

        <Button
          variant="contained"
          fullWidth
          disabled={saving || uploading}
          onClick={() => guardar("published")}
        >
          {saving ? "Publicando..." : "Publicar ahora"}
        </Button>
      </Stack>

      <ImageCropDialog
        open={cropOpen}
        imageUrl={cropImageUrl}
        type="cover"
        fileName="portada.jpg"
        onClose={() => {
          setCropImageUrl(null);
          setCropOpen(false);
        }}
        onConfirm={async (file) => {
          setCropImageUrl(null);
          setCropOpen(false);
          await uploadCover(file);
        }}
      />
    </Stack>
  );
}
