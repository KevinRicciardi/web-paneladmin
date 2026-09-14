import { useRef, useState, useEffect } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  TextField,
  Typography,
} from "@mui/material";
import { auth } from "../firebase";
import ImageCropDialog from "../components/ImageCropDialog";
import type { Perfil } from "../types";
import { extractKickChannelName, getKickAudioUrl, getKickStreamData, type KickStreamData } from "../services/kick.service";
import { buildYoutubeChannelEmbedUrl } from "../services/youtube.service";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
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
    if (u.hostname === "twitch.tv" || u.hostname === "www.twitch.tv") {
      const canal = u.pathname.split("/").filter(Boolean)[0];
      if (!canal || canal === "directory" || canal === "videos") return null;
      const parent = typeof window !== "undefined" ? window.location.hostname : "localhost";
      return `https://player.twitch.tv/?channel=${encodeURIComponent(canal)}&parent=${encodeURIComponent(parent)}`;
    }
    return null;
  } catch {
    return null;
  }
}

function detectarPlataforma(url: string): string {
  if (url.includes("kick.com")) return "Kick";
  if (url.includes("twitch.tv")) return "Twitch";
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "YouTube";
  return "Desconocida";
}

function detectarProveedor(url: string): string | null {
  const normalized = url.toLowerCase();
  if (normalized.includes("kick.com")) return "kick";
  if (normalized.includes("twitch.tv")) return "twitch";
  if (normalized.includes("youtube.com") || normalized.includes("youtu.be")) return "youtube";
  return null;
}

function getAudioUrl(url: string): string | null {
  const normalized = url.trim();
  if (!normalized) return null;

  const lower = normalized.toLowerCase();
  const audioExtensions = [".mp3", ".aac", ".m4a", ".ogg", ".wav", ".flac", ".opus", ".m3u8"];
  if (audioExtensions.some((ext) => lower.endsWith(ext))) {
    return normalized;
  }

  try {
    const parsed = new URL(normalized);
    if (
      parsed.hostname.includes("kick.com")
      || parsed.hostname.includes("youtube.com")
      || parsed.hostname.includes("youtu.be")
      || parsed.hostname.includes("twitch.tv")
    ) {
      return null;
    }
  } catch {
    return null;
  }

  return normalized;
}

function isHlsUrl(url: string) {
  return url.trim().toLowerCase().split(/[?#]/)[0].endsWith(".m3u8");
}

function canPlayHlsNatively() {
  if (typeof document === "undefined") return false;
  const audio = document.createElement("audio");
  return (
    audio.canPlayType("application/vnd.apple.mpegurl") !== "" ||
    audio.canPlayType("application/x-mpegURL") !== "" ||
    audio.canPlayType("audio/mpegurl") !== ""
  );
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

function getStoredValue(key: string): string {
  try {
    return localStorage.getItem(key) ?? "";
  } catch {
    return "";
  }
}

export default function Streaming({ perfil }: { perfil: Perfil }) {
  const t = perfil.tenant;
  const [streamUrl, setStreamUrl] = useState<string>(() => t?.streamUrl ?? getStoredValue("streamUrl"));
  const [streamProvider, setStreamProvider] = useState<string>(() => {
    const valor = t?.streamProvider ?? getStoredValue("streamProvider");
    return valor || "kick";
  });
  const [youtubeChannelId, setYoutubeChannelId] = useState<string | null>(() => t?.youtubeChannelId ?? null);
  const [kickData, setKickData] = useState<KickStreamData | null>(null);
  const [kickAudioUrl, setKickAudioUrl] = useState<string | null>(null);
  const [tipoTransmision, setTipoTransmision] = useState<string>(() => {
    const valor = t?.tipoTransmision ?? getStoredValue("tipoTransmision");
    return valor || "video";
  });
  const [imagenPortada, setImagenPortada] = useState<string>(() => t?.imagenPortada ?? getStoredValue("imagenPortada"));
  const [uploadingPortada, setUploadingPortada] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioLoadError, setAudioLoadError] = useState("");
  const [audioReady, setAudioReady] = useState(false);
  const [audioLoading, setAudioLoading] = useState(false);
  const [kickIframeSrc, setKickIframeSrc] = useState<string | null>(null);
  const [kickIframePlaying, setKickIframePlaying] = useState(false);
  const [youtubeAudioSrc, setYoutubeAudioSrc] = useState<string | null>(null);
  const [youtubeAudioPlaying, setYoutubeAudioPlaying] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);
  const [originalCoverSource, setOriginalCoverSource] = useState<string | null>(null);
  const portadaInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const esPodcast = tipoTransmision === "audio";
  const embedUrl = streamUrl ? getEmbedUrl(streamUrl) : null;
  const plataforma = streamProvider === "youtube"
    ? "YouTube"
    : streamProvider === "twitch"
    ? "Twitch"
    : streamUrl
    ? detectarPlataforma(streamUrl)
    : null;
  const youtubeEmbedUrl = buildYoutubeChannelEmbedUrl(youtubeChannelId);
  const channelName = streamUrl ? extractKickChannelName(streamUrl) : null;
  const rawAudioUrl = kickAudioUrl || (streamUrl ? getAudioUrl(streamUrl) : null);
  const isHlsStream = rawAudioUrl ? isHlsUrl(rawAudioUrl) : false;
  const audioUrl = rawAudioUrl && !isHlsStream ? rawAudioUrl : null;
  const useKickIframeFallback = esPodcast && Boolean(channelName) && !audioUrl;
  const kickIframeUrl = useKickIframeFallback && channelName ? `https://player.kick.com/${channelName}` : null;
  const useYoutubeAudioFallback = esPodcast && streamProvider === "youtube" && Boolean(youtubeEmbedUrl);

  useEffect(() => {
    if (!useKickIframeFallback) {
      setKickIframeSrc(null);
      setKickIframePlaying(false);
      setIsPlaying(false);
    }
  }, [useKickIframeFallback]);

  useEffect(() => {
    if (!useYoutubeAudioFallback) {
      setYoutubeAudioSrc(null);
      setYoutubeAudioPlaying(false);
    }
  }, [useYoutubeAudioFallback]);

  useEffect(() => {
    if (t?.streamUrl) {
      setStreamUrl(t.streamUrl);
    } else {
      const storedUrl = getStoredValue("streamUrl");
      if (storedUrl) setStreamUrl(storedUrl);
    }

    if (t?.streamProvider) {
      setStreamProvider(t.streamProvider);
    } else {
      const storedProvider = getStoredValue("streamProvider");
      setStreamProvider(storedProvider || "kick");
    }

    setYoutubeChannelId(t?.youtubeChannelId ?? null);

    if (t?.tipoTransmision) {
      setTipoTransmision(t.tipoTransmision);
    } else {
      const storedTipo = getStoredValue("tipoTransmision");
      if (storedTipo) setTipoTransmision(storedTipo);
      else setTipoTransmision("video");
    }

    if (t?.imagenPortada) {
      setImagenPortada(t.imagenPortada);
    } else {
      const storedImagen = getStoredValue("imagenPortada");
      if (storedImagen) setImagenPortada(storedImagen);
      else setImagenPortada("");
    }
  }, [t?.streamUrl, t?.streamProvider, t?.youtubeChannelId, t?.tipoTransmision, t?.imagenPortada]);

  useEffect(() => {
    let active = true;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const refreshKickData = async () => {
      if (!channelName || streamProvider !== "kick") return;

      try {
        const data = await getKickStreamData(channelName);
        if (!active) return;
        setKickData(data);

        if (data?.isLive && !intervalId) {
          intervalId = setInterval(refreshKickData, 1000);
        }

        if (!data?.isLive && intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      } catch (error) {
        console.error("Error fetching Kick stream data:", error);
      }
    };

    void refreshKickData();

    return () => {
      active = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [channelName, streamProvider]);

  useEffect(() => {
    const fetchKickAudio = async () => {
      if (!channelName || !esPodcast) {
        setKickAudioUrl(null);
        return;
      }

      try {
        const audioUrl = await getKickAudioUrl(channelName);
        setKickAudioUrl(audioUrl);
      } catch (error) {
        console.error("Error fetching Kick audio url:", error);
        setKickAudioUrl(null);
      }
    };

    void fetchKickAudio();
  }, [channelName, esPodcast]);

  useEffect(() => {
    setAudioReady(false);
    setAudioLoading(false);
    setAudioLoadError("");

    if (!audioUrl) {
      return;
    }

    const audioElement = audioRef.current;
    if (!audioElement) {
      return;
    }

    audioElement.crossOrigin = "anonymous";
    let hlsInstance: any = null;
    let canceled = false;

    const cleanupAudioListeners = () => {
      audioElement.onloadedmetadata = null;
      audioElement.onerror = null;
    };

    const handleLoadedMetadata = () => {
      if (canceled) return;
      setAudioReady(true);
      setAudioLoading(false);
      setAudioLoadError("");
    };

    const handleAudioError = () => {
      if (canceled) return;
      setAudioReady(false);
      setAudioLoading(false);
      setAudioLoadError("No se pudo cargar el audio.");
    };

    audioElement.onloadedmetadata = handleLoadedMetadata;
    audioElement.onerror = handleAudioError;
    setAudioLoading(true);

    const setupAudio = async () => {
      if (!audioUrl) return;

      const playbackUrl = audioUrl;
      const urlIsHls = isHlsUrl(playbackUrl);
      if (urlIsHls) {
        if (canPlayHlsNatively()) {
          audioElement.src = playbackUrl;
          audioElement.load();
          return;
        }

        try {
          // @ts-ignore
          const module = await import("https://cdn.jsdelivr.net/npm/hls.js@1.5.0/dist/hls.min.js");
          const Hls = (module.default || module) as any;

          if (Hls.isSupported()) {
            hlsInstance = new Hls();
            hlsInstance.attachMedia(audioElement);
            hlsInstance.on(Hls.Events.MEDIA_ATTACHED, () => {
              if (!canceled) {
                hlsInstance?.loadSource(playbackUrl);
              }
            });
            hlsInstance.on(Hls.Events.MANIFEST_PARSED, () => {
              if (canceled) return;
              setAudioReady(true);
              setAudioLoading(false);
              setAudioLoadError("");
            });
            hlsInstance.on(Hls.Events.ERROR, (_event: any, data: any) => {
              console.error("Error reproduciendo audio HLS:", data);
              if (!canceled) {
                setAudioReady(false);
                setAudioLoading(false);
                setAudioLoadError("No se pudo cargar el audio HLS en este navegador.");
              }
            });
          } else {
            audioElement.src = "";
            setAudioReady(false);
            setAudioLoading(false);
            setAudioLoadError("El navegador no soporta reproducción HLS.");
          }
        } catch (err) {
          console.error("No se pudo cargar hls.js:", err);
          if (!canceled) {
            setAudioReady(false);
            setAudioLoading(false);
            setAudioLoadError("No se pudo cargar el reproductor HLS.");
          }
        }
      } else {
        audioElement.src = playbackUrl;
        audioElement.load();
      }
    };

    void setupAudio();

    return () => {
      canceled = true;
      cleanupAudioListeners();
      if (hlsInstance) {
        hlsInstance.destroy();
      }
    };
  }, [audioUrl]);

  const handleTogglePlay = () => {
    if (useYoutubeAudioFallback) {
      if (!youtubeEmbedUrl) return;
      if (youtubeAudioSrc) {
        setYoutubeAudioSrc(null);
        setYoutubeAudioPlaying(false);
        setIsPlaying(false);
        return;
      }

      setYoutubeAudioSrc(`${youtubeEmbedUrl}&autoplay=1`);
      setYoutubeAudioPlaying(true);
      setIsPlaying(true);
      return;
    }

    if (useKickIframeFallback) {
      if (!kickIframeUrl) return;
      if (kickIframeSrc) {
        setKickIframeSrc(null);
        setKickIframePlaying(false);
        setIsPlaying(false);
        return;
      }

      setKickIframeSrc(`${kickIframeUrl}?autoplay=1`);
      setKickIframePlaying(true);
      setIsPlaying(true);
      return;
    }

    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
      return;
    }

    const playPromise = audioRef.current.play();
    if (playPromise instanceof Promise) {
      playPromise
        .then(() => setIsPlaying(true))
        .catch((error) => {
          console.error("Error reproduciendo audio:", error);
          setAudioLoadError("No se pudo reproducir el audio en este navegador.");
          setIsPlaying(false);
        });
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  const estado = kickData?.isLive
    ? { label: "Conectado", conectado: true }
    : { label: "Desconectado", conectado: false };

  const handlePortada = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const localUrl = URL.createObjectURL(file);
    setOriginalCoverSource(localUrl);
    setCropImageUrl(localUrl);
    setCropOpen(true);
    e.target.value = "";
  };

  const aplicarPortadaRecortada = async (file: File) => {
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
    setStreamProvider(t?.streamProvider ?? "kick");
    setYoutubeChannelId(t?.youtubeChannelId ?? null);
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
        body: JSON.stringify({ streamUrl, streamProvider, tipoTransmision, imagenPortada }),
      });
      if (!res.ok) {
        let message = "Error al guardar";
        try {
          const data = await res.json();
          if (data?.message) message = data.message;
        } catch {
          // Si la API no devuelve JSON, dejamos el mensaje genérico.
        }
        throw new Error(message);
      }

      let payload: {
        streamUrl: string;
        streamProvider: string;
        tipoTransmision: string;
        imagenPortada: string;
        youtubeChannelId?: string | null;
      } = { streamUrl, streamProvider, tipoTransmision, imagenPortada };
      try {
        const data = await res.json();
        if (data && typeof data === "object") {
          payload = { ...payload, ...data };
        }
      } catch {}

      try {
        localStorage.setItem("streamUrl", streamUrl);
        localStorage.setItem("streamProvider", streamProvider);
        localStorage.setItem("tipoTransmision", tipoTransmision);
        localStorage.setItem("imagenPortada", imagenPortada);
      } catch {}

      if (payload.streamUrl) {
        setStreamUrl(payload.streamUrl);
      }
      if (payload.streamProvider) {
        setStreamProvider(payload.streamProvider);
      }
      setYoutubeChannelId(payload.youtubeChannelId ?? null);
      if (payload.tipoTransmision) {
        setTipoTransmision(payload.tipoTransmision);
      }
      if (payload.imagenPortada) {
        setImagenPortada(payload.imagenPortada);
      }

      setSuccess(true);
      try {
        window.dispatchEvent(new CustomEvent("tenantUpdated", {
          detail: payload,
        }));
      } catch {}
    } catch (err) {
      setError(
        err instanceof Error && err.message
          ? err.message
          : "No se pudo guardar. Revisá la URL e intentá de nuevo.",
      );
    } finally {
      setLoading(false);
    }
  };


  return (
    <Box>
      {/* Encabezado */}
      <Box sx={ { display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 2, mb: 4 } }>
        <Box>
          <Typography variant="h4" gutterBottom>Streaming</Typography>
          <Typography color="text.secondary" sx={ { maxWidth: 560 } }>
            Gestioná puntos finales, URLs de ingesta y monitoreá la salud de la señal en vivo.
          </Typography>
        </Box>
        <Card variant="outlined" sx={ { px: 2, py: 1 } }>
            <Box sx={ { display: "flex", alignItems: "center", gap: 1.5 } }>
            <Typography sx={ { fontSize: 11, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "text.secondary", fontFamily: "monospace" } }>
              Estado de Señal
            </Typography>
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
              Link de Stream
            </Typography>
            <TextField
              placeholder="Poné tu link de Kick, Twitch o YouTube"
              value={streamUrl}
              onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
                const value = e.target.value;
                const detectedProvider = detectarProveedor(value);
                setStreamUrl(value);
                if (detectedProvider) setStreamProvider(detectedProvider);
                setSuccess(false);
              }}
              fullWidth
              size="small"
              sx={{
                mb: streamProvider === "youtube" ? 1 : 3,
                '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: 13 },
              }}
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 3 }}>
              Poné tu link de Kick, Twitch o YouTube.
            </Typography>

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
                    Imagen de Portada · Recomendado: 1920x1080px
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
                      <>
                        <Button size="small" variant="outlined" onClick={() => { setCropImageUrl(originalCoverSource || imagenPortada); setCropOpen(true); }} sx={ { fontSize: 11, letterSpacing: 0.5 } }>
                          Editar
                        </Button>
                        <Button size="small" color="error" onClick={() => { setImagenPortada(""); setSuccess(false); }} sx={ { fontSize: 11, letterSpacing: 0.5 } }>
                          Eliminar
                        </Button>
                      </>
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
            {!esPodcast && streamProvider === "twitch" ? (
              embedUrl ? (
                <Box sx={ { position: "relative", width: "100%", aspectRatio: "16 / 9", borderRadius: 1, overflow: "hidden", border: "1px solid", borderColor: "divider" } }>
                  <Box
                    component="iframe"
                    src={embedUrl}
                    title="Vista previa del stream de Twitch"
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
                    p: 2, textAlign: "center",
                  } }
                >
                  <Typography sx={ { fontSize: 28, opacity: 0.4 } }>
                    <span className="material-symbols-outlined">live_tv</span>
                  </Typography>
                  <Typography sx={ { fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" } }>
                    Ingresá un canal de Twitch
                  </Typography>
                </Box>
              )
            ) : !esPodcast && streamProvider === "youtube" ? (
              youtubeEmbedUrl ? (
                <Box sx={ { position: "relative", width: "100%", aspectRatio: "16 / 9", borderRadius: 1, overflow: "hidden", border: "1px solid", borderColor: "divider" } }>
                  <Box
                    component="iframe"
                    src={youtubeEmbedUrl}
                    title="Vista previa del stream de YouTube"
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
                    p: 2, textAlign: "center",
                  } }
                >
                  <Typography sx={ { fontSize: 28, opacity: 0.4 } }>
                    <span className="material-symbols-outlined">smart_display</span>
                  </Typography>
                  <Typography sx={ { fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase" } }>
                    Guardá para previsualizar
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    YouTube resuelve el video en vivo recién después de guardar el link del canal.
                  </Typography>
                </Box>
              )
            ) : !esPodcast && embedUrl ? (
              <Box sx={ { position: "relative", width: "100%", aspectRatio: "16 / 9", borderRadius: 1, overflow: "hidden", border: "1px solid", borderColor: "divider" } }>
                <Box
                  component="iframe"
                  src={embedUrl}
                  title="Vista previa del stream"
                  allow="autoplay; fullscreen; picture-in-picture"
                  sx={ { position: "absolute", inset: 0, width: "100%", height: "100%", border: "none" } }
                />
              </Box>
            ) : esPodcast ? (
              useYoutubeAudioFallback ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Box
                    sx={{
                      position: "relative",
                      width: "100%",
                      aspectRatio: "16 / 9",
                      borderRadius: 1,
                      overflow: "hidden",
                      border: "1px solid",
                      borderColor: "divider",
                      bgcolor: "action.hover",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    onClick={handleTogglePlay}
                  >
                    {imagenPortada ? (
                      <Box
                        component="img"
                        src={imagenPortada}
                        alt="Portada del podcast"
                        sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          bgcolor: "action.hover",
                        }}
                      >
                        <Typography sx={{ fontSize: 48, opacity: 0.15 }}>
                          <span className="material-symbols-outlined">podcasts</span>
                        </Typography>
                      </Box>
                    )}
                    <Box
                      sx={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "linear-gradient(180deg, rgba(0,0,0,0.12), rgba(0,0,0,0.5))",
                      }}
                    >
                      <Box
                        sx={{
                          width: 66,
                          height: 66,
                          borderRadius: "50%",
                          bgcolor: "rgba(0,0,0,0.7)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          fontSize: 32,
                        }}
                      >
                        <span className="material-symbols-outlined">
                          {youtubeAudioPlaying ? "pause" : "play_arrow"}
                        </span>
                      </Box>
                    </Box>
                  </Box>

                  {/* Iframe de YouTube realmente oculto: sigue sonando pero no se ve el video */}
                  {youtubeAudioSrc && (
                    <Box
                      component="iframe"
                      src={youtubeAudioSrc}
                      title="YouTube audio player"
                      allow="autoplay; encrypted-media"
                      sx={{
                        position: "absolute",
                        width: "1px",
                        height: "1px",
                        opacity: 0,
                        overflow: "hidden",
                        pointerEvents: "none",
                        border: "none",
                      }}
                    />
                  )}

                  <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                      {youtubeAudioPlaying ? "Reproduciendo audio de YouTube" : "Tocá la portada para reproducir"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      YouTube no permite extraer solo el audio: se reproduce el video oficial de YouTube oculto en segundo plano, así que solo se escucha.
                    </Typography>
                  </Box>
                </Box>
              ) : useKickIframeFallback ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Box
                    sx={{
                      position: "relative",
                      width: "100%",
                      aspectRatio: "16 / 9",
                      borderRadius: 1,
                      overflow: "hidden",
                      border: "1px solid",
                      borderColor: "divider",
                      bgcolor: "action.hover",
                      cursor: kickIframeUrl ? "pointer" : "default",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    onClick={() => {
                      if (!kickIframeUrl) return;
                      handleTogglePlay();
                    }}
                  >
                    {imagenPortada ? (
                      <Box
                        component="img"
                        src={imagenPortada}
                        alt="Portada del podcast"
                        sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          bgcolor: "action.hover",
                        }}
                      >
                        <Typography sx={{ fontSize: 48, opacity: 0.15 }}>
                          <span className="material-symbols-outlined">podcasts</span>
                        </Typography>
                      </Box>
                    )}
                    <Box
                      sx={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "linear-gradient(180deg, rgba(0,0,0,0.12), rgba(0,0,0,0.5))",
                      }}
                    >
                      <Box
                        sx={{
                          width: 66,
                          height: 66,
                          borderRadius: "50%",
                          bgcolor: "rgba(0,0,0,0.7)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          fontSize: 32,
                        }}
                      >
                        <span className="material-symbols-outlined">
                          {kickIframePlaying ? "pause" : "play_arrow"}
                        </span>
                      </Box>
                    </Box>

                    {kickIframeSrc && (
                      <Box
                        sx={{
                          position: "absolute",
                          inset: 0,
                          width: "100%",
                          height: "100%",
                        }}
                      >
                        <Box
                          component="iframe"
                          src={kickIframeSrc}
                          title="Kick audio player"
                          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                          sx={{ width: "100%", height: "100%", border: "none", pointerEvents: "none" }}
                        />
                      </Box>
                    )}
                  </Box>

                  <Box sx={{ mt: 2, display: "flex", flexDirection: "column", gap: 1 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
                      {kickIframePlaying ? "Reproduciendo audio Kick" : "Tocá la portada para reproducir"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      El audio se reproduce con el iframe oficial de Kick.
                    </Typography>
                    {!kickIframeUrl && (
                      <Typography variant="caption" color="error">
                        No se pudo detectar el canal Kick en la URL.
                      </Typography>
                    )}
                  </Box>
                </Box>
              ) : audioUrl ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Box
                    sx={{
                      position: "relative",
                      width: "100%",
                      aspectRatio: "16 / 9",
                      borderRadius: 1,
                      overflow: "hidden",
                      border: "1px solid",
                      borderColor: "divider",
                      bgcolor: "action.hover",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                    onClick={() => {
                      if (audioLoading) return;
                      if (isHlsStream && !audioReady) return;
                      handleTogglePlay();
                    }}
                  >
                    {imagenPortada ? (
                      <Box
                        component="img"
                        src={imagenPortada}
                        alt="Portada del podcast"
                        sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                      />
                    ) : (
                      <Box
                        sx={{
                          width: "100%",
                          height: "100%",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          bgcolor: "action.hover",
                        }}
                      >
                        <Typography sx={{ fontSize: 48, opacity: 0.15 }}>
                          <span className="material-symbols-outlined">podcasts</span>
                        </Typography>
                      </Box>
                    )}
                    <Box
                      sx={{
                        position: "absolute",
                        inset: 0,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        background: "linear-gradient(180deg, rgba(0,0,0,0.12), rgba(0,0,0,0.5))",
                      }}
                    >
                      <Box
                        sx={{
                          width: 66,
                          height: 66,
                          borderRadius: "50%",
                          bgcolor: "rgba(0,0,0,0.7)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          color: "white",
                          fontSize: 32,
                        }}
                      >
                        <span className="material-symbols-outlined">
                          {isPlaying ? "pause" : "play_arrow"}
                        </span>
                      </Box>
                    </Box>
                  </Box>

                  <audio
                    ref={audioRef}
                    controls
                    preload="metadata"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onEnded={handleAudioEnded}
                    onError={() => setAudioLoadError("No se pudo cargar el audio.")}
                    style={{ width: "100%", marginTop: 16, borderRadius: 8 }}
                  />

                  <Box sx={{ mt: 1 }}>
                    <Typography sx={{ fontSize: 14, fontWeight: 700, mb: 0.5 }}>
                      {audioLoading
                        ? "Cargando audio..."
                        : isPlaying
                        ? "Reproduciendo"
                        : isHlsStream && !audioReady
                        ? "Preparando audio HLS..."
                        : "Tocá la portada para reproducir"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Reproduciendo audio directo desde la URL.
                    </Typography>
                    {audioLoadError && (
                      <Typography variant="caption" color="error" sx={{ display: "block" }}>
                        {audioLoadError}
                      </Typography>
                    )}
                  </Box>
                </Box>
              ) : (
                <Box
                  sx={ {
                    position: "relative", width: "100%", aspectRatio: "16 / 9",
                    borderRadius: 1, overflow: "hidden", border: "1px solid", borderColor: "divider",
                    bgcolor: "action.hover",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    p: 2,
                  } }
                >
                  <Box sx={{ textAlign: "center" }}>
                    <Typography sx={ { fontSize: 32, opacity: 0.4 } }>
                      <span className="material-symbols-outlined">volume_off</span>
                    </Typography>
                    <Typography sx={ { fontSize: 14, fontWeight: 700, mb: 1 } }>
                      Audio directo no disponible
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Para reproducir solo audio necesitás una URL de archivo o stream de audio directo compatible con el navegador.
                    </Typography>
                    {!audioUrl && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                        Ingresa una URL válida de audio (mp3/aac/m4a/ogg/wav/flac/opus).
                      </Typography>
                    )}
                    {audioUrl && isHlsStream && !audioReady && !audioLoading && (
                      <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                        La URL es HLS y se está preparando para reproducción.
                      </Typography>
                    )}
                  </Box>
                </Box>
              )
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

      <ImageCropDialog
        open={cropOpen}
        imageUrl={cropImageUrl}
        type="cover"
        fileName="portada-stream.jpg"
        onClose={() => {
          setCropImageUrl(null);
          setCropOpen(false);
        }}
        onConfirm={async (file) => {
          setCropImageUrl(null);
          setCropOpen(false);
          await aplicarPortadaRecortada(file);
        }}
      />

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