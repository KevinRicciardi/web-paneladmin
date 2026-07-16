import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { News, NewsPayload, NewsStatus } from "../types";
import {
  actualizarNoticia,
  crearNoticia,
  despublicarNoticia,
  eliminarNoticia,
  listarMisNoticias,
  publicarNoticia,
} from "../services/news.service";

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as
  | string
  | undefined;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as
  | string
  | undefined;

type FormState = {
  title: string;
  coverImageUrl: string;
  content: string;
};

const EMPTY_FORM: FormState = {
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

function timeAgo(value?: string | null) {
  if (!value) return "Borrador";

  const date = new Date(value).getTime();
  const diff = Date.now() - date;
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return "recién";
  if (minutes < 60) return `hace ${minutes} min`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `hace ${hours} hora${hours === 1 ? "" : "s"}`;

  const days = Math.floor(hours / 24);
  if (days === 1) return "ayer";
  if (days < 7) return `hace ${days} días`;

  return formatDate(value);
}

function excerptFrom(news: News) {
  return (
    news.excerpt ||
    news.content
      .replace(/[#*_>`-]/g, "")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 120) ||
    "Sin contenido"
  );
}

function statusLabel(status: NewsStatus) {
  return status === "published" ? "Publicado" : "Borrador";
}

function statusColor(status: NewsStatus) {
  return status === "published" ? "success" : "default";
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

export default function Noticias() {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [noticias, setNoticias] = useState<News[]>([]);
  const [selected, setSelected] = useState<News | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  const [drawerOpen, setDrawerOpen] = useState(false);
  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const filteredNews = useMemo(() => {
    const term = search.trim().toLowerCase();

    if (!term) return noticias;

    return noticias.filter((item) => {
      return (
        item.title.toLowerCase().includes(term) ||
        item.content.toLowerCase().includes(term) ||
        (item.excerpt ?? "").toLowerCase().includes(term)
      );
    });
  }, [noticias, search]);

  const publishedCount = noticias.filter(
    (item) => item.status === "published",
  ).length;

  const draftCount = noticias.filter((item) => item.status === "draft").length;

  const loadNoticias = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await listarMisNoticias();
      setNoticias(data);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error
          ? err.message
          : "No se pudieron cargar las noticias",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNoticias();
  }, []);

  useEffect(() => {
    if (!success) return;

    const timer = window.setTimeout(() => setSuccess(""), 2500);
    return () => window.clearTimeout(timer);
  }, [success]);

  const openCreate = () => {
    setSelected(null);
    setForm(EMPTY_FORM);
    setError("");
    setSuccess("");
    setDrawerOpen(true);
  };

  const openEdit = (news: News) => {
    setSelected(news);
    setForm({
      title: news.title,
      coverImageUrl: news.coverImageUrl ?? "",
      content: news.content,
    });
    setError("");
    setSuccess("");
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    if (saving || uploading) return;
    setDrawerOpen(false);
  };

  const setField = (field: keyof FormState, value: string) => {
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

  const buildPayload = (status: NewsStatus): NewsPayload => ({
    title: form.title.trim(),
    coverImageUrl: form.coverImageUrl.trim(),
    content: form.content.trim(),
    contentFormat: "markdown",
    status,
  });

  const save = async (status: NewsStatus) => {
    if (!validate()) return;

    setSaving(true);
    setError("");

    try {
      const payload = buildPayload(status);

      const saved = selected
        ? await actualizarNoticia(selected.id, payload)
        : await crearNoticia(payload);

      setNoticias((prev) => {
        const exists = prev.some((item) => item.id === saved.id);

        return exists
          ? prev.map((item) => (item.id === saved.id ? saved : item))
          : [saved, ...prev];
      });

      setSelected(saved);
      setSuccess(
        status === "published" ? "Noticia publicada." : "Borrador guardado.",
      );
      setDrawerOpen(false);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "No se pudo guardar la noticia",
      );
    } finally {
      setSaving(false);
    }
  };

  const publishExisting = async (news: News) => {
    setSaving(true);
    setError("");

    try {
      const updated = await publicarNoticia(news.id);

      setNoticias((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );

      setSuccess("Noticia publicada.");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "No se pudo publicar la noticia",
      );
    } finally {
      setSaving(false);
    }
  };

  const unpublishExisting = async (news: News) => {
    setSaving(true);
    setError("");

    try {
      const updated = await despublicarNoticia(news.id);

      setNoticias((prev) =>
        prev.map((item) => (item.id === updated.id ? updated : item)),
      );

      setSuccess("La noticia volvió a borrador.");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "No se pudo cambiar el estado",
      );
    } finally {
      setSaving(false);
    }
  };

  const removeExisting = async (news: News) => {
    const ok = window.confirm(
      `¿Eliminar "${news.title}"? Esta acción no se puede deshacer.`,
    );

    if (!ok) return;

    setSaving(true);
    setError("");

    try {
      await eliminarNoticia(news.id);

      setNoticias((prev) => prev.filter((item) => item.id !== news.id));
      setSuccess("Noticia eliminada.");
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "No se pudo eliminar la noticia",
      );
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
      setSuccess("Imagen subida.");
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "No se pudo subir la imagen");
    } finally {
      setUploading(false);
    }
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();

    const file = event.dataTransfer.files?.[0];
    if (file) uploadCover(file);
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) uploadCover(file);
  };

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 2,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.75 }}>
            Gestión de Noticias
          </Typography>
          <Typography color="text.secondary">
            Gestioná y publicá anuncios de la plataforma.
          </Typography>
        </Box>

        <Button
          variant="contained"
          onClick={openCreate}
          startIcon={<span className="material-symbols-outlined">add</span>}
          sx={{ fontWeight: 800 }}
        >
          Crear noticia
        </Button>
      </Box>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "1fr 1fr 1fr" },
          gap: 2,
          mb: 3,
        }}
      >
        <Card variant="outlined">
          <CardContent>
            <Typography
              color="text.secondary"
              sx={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}
            >
              Total
            </Typography>
            <Typography sx={{ fontSize: 32, fontWeight: 900 }}>
              {noticias.length}
            </Typography>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Typography
              color="text.secondary"
              sx={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}
            >
              Publicadas
            </Typography>
            <Typography sx={{ fontSize: 32, fontWeight: 900 }}>
              {publishedCount}
            </Typography>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Typography
              color="text.secondary"
              sx={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1 }}
            >
              Borradores
            </Typography>
            <Typography sx={{ fontSize: 32, fontWeight: 900 }}>
              {draftCount}
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {(error || success) && (
        <Stack spacing={1.5} sx={{ mb: 2 }}>
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
        </Stack>
      )}

      <Card variant="outlined">
        <CardContent sx={{ p: 0 }}>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              p: 2.5,
            }}
          >
            <Typography
              variant="h6"
              sx={{ fontWeight: 800, display: "flex", alignItems: "center", gap: 1 }}
            >
              <span className="material-symbols-outlined">newspaper</span>
              Noticias
            </Typography>

            <TextField
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar noticias..."
              size="small"
              sx={{ minWidth: { xs: 180, sm: 320 } }}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <span className="material-symbols-outlined">search</span>
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>

          <Divider />

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
              <CircularProgress />
            </Box>
          ) : filteredNews.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 8, px: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
                {search
                  ? "No encontramos noticias"
                  : "Todavía no hay noticias cargadas"}
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                Creá el primer anuncio para que luego aparezca publicado en la
                app.
              </Typography>
              <Button variant="contained" onClick={openCreate}>
                Crear noticia
              </Button>
            </Box>
          ) : (
            <Stack spacing={0}>
              {filteredNews.map((news) => (
                <Box
                  key={news.id}
                  sx={{
                    display: "grid",
                    gridTemplateColumns: {
                      xs: "96px 1fr",
                      md: "128px 1fr auto",
                    },
                    gap: 2,
                    p: 2,
                    borderBottom: "1px solid",
                    borderColor: "divider",
                    "&:last-child": { borderBottom: 0 },
                    "&:hover": { bgcolor: "rgba(255,255,255,0.03)" },
                  }}
                >
                  <Box
                    sx={{
                      height: 86,
                      borderRadius: 1.5,
                      bgcolor: "rgba(255,255,255,0.06)",
                      overflow: "hidden",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {news.coverImageUrl ? (
                      <Box
                        component="img"
                        src={news.coverImageUrl}
                        alt=""
                        sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <span
                        className="material-symbols-outlined"
                        style={{ opacity: 0.45 }}
                      >
                        image
                      </span>
                    )}
                  </Box>

                  <Box sx={{ minWidth: 0 }}>
                    <Box
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        mb: 0.75,
                        flexWrap: "wrap",
                      }}
                    >
                      <Chip
                        size="small"
                        label={statusLabel(news.status)}
                        color={statusColor(news.status)}
                      />
                      <Typography color="text.secondary" variant="caption">
                        {news.status === "published"
                          ? timeAgo(news.publishedAt)
                          : `editado ${timeAgo(news.updatedAt)}`}
                      </Typography>
                    </Box>

                    <Typography sx={{ fontSize: 18, fontWeight: 900, mb: 0.5 }}>
                      {news.title}
                    </Typography>

                    <Typography
                      color="text.secondary"
                      sx={{
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {excerptFrom(news)}
                    </Typography>
                  </Box>

                  <Stack
                    direction={{ xs: "row", md: "column" }}
                    spacing={1}
                    sx={{
                      gridColumn: { xs: "1 / -1", md: "auto" },
                      minWidth: 140,
                    }}
                  >
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => openEdit(news)}
                    >
                      Editar
                    </Button>

                    {news.status === "published" ? (
                      <Button
                        variant="outlined"
                        size="small"
                        color="warning"
                        onClick={() => unpublishExisting(news)}
                        disabled={saving}
                      >
                        Borrador
                      </Button>
                    ) : (
                      <Button
                        variant="contained"
                        size="small"
                        onClick={() => publishExisting(news)}
                        disabled={saving}
                      >
                        Publicar
                      </Button>
                    )}

                    <Button
                      variant="text"
                      size="small"
                      color="error"
                      onClick={() => removeExisting(news)}
                      disabled={saving}
                    >
                      Eliminar
                    </Button>
                  </Stack>
                </Box>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

     <Drawer
  anchor="right"
  open={drawerOpen}
  onClose={closeDrawer}
  sx={{
    zIndex: (theme) => theme.zIndex.drawer + 3,
  }}
  slotProps={{
    paper: {
      sx: {
        width: { xs: "100%", sm: 460 },
        p: 3,
      },
    },
  }}
>
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            mb: 2,
          }}
        >
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 900 }}>
              Redactor
            </Typography>
            <Typography color="text.secondary" variant="body2">
              {selected
                ? "Editá la noticia seleccionada."
                : "Creá una nueva noticia para tu tenant."}
            </Typography>
          </Box>

          <IconButton onClick={closeDrawer} disabled={saving || uploading}>
            <span className="material-symbols-outlined">close</span>
          </IconButton>
        </Box>

        <Divider sx={{ mb: 3 }} />

        <Stack spacing={2.5}>
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
                borderRadius: 1.5,
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
                    <span className="material-symbols-outlined">
                      cloud_upload
                    </span>
                  </Box>

                  <Typography sx={{ fontWeight: 800 }}>
                    Clic para subir o arrastrar y soltar
                  </Typography>
                  <Typography color="text.secondary" variant="body2">
                    SVG, PNG, JPG o GIF
                  </Typography>
                </Box>
              )}
            </Box>

            <TextField
              value={form.coverImageUrl}
              onChange={(event) => setField("coverImageUrl", event.target.value)}
              placeholder="O pegá una URL de imagen"
              size="small"
              fullWidth
              sx={{ mt: 1.5 }}
            />
          </Box>

          <TextField
            label="Contenido"
            placeholder="Escribe el contenido de la noticia aquí..."
            value={form.content}
            onChange={(event) => setField("content", event.target.value)}
            minRows={10}
            multiline
            fullWidth
          />

          {selected && (
            <Alert severity={selected.status === "published" ? "success" : "info"}>
              Estado actual: {statusLabel(selected.status)} ·{" "}
              {formatDate(selected.publishedAt)}
            </Alert>
          )}

          <Divider />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5}>
            <Button
              variant="outlined"
              fullWidth
              disabled={saving || uploading}
              onClick={() => save("draft")}
            >
              {saving ? "Guardando..." : "Guardar borrador"}
            </Button>

            <Button
              variant="contained"
              fullWidth
              disabled={saving || uploading}
              onClick={() => save("published")}
            >
              {saving ? "Publicando..." : "Publicar ahora"}
            </Button>
          </Stack>
        </Stack>
      </Drawer>
    </Box>
  );
}