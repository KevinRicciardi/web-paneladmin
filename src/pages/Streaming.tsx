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
import { getCachedAuthHeaders } from "../services/authenticatedFetch";
import { auth } from "../firebase";
import ImageCropDialog from "../components/ImageCropDialog";
import type { Perfil } from "../types";
import { puedeVerSeccion } from "../utils/permisos";
import { extractKickChannelName, getKickAudioUrl } from "../services/kick.service";
import { detectStreamingPlatform, getAutoplayStreamingEmbedUrl, getDirectAudioUrl, getStreamingEmbedUrl, getStreamingPlatformLabel, isDirectVideoUrl } from "../services/streaming-media";
import { buildYoutubeChannelEmbedUrl } from "../services/youtube.service";
import { getSignalStatus, getStreamData, type StreamData } from "../services/stream.service";

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

export default function Streaming({ perfil }: { perfil: Perfil }) {
  const canViewStreaming = puedeVerSeccion(perfil, "streaming");
  const canViewPodcast = puedeVerSeccion(perfil, "podcast");
  const t = perfil.tenant;
  const [streamUrl, setStreamUrl] = useState<string>(() => (
    t?.tipoTransmision === "audio" ? t.podcastUrl || t.streamUrl : t?.streamUrl
  ) ?? "");
  const [streamProvider, setStreamProvider] = useState<string>(() => {
    const valor = (t?.tipoTransmision === "audio" ? t.podcastProvider || t.streamProvider : t?.streamProvider)
      ?? "";
    return valor || "kick";
  });
  const [youtubeChannelId, setYoutubeChannelId] = useState<string | null>(() => t?.youtubeChannelId ?? null);
  const [streamStatusData, setStreamStatusData] = useState<StreamData | null>(null);
  const [signalLoading, setSignalLoading] = useState(true);
  const [kickAudioUrl, setKickAudioUrl] = useState<string | null>(null);
  const [tipoTransmision, setTipoTransmision] = useState<string>(() => {
    const valor = t?.tipoTransmision ?? "";
    return valor || "video";
  });
  const [imagenPortada, setImagenPortada] = useState<string>(() => (
    t?.tipoTransmision === "audio" ? t.podcastImagenPortada || t.imagenPortada : t?.imagenPortada
  ) ?? "");
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
  const [externalAudioSrc, setExternalAudioSrc] = useState<string | null>(null);
  const [externalAudioPlaying, setExternalAudioPlaying] = useState(false);
  const [cropOpen, setCropOpen] = useState(false);
  const [cropImageUrl, setCropImageUrl] = useState<string | null>(null);
  const [originalCoverSource, setOriginalCoverSource] = useState<string | null>(null);
  const portadaInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const esPodcast = tipoTransmision === "audio";
  const embedUrl = streamUrl ? getStreamingEmbedUrl(streamUrl) : null;
  const plataforma = streamProvider === "youtube"
    ? "YouTube"
    : streamProvider === "twitch"
    ? "Twitch"
    : streamUrl
    ? getStreamingPlatformLabel(streamUrl)
    : null;
  const youtubeEmbedUrl = buildYoutubeChannelEmbedUrl(youtubeChannelId);
  const channelName = streamUrl ? extractKickChannelName(streamUrl) : null;
  const rawAudioUrl = kickAudioUrl || (streamUrl ? getDirectAudioUrl(streamUrl) : null);
  const directVideoUrl = esPodcast && streamUrl && isDirectVideoUrl(streamUrl) ? streamUrl : null;
  const isHlsStream = rawAudioUrl ? isHlsUrl(rawAudioUrl) : false;
  const audioUrl = rawAudioUrl;
  const useKickIframeFallback = esPodcast && Boolean(channelName) && !audioUrl;
  const kickIframeUrl = useKickIframeFallback && channelName ? `https://player.kick.com/${channelName}` : null;
  const externalAudioUrl = streamProvider === "youtube"
    ? youtubeEmbedUrl ? `${youtubeEmbedUrl}&autoplay=1&playsinline=1` : null
    : getAutoplayStreamingEmbedUrl(streamUrl, detectStreamingPlatform(streamUrl));
  const useExternalAudioFallback = esPodcast && Boolean(externalAudioUrl)
    && (streamProvider === "youtube" || streamProvider === "twitch");

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !directVideoUrl) return;
    video.src = directVideoUrl;
    video.load();
    return () => {
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [directVideoUrl]);

  useEffect(() => {
    if (!useKickIframeFallback) {
      setKickIframeSrc(null);
      setKickIframePlaying(false);
      setIsPlaying(false);
    }
  }, [useKickIframeFallback]);

  useEffect(() => {
    if (!useExternalAudioFallback) {
      setExternalAudioSrc(null);
      setExternalAudioPlaying(false);
    }
  }, [useExternalAudioFallback]);

  useEffect(() => {
    const podcastMode = t?.tipoTransmision === "audio";
    const configuredUrl = podcastMode ? t?.podcastUrl || t?.streamUrl : t?.streamUrl;
    setStreamUrl(configuredUrl ?? "");

    const configuredProvider = podcastMode ? t?.podcastProvider || t?.streamProvider : t?.streamProvider;
    setStreamProvider(configuredProvider || "kick");

    setYoutubeChannelId(t?.youtubeChannelId ?? null);

    if (t?.tipoTransmision) {
      setTipoTransmision(t.tipoTransmision);
    } else {
      setTipoTransmision("video");
    }

    setImagenPortada(podcastMode ? t?.podcastImagenPortada || t?.imagenPortada || "" : t?.imagenPortada ?? "");
  }, [t?.streamUrl, t?.streamProvider, t?.youtubeChannelId, t?.tipoTransmision, t?.imagenPortada, t?.podcastUrl, t?.podcastProvider, t?.podcastImagenPortada]);

  useEffect(() => {
    let active = true;
    let intervalId: ReturnType<typeof setInterval> | null = null;

    const refreshProviderStreamData = async () => {
      if (!streamUrl || !streamProvider || streamProvider === "direct" || streamProvider === "other" || !perfil.tenant?.slug) {
        setStreamStatusData(null);
        setSignalLoading(false);
        return;
      }

      try {
        const data = await getStreamData(streamUrl, streamProvider as "kick" | "youtube" | "twitch", perfil.tenant.slug);
        if (!active) return;

        setStreamStatusData(data);

        if ((data?.isLive || streamProvider === "youtube") && !intervalId) {
          intervalId = setInterval(refreshProviderStreamData, streamProvider === "kick" ? 1000 : 30_000);
        }

        if (!data?.isLive && intervalId) {
          clearInterval(intervalId);
          intervalId = null;
        }
      } catch (error) {
        console.error(`Error fetching ${streamProvider} stream status:`, error);
      } finally {
        if (active) setSignalLoading(false);
      }
    };

    setSignalLoading(true);
    void refreshProviderStreamData();

    return () => {
      active = false;
      if (intervalId) clearInterval(intervalId);
    };
  }, [perfil.tenant?.slug, perfil.tenant?.youtubeChannelId, streamProvider, streamUrl]);

  useEffect(() => {
    const fetchKickAudio = async () => {
      if (!channelName || !esPodcast) {
        setKickAudioUrl(null);
        return;
      }

      try {
        const token = await auth.currentUser?.getIdToken();
        const audioUrl = await getKickAudioUrl(channelName, token);
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
              if (!canceled && data.fatal) {
                setAudioReady(false);
                setAudioLoading(false);
                setAudioLoadError("Falló la señal HLS. Revisá que la playlist y sus segmentos permitan CORS desde el panel.");
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
    if (directVideoUrl && videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        setIsPlaying(false);
      } else {
        void videoRef.current.play()
          .then(() => setIsPlaying(true))
          .catch(() => {
            setAudioLoadError("No se pudo reproducir el video en este navegador.");
            setIsPlaying(false);
          });
      }
      return;
    }

    if (useExternalAudioFallback) {
      if (!externalAudioUrl) return;
      if (externalAudioSrc) {
        setExternalAudioSrc(null);
        setExternalAudioPlaying(false);
        setIsPlaying(false);
        return;
      }

      setExternalAudioSrc(externalAudioUrl);
      setExternalAudioPlaying(true);
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

  const estado = getSignalStatus(streamProvider, streamStatusData);

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
    const podcastMode = t?.tipoTransmision === "audio";
    setStreamUrl(podcastMode ? t?.podcastUrl || t?.streamUrl || "" : t?.streamUrl ?? "");
    setStreamProvider(podcastMode ? t?.podcastProvider || t?.streamProvider || "direct" : t?.streamProvider ?? "kick");
    setYoutubeChannelId(t?.youtubeChannelId ?? null);
    setTipoTransmision(t?.tipoTransmision ?? "video");
    setImagenPortada(podcastMode ? t?.podcastImagenPortada || t?.imagenPortada || "" : t?.imagenPortada ?? "");
    setSuccess(false);
    setError("");
  };

  const handleGuardar = async () => {
    setLoading(true);
    setSuccess(false);
    setError("");
    try {
      const tenantPayload = {
        streamUrl,
        streamProvider,
        tipoTransmision,
        imagenPortada,
        ...(esPodcast ? {
          podcastUrl: streamUrl,
          podcastProvider: streamProvider,
          podcastImagenPortada: imagenPortada,
        } : {}),
      };
      const token = (await getCachedAuthHeaders()).Authorization.slice("Bearer ".length);
      const res = await fetch(`${API_URL}/tenants/mi-tenant`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(tenantPayload),
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
        podcastUrl?: string;
        podcastProvider?: string;
        podcastImagenPortada?: string;
        youtubeChannelId?: string | null;
      } = tenantPayload;
      try {
        const data = await res.json();
        if (data && typeof data === "object") {
          payload = { ...payload, ...data };
        }
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
      {(canViewStreaming || canViewPodcast) && <>
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
            {!signalLoading && (
              <Chip
                label={estado.label.toUpperCase()}
                size="small"
                color={estado.conectado ? "success" : "default"}
                variant={estado.conectado ? "filled" : "outlined"}
                sx={ { fontSize: 11, fontWeight: 700, letterSpacing: 0.5 } }
              />
            )}
          </Box>
        </Card>
      </Box>

      <Box sx={ { display: "grid", gridTemplateColumns: { xs: "1fr", md: "minmax(0, 7fr) minmax(280px, 5fr)" }, gap: 3, alignItems: "start" } }>

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
                const detectedProvider = detectStreamingPlatform(value);
                setStreamUrl(value);
                if (isDirectVideoUrl(value) || getDirectAudioUrl(value)) {
                  setStreamProvider("direct");
                } else if (detectedProvider !== "direct" && detectedProvider !== "other") {
                  setStreamProvider(detectedProvider);
                }
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
                    onClick={() => {
                      const nextIsPodcast = op.val === "audio";
                      setTipoTransmision(op.val);
                      if (nextIsPodcast) {
                        setStreamUrl(t?.podcastUrl || t?.streamUrl || "");
                        setStreamProvider(t?.podcastProvider || t?.streamProvider || "direct");
                        setImagenPortada(t?.podcastImagenPortada || t?.imagenPortada || "");
                      } else {
                        setStreamUrl(t?.streamUrl ?? "");
                        setStreamProvider(t?.streamProvider ?? "kick");
                        setImagenPortada(t?.imagenPortada ?? "");
                      }
                      setSuccess(false);
                    }}
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
              useExternalAudioFallback ? (
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
                          {externalAudioPlaying ? "pause" : "play_arrow"}
                        </span>
                      </Box>
                    </Box>
                  </Box>

                  {externalAudioSrc && (
                    <Box
                      component="iframe"
                      src={externalAudioSrc}
                      title={`${streamProvider} audio player`}
                      allow="autoplay; encrypted-media; picture-in-picture"
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
                      {externalAudioPlaying ? `Reproduciendo audio de ${streamProvider}` : "Tocá la portada para reproducir"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Se usa el reproductor oficial oculto en segundo plano; la portada permanece visible.
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
                        component="iframe"
                        src={kickIframeSrc}
                        title="Kick audio player"
                        allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                        sx={{ position: "fixed", left: -10000, width: 1, height: 1, opacity: 0, pointerEvents: "none", border: "none" }}
                      />
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
              ) : directVideoUrl ? (
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <Box
                    role="button"
                    tabIndex={0}
                    aria-label={isPlaying ? "Pausar video" : "Reproducir video"}
                    onClick={handleTogglePlay}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        handleTogglePlay();
                      }
                    }}
                    sx={{ position: "relative", width: "100%", aspectRatio: "16 / 9", borderRadius: 1, overflow: "hidden", border: 1, borderColor: "divider", bgcolor: "action.hover", cursor: "pointer", display: "grid", placeItems: "center" }}
                  >
                    {imagenPortada ? (
                      <Box component="img" src={imagenPortada} alt="Portada del podcast" sx={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : <span className="material-symbols-outlined" style={{ fontSize: 48, opacity: 0.3 }}>podcasts</span>}
                    <Box sx={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "linear-gradient(180deg, rgba(0,0,0,0.08), rgba(0,0,0,0.42))" }}>
                      <Box sx={{ width: 58, height: 58, borderRadius: "50%", bgcolor: "rgba(0,0,0,0.72)", display: "grid", placeItems: "center", color: "white" }}>
                        <span className="material-symbols-outlined">{isPlaying ? "pause" : "play_arrow"}</span>
                      </Box>
                    </Box>
                    <video ref={videoRef} playsInline preload="metadata" aria-hidden="true" tabIndex={-1} onPlay={() => setIsPlaying(true)} onPause={() => setIsPlaying(false)} onEnded={handleAudioEnded} onError={() => setAudioLoadError("No se pudo cargar el video directo.")} style={{ position: "fixed", left: -10000, width: 1, height: 1, opacity: 0, pointerEvents: "none" }} />
                  </Box>
                  <Typography sx={{ fontSize: 14, fontWeight: 700 }}>{isPlaying ? "Reproduciendo audio del video" : "Tocá la portada para reproducir"}</Typography>
                  <Typography variant="caption" color="text.secondary">El video permanece oculto; la portada se mantiene visible y el audio continúa en segundo plano.</Typography>
                  {audioLoadError && <Typography variant="caption" color="error">{audioLoadError}</Typography>}
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
      </>}
      {!canViewStreaming && !canViewPodcast && <Alert severity="error">No tenés permisos para acceder a esta sección.</Alert>}
    </Box>
  );
}