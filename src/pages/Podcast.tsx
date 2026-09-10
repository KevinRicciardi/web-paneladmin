import { useEffect, useRef, useState } from "react";
import {
  Alert, Box, Button, Card, CardContent, Chip, CircularProgress, Dialog,
  DialogActions, DialogContent, DialogTitle, IconButton, Slider, Stack,
  TextField, Typography,
} from "@mui/material";
import type { Perfil, PodcastEpisode, PodcastEpisodePayload, PodcastEpisodeStatus } from "../types";
import {
  actualizarPodcast, crearPodcast, eliminarPodcast, listarMisPodcasts,
} from "../services/podcast.service";
import { auth } from "../firebase";
import { extractKickChannelName, getKickAudioUrl } from "../services/kick.service";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

const emptyForm: PodcastEpisodePayload = {
  title: "", description: "", podcastName: "", coverImageUrl: "", audioUrl: "",
  duration: "", publishedAt: "", status: "draft",
};

function formatTime(value: number) {
  if (!Number.isFinite(value)) return "00:00";
  const minutes = Math.floor(value / 60);
  const seconds = Math.floor(value % 60).toString().padStart(2, "0");
  return `${minutes.toString().padStart(2, "0")}:${seconds}`;
}

function isHlsUrl(url: string) {
  return url.trim().toLowerCase().split(/[?#]/)[0].endsWith(".m3u8");
}

function canPlayHlsNatively() {
  if (typeof document === "undefined") return false;
  const audio = document.createElement("audio");
  return audio.canPlayType("application/vnd.apple.mpegurl") !== "";
}

export default function Podcast({ perfil }: { perfil: Perfil }) {
  const tenantId = perfil.tenantId;
  const [liveUrl, setLiveUrl] = useState(perfil.tenant.podcastUrl ?? "");
  const [liveProvider, setLiveProvider] = useState(perfil.tenant.podcastProvider ?? "direct");
  const [liveCover, setLiveCover] = useState(perfil.tenant.podcastImagenPortada ?? "");
  const [liveSaving, setLiveSaving] = useState(false);
  const [livePlaying, setLivePlaying] = useState(false);
  const [liveResolvedUrl, setLiveResolvedUrl] = useState("");
  const [liveLoading, setLiveLoading] = useState(false);
  const [liveReady, setLiveReady] = useState(false);
  const liveAudioRef = useRef<HTMLAudioElement>(null);
  const liveHlsRef = useRef<any>(null);
  const [episodes, setEpisodes] = useState<PodcastEpisode[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [form, setForm] = useState<PodcastEpisodePayload>(emptyForm);
  const [editing, setEditing] = useState<PodcastEpisode | null>(null);
  const [saving, setSaving] = useState(false);
  const [episodeToDelete, setEpisodeToDelete] = useState<PodcastEpisode | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [current, setCurrent] = useState<PodcastEpisode | null>(null);
  const [playing, setPlaying] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [playbackError, setPlaybackError] = useState("");

  const loadEpisodes = async () => {
    setLoading(true);
    setError("");
    try { setEpisodes(await listarMisPodcasts(tenantId)); }
    catch { setError("No se pudieron cargar los episodios."); }
    finally { setLoading(false); }
  };

  useEffect(() => { void loadEpisodes(); }, [tenantId]);

  useEffect(() => {
    setLiveUrl(perfil.tenant.podcastUrl ?? "");
    setLiveProvider(perfil.tenant.podcastProvider ?? "direct");
    setLiveCover(perfil.tenant.podcastImagenPortada ?? "");
  }, [perfil.tenant.podcastUrl, perfil.tenant.podcastProvider, perfil.tenant.podcastImagenPortada]);

  useEffect(() => {
    let canceled = false;
    const resolveLiveAudio = async () => {
      const channelName = extractKickChannelName(liveUrl);
      if (!channelName) {
        setLiveResolvedUrl(liveUrl.trim());
        return;
      }

      setLiveLoading(true);
      setLiveResolvedUrl("");
      const resolvedUrl = await getKickAudioUrl(channelName);
      if (!canceled) {
        setLiveResolvedUrl(resolvedUrl ?? "");
        setLiveLoading(false);
      }
    };

    void resolveLiveAudio();
    return () => { canceled = true; };
  }, [liveUrl]);

  useEffect(() => {
    const audio = liveAudioRef.current;
    if (!audio || !liveResolvedUrl) {
      setLiveReady(false);
      return;
    }

    let canceled = false;
    setLiveReady(false);
    liveHlsRef.current?.destroy();
    liveHlsRef.current = null;

    const prepareAudio = async () => {
      if (!isHlsUrl(liveResolvedUrl) || canPlayHlsNatively()) {
        audio.src = liveResolvedUrl;
        audio.load();
        if (!canceled) setLiveReady(true);
        return;
      }

      try {
        // @ts-ignore El reproductor HLS se carga solo para streams en vivo HLS.
        const module = await import("https://cdn.jsdelivr.net/npm/hls.js@1.5.0/dist/hls.min.js");
        const Hls = (module.default || module) as any;
        if (!Hls.isSupported() || canceled) {
          if (!canceled) setError("Este navegador no soporta la señal HLS en vivo.");
          return;
        }
        const hls = new Hls();
        liveHlsRef.current = hls;
        hls.attachMedia(audio);
        hls.on(Hls.Events.MEDIA_ATTACHED, () => hls.loadSource(liveResolvedUrl));
        hls.on(Hls.Events.MANIFEST_PARSED, () => { if (!canceled) setLiveReady(true); });
        hls.on(Hls.Events.ERROR, () => { if (!canceled) setError("No se pudo cargar la señal en vivo de Kick."); });
      } catch {
        if (!canceled) setError("No se pudo preparar el audio en vivo.");
      }
    };

    void prepareAudio();
    return () => {
      canceled = true;
      audio.pause();
      liveHlsRef.current?.destroy();
      liveHlsRef.current = null;
    };
  }, [liveResolvedUrl]);

  const saveLiveConfig = async () => {
    setLiveSaving(true);
    setError("");
    try {
      const token = await auth.currentUser?.getIdToken();
      const response = await fetch(`${API_URL}/tenants/mi-tenant`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ podcastUrl: liveUrl.trim(), podcastProvider: liveProvider, podcastImagenPortada: liveCover.trim() }),
      });
      if (!response.ok) throw new Error("No se pudo guardar la señal de Podcast.");
      setSuccess("Configuración de Podcast guardada.");
      window.dispatchEvent(new CustomEvent("tenantUpdated", { detail: { podcastUrl: liveUrl.trim(), podcastProvider: liveProvider, podcastImagenPortada: liveCover.trim() } }));
    } catch (saveError) {
      console.error(saveError);
      setError("No se pudo guardar la señal de Podcast. Verificá la URL e intentá nuevamente.");
    } finally { setLiveSaving(false); }
  };

  const toggleLivePreview = async () => {
    const audio = liveAudioRef.current;
    if (!audio || !liveResolvedUrl || !liveReady) {
      setError(liveLoading ? "Esperá mientras se conecta la señal en vivo." : "No se encontró una señal de audio activa para este canal.");
      return;
    }
    if (livePlaying) { audio.pause(); setLivePlaying(false); return; }
    audioRef.current?.pause();
    setPlaying(false);
    audio.src = liveResolvedUrl;
    try { await audio.play(); setLivePlaying(true); }
    catch { setError("No se pudo reproducir la señal en vivo. Verificá que el canal esté transmitiendo."); setLivePlaying(false); }
  };

  const openCreate = () => { setEditing(null); setForm(emptyForm); setError(""); };
  const openEdit = (episode: PodcastEpisode) => {
    setEditing(episode);
    setForm({
      ...episode,
      coverImageUrl: episode.coverImageUrl ?? "",
      duration: episode.duration ?? "",
      publishedAt: episode.publishedAt ?? "",
    });
  };
  const closeForm = () => { setEditing(null); setForm(emptyForm); };
  const updateField = (field: keyof PodcastEpisodePayload, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const saveEpisode = async () => {
    if (!form.title.trim() || !form.podcastName.trim() || !form.audioUrl.trim()) {
      setError("Completá título, nombre del podcast y URL del audio.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const saved = editing ? await actualizarPodcast(tenantId, editing.id, form) : await crearPodcast(tenantId, form);
      setEpisodes((prev) => editing
        ? prev.map((item) => item.id === saved.id ? saved : item)
        : [saved, ...prev]);
      setSuccess(editing ? "Episodio actualizado." : "Episodio creado.");
      closeForm();
    } catch { setError("No se pudo guardar el episodio."); }
    finally { setSaving(false); }
  };

  const playEpisode = async (episode: PodcastEpisode) => {
    const audio = audioRef.current;
    if (!audio) return;
    setPlaybackError("");
    liveAudioRef.current?.pause();
    setLivePlaying(false);
    if (current?.id === episode.id && playing) {
      audio.pause();
      setPlaying(false);
      return;
    }
    if (current?.id !== episode.id) {
      audio.src = episode.audioUrl;
      setCurrent(episode);
      setPosition(0);
    }
    try { await audio.play(); setPlaying(true); }
    catch { setPlaying(false); setPlaybackError("No se pudo reproducir este audio. Revisá la URL del episodio."); }
  };

  const deleteEpisode = async () => {
    if (!episodeToDelete) return;
    try {
      await eliminarPodcast(tenantId, episodeToDelete.id);
      setEpisodes((prev) => prev.filter((item) => item.id !== episodeToDelete.id));
      if (current?.id === episodeToDelete.id) {
        audioRef.current?.pause();
        setCurrent(null);
        setPlaying(false);
      }
      setSuccess("Episodio eliminado.");
      setEpisodeToDelete(null);
    } catch { setError("No se pudo eliminar el episodio."); }
  };

  return (
    <Box>
      <audio ref={liveAudioRef} onPause={() => setLivePlaying(false)} onEnded={() => setLivePlaying(false)} onError={() => { setLivePlaying(false); setError("La URL de la señal en vivo no está disponible."); }} />
      <audio
        ref={audioRef}
        preload="metadata"
        onLoadedMetadata={(event) => setDuration(event.currentTarget.duration)}
        onTimeUpdate={(event) => setPosition(event.currentTarget.currentTime)}
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
        onError={() => setPlaybackError("No se pudo cargar el audio seleccionado.")}
      />
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 2, mb: 3, flexWrap: "wrap" }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.75 }}>Podcast</Typography>
          <Typography color="text.secondary">Gestioná episodios de audio para tu aplicación.</Typography>
        </Box>
        <Button variant="contained" startIcon={<span className="material-symbols-outlined">add</span>} onClick={openCreate}>Nuevo episodio</Button>
      </Box>

      {(error || success || playbackError) && (
        <Stack spacing={1} sx={{ mb: 2 }}>
          {error && <Alert severity="error" onClose={() => setError("")}>{error}</Alert>}
          {playbackError && <Alert severity="error" onClose={() => setPlaybackError("")}>{playbackError}</Alert>}
          {success && <Alert severity="success" onClose={() => setSuccess("")}>{success}</Alert>}
        </Stack>
      )}

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", md: "7fr 5fr" }, gap: 3, alignItems: "start", mb: 4 }}>
        <Card variant="outlined">
          <CardContent>
            <Typography sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2, fontSize: 12, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "text.secondary", fontFamily: "monospace" }}>
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>podcasts</span>
              Señal de Podcast en vivo
            </Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: "text.secondary", mb: 1 }}>Link de audio en vivo</Typography>
            <TextField fullWidth size="small" value={liveUrl} onChange={(event) => setLiveUrl(event.target.value)} placeholder="https://servidor.com:puerto/stream.mp3" sx={{ mb: 1, "& .MuiInputBase-input": { fontFamily: "monospace", fontSize: 13 } }} />
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 3 }}>Usá una URL directa de audio MP3, AAC, M4A, WAV u otra compatible. No es un enlace de video.</Typography>
            <Typography sx={{ fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: "text.secondary", mb: 1 }}>Proveedor</Typography>
            <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", border: "1px solid", borderColor: "divider", mb: 3, borderRadius: 1, overflow: "hidden" }}>
              {[{ value: "direct", label: "Audio directo" }, { value: "icecast", label: "Icecast / Radio" }].map((option) => (
                <Box key={option.value} onClick={() => setLiveProvider(option.value)} sx={{ textAlign: "center", py: 1.25, cursor: "pointer", fontSize: 12, fontWeight: 700, letterSpacing: 0.5, textTransform: "uppercase", bgcolor: liveProvider === option.value ? "primary.main" : "transparent", color: liveProvider === option.value ? "primary.contrastText" : "text.primary", "&:hover": { bgcolor: liveProvider === option.value ? "primary.main" : "action.hover" } }}>{option.label}</Box>
              ))}
            </Box>
            <Typography sx={{ fontSize: 12, fontWeight: 600, letterSpacing: 1, textTransform: "uppercase", color: "text.secondary", mb: 1 }}>Imagen de portada</Typography>
            <TextField fullWidth size="small" value={liveCover} onChange={(event) => setLiveCover(event.target.value)} placeholder="https://.../portada.jpg" sx={{ mb: 3 }} />
            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1 }}>
              <Button variant="outlined" onClick={() => { setLiveUrl(perfil.tenant.podcastUrl ?? ""); setLiveProvider(perfil.tenant.podcastProvider ?? "direct"); setLiveCover(perfil.tenant.podcastImagenPortada ?? ""); }}>Descartar cambios</Button>
              <Button variant="contained" onClick={() => void saveLiveConfig()} disabled={liveSaving}>{liveSaving ? "Guardando..." : "Guardar configuración"}</Button>
            </Box>
          </CardContent>
        </Card>
        <Card variant="outlined" sx={{ overflow: "hidden" }}>
          <Box sx={{ px: 2, py: 1.25, borderBottom: "1px solid", borderColor: "divider" }}><Typography sx={{ fontSize: 12, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "text.secondary", fontFamily: "monospace" }}>Vista previa de la señal</Typography></Box>
          <CardContent>
            <Box sx={{ position: "relative", width: "100%", aspectRatio: "16 / 9", borderRadius: 1, overflow: "hidden", border: "1px solid", borderColor: "divider", bgcolor: "action.hover", backgroundImage: liveCover ? `url(${liveCover})` : undefined, backgroundSize: "cover", backgroundPosition: "center", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Box sx={{ position: "absolute", inset: 0, bgcolor: "rgba(0,0,0,0.35)" }} />
              <Button variant="contained" onClick={() => void toggleLivePreview()} disabled={!liveReady || liveLoading} startIcon={<span className="material-symbols-outlined">{livePlaying ? "pause" : "play_arrow"}</span>} sx={{ zIndex: 1 }}>{liveLoading ? "Conectando..." : livePlaying ? "Pausar señal" : "Reproducir señal"}</Button>
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1.5 }}>La vista previa reproduce solamente audio.</Typography>
          </CardContent>
        </Card>
      </Box>

      {loading ? <Box sx={{ display: "flex", justifyContent: "center", py: 10 }}><CircularProgress /></Box> : episodes.length === 0 ? (
        <Card variant="outlined"><CardContent sx={{ textAlign: "center", py: 8 }}>
          <Typography variant="h6" sx={{ fontWeight: 800 }}>No hay episodios disponibles</Typography>
          <Typography color="text.secondary" sx={{ mt: 1 }}>Creá el primer episodio de audio para comenzar.</Typography>
        </CardContent></Card>
      ) : (
        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "repeat(2, 1fr)", xl: "repeat(3, 1fr)" }, gap: 2 }}>
          {episodes.map((episode) => (
            <Card key={episode.id} variant="outlined" sx={{ display: "flex", flexDirection: "column" }}>
              <Box sx={{ aspectRatio: "16 / 9", bgcolor: "action.hover", overflow: "hidden", display: "grid", placeItems: "center" }}>
                {episode.coverImageUrl ? <Box component="img" src={episode.coverImageUrl} alt="" sx={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <span className="material-symbols-outlined" style={{ fontSize: 42, opacity: 0.35 }}>podcasts</span>}
              </Box>
              <CardContent sx={{ display: "flex", flexDirection: "column", flexGrow: 1, gap: 1 }}>
                <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1 }}>
                  <Chip size="small" label={episode.status === "published" ? "Publicado" : "Borrador"} color={episode.status === "published" ? "success" : "default"} />
                  <Typography variant="caption" color="text.secondary">{episode.duration || "Duración no indicada"}</Typography>
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>{episode.title}</Typography>
                <Typography variant="body2" color="primary">{episode.podcastName}</Typography>
                <Typography variant="body2" color="text.secondary" sx={{ minHeight: 42 }}>{episode.description || "Sin descripción."}</Typography>
                <Typography variant="caption" color="text.secondary">{episode.publishedAt ? new Intl.DateTimeFormat("es-AR", { dateStyle: "medium" }).format(new Date(episode.publishedAt)) : "Sin fecha de publicación"}</Typography>
                <Box sx={{ display: "flex", gap: 1, mt: "auto", pt: 1 }}>
                  <Button size="small" variant="contained" onClick={() => void playEpisode(episode)} startIcon={<span className="material-symbols-outlined">{current?.id === episode.id && playing ? "pause" : "play_arrow"}</span>}>{current?.id === episode.id && playing ? "Pausar" : "Reproducir"}</Button>
                  <IconButton size="small" aria-label="Editar episodio" onClick={() => openEdit(episode)}><span className="material-symbols-outlined">edit</span></IconButton>
                  <IconButton size="small" aria-label="Eliminar episodio" color="error" onClick={() => setEpisodeToDelete(episode)}><span className="material-symbols-outlined">delete</span></IconButton>
                </Box>
              </CardContent>
            </Card>
          ))}
        </Box>
      )}

      {current && <Card variant="outlined" sx={{ position: "sticky", bottom: 16, mt: 3, zIndex: 2, bgcolor: "background.paper" }}><CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
          <Box sx={{ minWidth: 150, flex: 1 }}><Typography variant="caption" color="text.secondary">Reproduciendo ahora</Typography><Typography sx={{ fontWeight: 800 }} noWrap>{current.title}</Typography></Box>
          <IconButton onClick={() => void playEpisode(current)} aria-label={playing ? "Pausar audio" : "Reproducir audio"}><span className="material-symbols-outlined">{playing ? "pause" : "play_arrow"}</span></IconButton>
          <IconButton aria-label="Retroceder 10 segundos" onClick={() => { if (audioRef.current) audioRef.current.currentTime = Math.max(0, audioRef.current.currentTime - 10); }}><span className="material-symbols-outlined">replay_10</span></IconButton>
          <Typography variant="caption">{formatTime(position)}</Typography>
          <Slider size="small" value={duration ? position : 0} max={duration || 1} onChange={(_, value) => { const next = Array.isArray(value) ? value[0] : value; if (audioRef.current) audioRef.current.currentTime = next; setPosition(next); }} sx={{ flex: { xs: "1 1 100%", sm: 2 }, minWidth: 120 }} aria-label="Progreso del audio" />
          <Typography variant="caption">{formatTime(duration)}</Typography><span className="material-symbols-outlined">volume_up</span>
          <IconButton aria-label="Avanzar 10 segundos" onClick={() => { if (audioRef.current) audioRef.current.currentTime = Math.min(duration, audioRef.current.currentTime + 10); }}><span className="material-symbols-outlined">forward_10</span></IconButton>
          <Slider size="small" value={volume} min={0} max={1} step={0.01} onChange={(_, value) => { const next = Array.isArray(value) ? value[0] : value; setVolume(next); if (audioRef.current) audioRef.current.volume = next; }} sx={{ width: 90 }} aria-label="Volumen" />
        </Box>
      </CardContent></Card>}

      <Dialog open={Boolean(editing) || form !== emptyForm} onClose={closeForm} fullWidth maxWidth="sm">
        <DialogTitle>{editing ? "Editar episodio" : "Nuevo episodio"}</DialogTitle>
        <DialogContent><Stack spacing={2} sx={{ pt: 1 }}>
          <TextField label="Título" value={form.title} onChange={(event) => updateField("title", event.target.value)} required />
          <TextField label="Nombre del podcast" value={form.podcastName} onChange={(event) => updateField("podcastName", event.target.value)} required />
          <TextField label="Descripción" value={form.description} onChange={(event) => updateField("description", event.target.value)} multiline minRows={3} />
          <TextField label="URL directa del audio" placeholder="https://.../episodio.mp3" value={form.audioUrl} onChange={(event) => updateField("audioUrl", event.target.value)} required helperText="Usá una URL directa MP3, M4A, WAV u otro formato compatible." />
          <TextField label="URL de portada" value={form.coverImageUrl} onChange={(event) => updateField("coverImageUrl", event.target.value)} />
          <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}><TextField label="Duración" placeholder="12:30" value={form.duration} onChange={(event) => updateField("duration", event.target.value)} /><TextField label="Fecha de publicación" type="date" value={form.publishedAt ? form.publishedAt.slice(0, 10) : ""} onChange={(event) => updateField("publishedAt", event.target.value)} slotProps={{ inputLabel: { shrink: true } }} /></Box>
          <TextField select label="Estado" value={form.status} onChange={(event) => updateField("status", event.target.value as PodcastEpisodeStatus)} SelectProps={{ native: true }}><option value="draft">Borrador</option><option value="published">Publicado</option></TextField>
        </Stack></DialogContent>
        <DialogActions><Button onClick={closeForm}>Cancelar</Button><Button variant="contained" onClick={() => void saveEpisode()} disabled={saving}>{saving ? "Guardando..." : "Guardar"}</Button></DialogActions>
      </Dialog>
      <Dialog open={Boolean(episodeToDelete)} onClose={() => setEpisodeToDelete(null)}><DialogTitle>Eliminar episodio</DialogTitle><DialogContent><Typography>¿Querés eliminar “{episodeToDelete?.title}”?</Typography></DialogContent><DialogActions><Button onClick={() => setEpisodeToDelete(null)}>Cancelar</Button><Button color="error" variant="contained" onClick={() => void deleteEpisode()}>Eliminar</Button></DialogActions></Dialog>
    </Box>
  );
}
