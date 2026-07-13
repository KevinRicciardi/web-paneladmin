import { useRef, useState, useEffect } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { auth } from "../firebase";
import type { Perfil } from "../types";

const TF: any = TextField;

const API_URL = "http://localhost:3000";
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string;

async function subirACloudinary(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  const res = await fetch(
    "https://api.cloudinary.com/v1_1/" + CLOUD_NAME + "/image/upload",
    { method: "POST", body: formData }
  );
  if (!res.ok) throw new Error("Error al subir imagen");
  const data = await res.json();
  return data.secure_url as string;
}

function getEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") || u.hostname === "youtu.be") {
      let videoId = u.searchParams.get("v");
      if (!videoId && u.hostname === "youtu.be") videoId = u.pathname.slice(1);
      if (!videoId && url.includes("/live/")) videoId = u.pathname.split("/live/")[1];
      return videoId ? "https://www.youtube.com/embed/" + videoId : null;
    }
    if (u.hostname === "kick.com" || u.hostname === "www.kick.com") {
      const canal = u.pathname.replace("/", "").split("/")[0];
      return canal ? "https://player.kick.com/" + canal : null;
    }
    return null;
  } catch {
    return null;
  }
}

function detectarPlataforma(url: string): string {
  if (url.includes("kick.com")) return "Kick";
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "YouTube";
  return "Desconocida";
}

function CardHeader({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <Typography
      sx={ {
        display: "flex", alignItems: "center", gap: 1, mb: 2,
        fontSize: 12, fontWeight: 600, letterSpacing: 1.5,
        textTransform: "uppercase", color: "text.secondary", fontFamily: "monospace",
      } }
    >
      <span className="material-symbols-outlined" style={ { fontSize: 16 } }>{icon}</span>
      {children}
    </Typography>
  );
}

export default function Streaming({ perfil }: { perfil: Perfil }) {
  const t = perfil.tenant;
  const [streamUrl, setStreamUrl] = useState(t?.streamUrl ?? "");
  const [streamActivo, setStreamActivo] = useState<boolean>(() => {
    try {
      if (typeof t?.streamActivo === "boolean") return t!.streamActivo!;
      const stored = localStorage.getItem("streamActivo");
      return stored === "true";
    } catch {
      return false;
    }
  });
  const [tipoTransmision, setTipoTransmision] = useState<string>(t?.tipoTransmision ?? "video");
  const [imagenPortada, setImagenPortada] = useState(t?.imagenPortada ?? "");
  const [uploadingPortada, setUploadingPortada] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [toggling, setToggling] = useState(false);
  const portadaInputRef = useRef<HTMLInputElement>(null);

  const esPodcast = tipoTransmision === "audio";
  const embedUrl = streamUrl ? getEmbedUrl(streamUrl) : null;
  const plataforma = streamUrl ? detectarPlataforma(streamUrl) : null;

  // Estado visual del switch: únicamente depende de `streamActivo`.
  const estado = streamActivo
    ? { label: "Conectado", conectado: true }
    : { label: "Desconectado", conectado: false };

  const handlePortada = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPortada(true);
    setError("");
    try {
      const url = await subirACloudinary(file);
      setImagenPortada(url);
      setSuccess(false);
    } catch {
      setError("No se pudo subir la portada. Revisá el preset unsigned de Cloudinary.");
    } finally {
      setUploadingPortada(false);
    }
  };

  const handleDescartar = () => {
    setStreamUrl(t?.streamUrl ?? "");
    setTipoTransmision(t?.tipoTransmision ?? "video");
    setImagenPortada(t?.imagenPortada ?? "");
    setSuccess(false);
    setError("");
  };

  const handleGuardar = async () => {
    setLoading(true);
    setSuccess(false);
    setError("");
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${API_URL}/tenants/mi-tenant`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ streamUrl, tipoTransmision, imagenPortada, streamActivo }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      setSuccess(true);
    } catch {
      setError("No se pudo guardar. Revisá la URL e intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActivo = async (ev: React.ChangeEvent<HTMLInputElement>) => {
    const nuevo = ev.target.checked;
    setToggling(true);
    setError("");
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${API_URL}/tenants/mi-tenant`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ streamActivo: nuevo }),
      });
      if (!res.ok) throw new Error("Error al cambiar estado");
      setStreamActivo(nuevo);
      try { localStorage.setItem("streamActivo", nuevo ? "true" : "false"); } catch {}
      setSuccess(true);
      // Avisamos a la app principal para que re-fetchee el perfil y propague el cambio
      try { window.dispatchEvent(new CustomEvent("tenantUpdated", { detail: { streamActivo: nuevo } })); } catch {}
    } catch {
      setError("No se pudo cambiar el estado del stream.");
    } finally {
      setToggling(false);
    }
  };

  // Mantener un fallback local para mantener el estado del switch si el backend no persiste.
  // Escribimos localStorage siempre que cambie streamActivo.
  useEffect(() => {
    try { localStorage.setItem("streamActivo", streamActivo ? "true" : "false"); } catch {}
  }, [streamActivo]);

  return (
    <Box>
      {/* Encabezado */}
      <Box sx={ { display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 2, mb: 4 } }>
        <Box>
          <Typography variant="h4" gutterBottom>Configuración</Typography>
          <Typography color="text.secondary" sx={ { maxWidth: 560 } }>
            Gestioná puntos finales, URLs de ingesta y monitoreá la salud de la señal en vivo.
          </Typography>
        </Box>
        <Card variant="outlined" sx={ { px: 2, py: 1 } }>
            <Box sx={ { display: "flex", alignItems: "center", gap: 1.5 } }>
            <Typography sx={ { fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "text.secondary", fontFamily: "monospace" } }>
              Estado de Señal
            </Typography>
            <Switch checked={streamActivo} size="small" disabled={toggling} onChange={handleToggleActivo} />
            <Chip
              label={estado.label.toUpperCase()}
              size="small"
              color={estado.conectado ? "success" : "default"}
              variant={estado.conectado ? "filled" : "outlined"}
              sx={ { fontSize: 11, fontWeight: 700, letterSpacing: 0.5 } }
            />
          </Box>
        </Card>
      </Box>

      <Box sx={ { display: "grid", gridTemplateColumns: { xs: "1fr", md: "7fr 5fr" }, gap: 3, alignItems: "start" } }>

        {/* Destino Principal */}
        <Card variant="outlined">
          <CardContent>
            <Box sx={ { display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 } }>
              <CardHeader icon="pin_drop">Destino Principal</CardHeader>
              {plataforma && (
                <Chip
                  label={plataforma.toUpperCase()}
                  size="small"
                  variant="outlined"
                  sx={ { fontSize: 10, fontWeight: 700, letterSpacing: 0.5, fontFamily: "monospace" } }
                />
              )}
            </Box>

            {/* URL */}
            <Typography sx={ { fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: "text.secondary", mb: 1 } }>
              URL del Servidor
            </Typography>
            <TF
              placeholder="rtmp://a.rtmp.youtube.com/live2"
              value={streamUrl}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => { setStreamUrl(e.target.value); setSuccess(false); }}
              fullWidth
              size="small"
              InputProps={ { inputProps: { style: { fontFamily: "monospace", fontSize: 13 } } } }
              sx={ { mb: 3 } }
            />

            {/* Tipo de transmisión */}
            <Typography sx={ { fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: "text.secondary", mb: 1 } }>
              Tipo de Transmisión
            </Typography>
            <Box sx={ { display: "grid", gridTemplateColumns: "1fr 1fr", border: "1px solid", borderColor: "divider", mb: 3, borderRadius: 1, overflow: "hidden" } }>
              {[
                { val: "video", label: "Video y Audio" },
                { val: "audio", label: "Solo Audio (Podcast)" },
              ].map((op) => {
                const activo = tipoTransmision === op.val;
                return (
                  <Box
                    key={op.val}
                    onClick={() => { setTipoTransmision(op.val); setSuccess(false); }}
                    sx={ {
                      textAlign: "center", py: 1.25, cursor: "pointer",
                      fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase",
                      bgcolor: activo ? "primary.main" : "transparent",
                      color: activo ? "primary.contrastText" : "text.primary",
                      transition: "all 0.15s",
                      "&:hover": { bgcolor: activo ? "primary.main" : "action.hover" },
                    } }
                  >
                    {op.label}
                  </Box>
                );
              })}
            </Box>

            {/* Imagen de portada (solo podcast) */}
            {esPodcast && (
              <Box
                sx={ {
                  border: "1px dashed", borderColor: "divider", borderRadius: 1,
                  p: 2, display: "flex", alignItems: "center", gap: 2,
                } }
              >
                <Box
                  sx={ {
                    width: 64, height: 64, borderRadius: 1, border: "1px solid",
                    borderColor: "divider", overflow: "hidden", bgcolor: "action.hover", flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                  } }
                >
                  {imagenPortada
                    ? <Box component="img" src={imagenPortada} sx={ { width: "100%", height: "100%", objectFit: "cover" } } />
                    : <Typography sx={ { fontSize: 22, opacity: 0.4 } }>
                        <span className="material-symbols-outlined">image</span>
                      </Typography>}
                </Box>
                <Box sx={ { flexGrow: 1, minWidth: 0 } }>
                  <Typography sx={ { fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", mb: 0.5 } }>
                    Imagen de Portada
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={ { display: "block", mb: 1 } }>
                    Recomendado: 1920x1080px (JPG/PNG)
                  </Typography>
                  <input ref={portadaInputRef} type="file" accept="image/*" hidden onChange={handlePortada} />
                  <Box sx={ { display: "flex", gap: 1 } }>
                    <Button
                      variant="outlined"
                      size="small"
                      onClick={() => portadaInputRef.current?.click()}
                      disabled={uploadingPortada}
                      startIcon={uploadingPortada ? <CircularProgress size={14} /> : undefined}
                      sx={ { fontSize: 11, letterSpacing: 0.5 } }
                    >
                      {uploadingPortada ? "Subiendo..." : imagenPortada ? "Cambiar" : "Subir Imagen"}
                    </Button>
                    {imagenPortada && !uploadingPortada && (
                      <Button size="small" color="error" onClick={() => { setImagenPortada(""); setSuccess(false); }} sx={ { fontSize: 11, letterSpacing: 0.5 } }>
                        Eliminar
                      </Button>
                    )}
                  </Box>
                </Box>
              </Box>
            )}

            {success && <Alert severity="success" sx={ { mt: 3 } }>¡Configuración guardada!</Alert>}
            {error && <Alert severity="error" sx={ { mt: 3 } }>{error}</Alert>}
          </CardContent>
        </Card>

        {/* Vista previa */}
        <Card variant="outlined" sx={ { overflow: "hidden" } }>
          <Box sx={ { px: 2, py: 1.25, borderBottom: "1px solid", borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "space-between" } }>
            <Typography sx={ { fontSize: 12, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "text.secondary", fontFamily: "monospace" } }>
              Vista Previa del Programa
            </Typography>
            <Typography sx={ { fontSize: 14, opacity: 0.5 } }>
              <span className="material-symbols-outlined">open_in_full</span>
            </Typography>
          </Box>
          <CardContent>
            {esPodcast ? (
              <Box
                sx={ {
                  position: "relative", width: "100%", aspectRatio: "16 / 9",
                  borderRadius: 1, overflow: "hidden", border: "1px solid", borderColor: "divider",
                  bgcolor: "action.hover",
                  display: "flex", alignItems: "center", justifyContent: "center",
                } }
              >
                {imagenPortada
                  ? <Box component="img" src={imagenPortada} sx={ { width: "100%", height: "100%", objectFit: "cover" } } />
                  : <Typography sx={ { fontSize: 32, opacity: 0.4 } }>
                      <span className="material-symbols-outlined">mic</span>
                    </Typography>}
                <Chip
                  label="PODCAST EN VIVO"
                  size="small"
                  color="error"
                  sx={ { position: "absolute", top: 8, left: 8, fontSize: 10, fontWeight: 700 } }
                />
              </Box>
            ) : embedUrl ? (
              <Box sx={ { position: "relative", width: "100%", aspectRatio: "16 / 9", borderRadius: 1, overflow: "hidden", border: "1px solid", borderColor: "divider" } }>
                <Box
                  component="iframe"
                  src={embedUrl}
                  title="Vista previa del stream"
                  allow="autoplay; fullscreen; picture-in-picture"
                  sx={ { position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" } }
                />
              </Box>
            ) : (
              <Box
                sx={ {
                  width: "100%", aspectRatio: "16 / 9", borderRadius: 1,
                  border: "1px solid", borderColor: "divider",
                  bgcolor: "action.hover", color: "text.secondary",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 1,
                } }
              >
                <Typography sx={ { fontSize: 28, opacity: 0.4 } }>
                  <span className="material-symbols-outlined">rss_feed</span>
                </Typography>
                <Typography sx={ { fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" } }>
                  {streamUrl ? "URL no reconocida" : "Sin Señal Detectada"}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>

      </Box>

      <Box sx={ { display: "flex", justifyContent: "center", gap: 1.5, mt: 4 } }>
        <Button variant="outlined" onClick={handleDescartar} disabled={loading || uploadingPortada} sx={ { minWidth: 160 } }>
          Descartar Cambios
        </Button>
        <Button
          variant="contained"
          onClick={handleGuardar}
          disabled={loading || uploadingPortada}
          startIcon={loading ? <CircularProgress size={18} color="inherit" /> : undefined}
          sx={ { minWidth: 200 } }
        >
          {loading ? "Guardando..." : "Guardar Configuración"}
        </Button>
      </Box>
    </Box>
  );
}