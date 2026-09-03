import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Backdrop,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import NoticiaEditorForm from "../components/NoticiaEditorForm";
import type { News, NewsStatus } from "../types";
import {
  actualizarNoticia,
  crearNoticia,
  despublicarNoticia,
  eliminarNoticia,
  listarMisNoticias,
  publicarNoticia,
} from "../services/news.service";

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

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function excerptFrom(news: News) {
  return (
    news.excerpt ||
    news.content?.replace(/[#*_>`-]/g, "")
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

export default function Noticias() {
  const [noticias, setNoticias] = useState<News[]>([]);
  const [editando, setEditando] = useState<News | null>(null);

  const [search, setSearch] = useState("");

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [noticiaAEliminar, setNoticiaAEliminar] = useState<News | null>(null);
  const [eliminando, setEliminando] = useState(false);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [redactorExpandido, setRedactorExpandido] = useState(false);

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

  const loadNoticias = async () => {
    let hasCache = false;
    try {
      const cached = sessionStorage.getItem("noticias_cache");
      if (cached) {
        const parsed = JSON.parse(cached) as News[];
        if (parsed.length > 0) {
          setNoticias(parsed);
          hasCache = true;
        }
      }
    } catch {
      // Una caché inválida no debe impedir la carga desde la API.
    }

    setLoading(!hasCache);
    setError("");

    try {
      const data = await listarMisNoticias();
      setNoticias(data);
      try { sessionStorage.setItem("noticias_cache", JSON.stringify(data)); } catch {}
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
    if (loading && noticias.length === 0) return;
    try { sessionStorage.setItem("noticias_cache", JSON.stringify(noticias)); } catch {}
  }, [noticias]);

  useEffect(() => {
    if (!success) return;

    const timer = window.setTimeout(() => setSuccess(""), 2500);
    return () => window.clearTimeout(timer);
  }, [success]);

  const actualizarListado = (noticia: News) => {
    setNoticias((prev) => {
      const exists = prev.some((item) => item.id === noticia.id);
      const nuevos = exists
        ? prev.map((item) => (item.id === noticia.id ? noticia : item))
        : [noticia, ...prev];
      try { sessionStorage.setItem("noticias_cache", JSON.stringify(nuevos)); } catch {}
      return nuevos;
    });
  };

  const publishExisting = async (news: News) => {
    setSaving(true);
    setError("");

    try {
      const updated = await publicarNoticia(news.id);
      actualizarListado(updated);
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
      actualizarListado(updated);
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

  const removeExisting = (news: News) => {
    setNoticiaAEliminar(news);
  };

  const confirmarEliminar = async () => {
    if (!noticiaAEliminar) return;
    if (eliminando) return;

    setEliminando(true);
    setSaving(true);
    setError("");

    try {
      await eliminarNoticia(noticiaAEliminar.id);

      setNoticias((prev) => {
        const nuevos = prev.filter((item) => item.id !== noticiaAEliminar.id);
        try { sessionStorage.setItem("noticias_cache", JSON.stringify(nuevos)); } catch {}
        return nuevos;
      });
      setSuccess("Noticia eliminada.");
      setNoticiaAEliminar(null);
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : "No se pudo eliminar la noticia");
    } finally {
      setSaving(false);
      setEliminando(false);
    }
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

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", lg: "2.2fr 1fr" },
          gap: 3,
          mb: 3,
        }}
      >
        <Card variant="outlined" sx={{ bgcolor: "rgba(255,255,255,0.03)", borderColor: "divider" }}>
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
                sx={{ minWidth: { xs: 160, sm: 280, md: 340 } }}
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
                  Creá el primer anuncio desde el redactor de la derecha para
                  que luego aparezca publicado en la app.
                </Typography>
              </Box>
            ) : (
              <Stack spacing={2} sx={{ p: 2.5 }}>
                {filteredNews.map((news) => (
                  <Card
                    key={news.id}
                    variant="outlined"
                    sx={{
                      bgcolor: "rgba(255,255,255,0.02)",
                      borderColor: "divider",
                      transition: "background-color 150ms ease",
                      "&:hover": {
                        bgcolor: "rgba(255,255,255,0.05)",
                      },
                    }}
                  >
                    <Box
                      sx={{
                        display: "grid",
                        gridTemplateColumns: { xs: "96px 1fr", sm: "120px 1fr auto" },
                        gap: 2,
                        p: 2,
                        alignItems: "start",
                      }}
                    >
                      <Box
                        sx={{
                          height: 100,
                          borderRadius: 2,
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
                            sx={{ textTransform: "uppercase", fontWeight: 700 }}
                          />
                          <Typography color="text.secondary" variant="caption">
                            {news.status === "published"
                              ? timeAgo(news.publishedAt)
                              : `editado ${timeAgo(news.updatedAt)}`}
                          </Typography>
                        </Box>

                        <Typography sx={{ fontSize: 18, fontWeight: 900, mb: 0.75 }}>
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

                      <Stack direction={{ xs: "row", sm: "column" }} spacing={1}>
                        <Button variant="outlined" size="small" onClick={() => setEditando(news)}>
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
                  </Card>
                ))}
              </Stack>
            )}
          </CardContent>
        </Card>

        <Box sx={{ position: redactorExpandido ? "static" : { lg: "sticky" }, top: 24 }}>
          {redactorExpandido && (
            <Backdrop
              open
              onClick={() => setRedactorExpandido(false)}
              sx={{ zIndex: (theme) => theme.zIndex.modal - 1 }}
            />
          )}
          <Card
            variant="outlined"
            sx={{
              bgcolor: "#161616",
              borderColor: "divider",
              ...(redactorExpandido && {
                position: "fixed",
                zIndex: (theme) => theme.zIndex.modal,
                top: "3vh",
                left: "50%",
                transform: "translateX(-50%)",
                width: "min(900px, calc(100vw - 32px))",
                maxHeight: "94vh",
                overflow: "auto",
              }),
            }}
          >
            <CardContent sx={{ p: 3 }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
                <Box>
                  <Typography variant="h5" sx={{ fontWeight: 900 }}>
                    Redactor
                  </Typography>
                  <Typography color="text.secondary" variant="body2">
                    Creá una nueva noticia para tu tenant.
                  </Typography>
                </Box>
                <IconButton
                  onClick={() => setRedactorExpandido((expanded) => !expanded)}
                  size="small"
                  title={redactorExpandido ? "Contraer redactor" : "Expandir redactor"}
                >
                  <span className="material-symbols-outlined">
                    {redactorExpandido ? "close_fullscreen" : "open_in_full"}
                  </span>
                </IconButton>
              </Box>

              <NoticiaEditorForm
                key="crear"
                modo="crear"
                onGuardar={(status, form) =>
                  crearNoticia({
                    title: form.title,
                    coverImageUrl: form.coverImageUrl,
                    content: form.content,
                    contentFormat: "markdown",
                    status,
                  })
                }
                onGuardado={actualizarListado}
              />
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Editar noticia — modal aparte, así el redactor de arriba nunca
          se "pisa" con lo que se esté editando. */}
      <Dialog
        open={Boolean(editando)}
        onClose={() => setEditando(null)}
        fullWidth
        maxWidth="md"
        slotProps={{ paper: { sx: { bgcolor: "#161616", borderColor: "divider" } } }}
      >
        <DialogTitle sx={{ fontWeight: 900 }}>
          Editar noticia
        </DialogTitle>
        <DialogContent>
          {editando && (
            <NoticiaEditorForm
              key={editando.id}
              modo="editar"
              initial={{
                title: editando.title,
                coverImageUrl: editando.coverImageUrl ?? "",
                content: editando.content ?? "",
              }}
              estadoActual={{ status: editando.status, publishedAt: editando.publishedAt }}
              onGuardar={(status, form) =>
                actualizarNoticia(editando.id, {
                  title: form.title,
                  coverImageUrl: form.coverImageUrl,
                  content: form.content,
                  contentFormat: "markdown",
                  status,
                })
              }
              onGuardado={(noticia) => {
                actualizarListado(noticia);
                setSuccess(
                  noticia.status === "published" ? "Noticia publicada." : "Borrador guardado.",
                );
                setEditando(null);
              }}
              onCancelar={() => setEditando(null)}
            />
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(noticiaAEliminar)} onClose={() => setNoticiaAEliminar(null)}>
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>
          <Typography>¿Eliminar "{noticiaAEliminar?.title}"? Esta acción no se puede deshacer.</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNoticiaAEliminar(null)} disabled={eliminando}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={confirmarEliminar} disabled={eliminando}>{eliminando ? <CircularProgress size={18} color="inherit" /> : "Eliminar"}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
