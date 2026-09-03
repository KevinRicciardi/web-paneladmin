import { Box, Button, Card, CardContent, Chip, Typography, CircularProgress, IconButton } from "@mui/material";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import type { Perfil } from "../types";
import { listarMiProgramacion } from "../services/schedule.service";
import { listarMisNoticias } from "../services/news.service";
import type { Programa, News } from "../types";
import { formatDuration, formatViewers } from "../services/kick.service";
import { detectStreamProvider, getStreamData } from "../services/stream.service";
import type { StreamData } from "../services/stream.service";
import { puedeVerSeccion } from "../utils/permisos";

function SectionHeader({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <Typography
      variant="h6"
      sx={ { display: "flex", alignItems: "center", gap: 1, fontWeight: 700 } }
    >
      <span className="material-symbols-outlined" style={ { fontSize: 20 } }>{icon}</span>
      {children}
    </Typography>
  );
}

export default function Dashboard({ perfil }: { perfil: Perfil }) {
  const nombreCliente = perfil.tenant?.nombre ?? perfil.tenant?.slug ?? "Cliente";
  const streamUrl = perfil.tenant?.streamUrl ?? "";
  const streamProvider = detectStreamProvider(streamUrl) ?? (perfil.tenant?.streamProvider as "kick" | "youtube" | "twitch" | null);
  const sourceLabel = streamProvider === "youtube" ? "YouTube" : streamProvider === "twitch" ? "Twitch" : "Kick";

  const puedeVerBranding = puedeVerSeccion(perfil, "branding");
  const puedeVerStreaming = puedeVerSeccion(perfil, "streaming");
  const puedeVerProgramacion = puedeVerSeccion(perfil, "programacion");
  const puedeVerNoticias = puedeVerSeccion(perfil, "noticias");

  const [programas, setProgramas] = useState<Programa[] | null>(null);
  const [noticias, setNoticias] = useState<News[] | null>(null);
  const [streamData, setStreamData] = useState<StreamData | null>(null);
  const [loadingStream, setLoadingStream] = useState(false);
  const [expandTitle, setExpandTitle] = useState(false);

  useEffect(() => {
    let active = true;
    let streamInterval: ReturnType<typeof setInterval> | null = null;

    try {
       const cachedProg = sessionStorage.getItem("programacion_cache");
      if (cachedProg) setProgramas(JSON.parse(cachedProg));
    } catch (e) {
      // Silencioso
      console.debug("Cache read error:", e);
    }

    try {
      const cachedNews = sessionStorage.getItem("noticias_cache");
      if (cachedNews) setNoticias(JSON.parse(cachedNews));
    } catch (e) {
      // Silencioso
      console.debug("Cache read error:", e);
    }

    void listarMiProgramacion()
      .then((progs) => {
        if (!active) return;
        setProgramas(progs);
        try { sessionStorage.setItem("programacion_cache", JSON.stringify(progs)); } catch (e) {
          console.debug("Cache write error:", e);
        }
      })
      .catch((e) => console.debug("Programming load error:", e));

    void listarMisNoticias()
      .then((newsList) => {
        if (!active) return;
        setNoticias(newsList);
        try { sessionStorage.setItem("noticias_cache", JSON.stringify(newsList)); } catch (e) {
          console.debug("Cache write error:", e);
        }
      })
      .catch((e) => console.debug("News load error:", e));

    const fetchStreamData = async () => {
      if (!streamUrl || !streamProvider) {
        return;
      }

      try {
        setLoadingStream(true);
        const data = await getStreamData(streamUrl, streamProvider, perfil.tenant?.youtubeChannelId);
        if (!active) return;

        setStreamData(data);

        if (!data?.isLive) {
          if (streamInterval) {
            clearInterval(streamInterval);
            streamInterval = null;
          }
          return;
        }

        if (!streamInterval) {
          streamInterval = setInterval(() => {
            void fetchStreamData();
          }, streamProvider === "kick" ? 1000 : 30_000);
        }
      } catch (e) {
        console.error(`Error fetching ${sourceLabel} data:`, e);
      } finally {
        if (active) setLoadingStream(false);
      }
    };

    void fetchStreamData();

    return () => {
      active = false;
      if (streamInterval) clearInterval(streamInterval);
    };
  }, [perfil.tenant?.youtubeChannelId, sourceLabel, streamProvider, streamUrl]);

  return (
    <Box>
      {/* Bienvenida */}
      <Card variant="outlined" sx={ { mb: 3 } }>
        <CardContent sx={ { display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 2 } }>
          <Box>
            <Typography variant="h4" gutterBottom>
              Hola, {nombreCliente} <span className="material-symbols-outlined" style={ { verticalAlign: 'middle', marginLeft: 8 } }></span>
            </Typography>
            <Typography color="text.secondary">
              Este es el centro de control de tu plataforma.
            </Typography>
          </Box>
          {puedeVerProgramacion && (
            <Button component={Link} to="/programacion" variant="contained" sx={ { fontWeight: 700 } }>+ Nuevo Evento</Button>
          )}
        </CardContent>
      </Card>

      {/* Métricas - desde la plataforma configurada */}
      <Box sx={ { display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 2, mb: 3 } }>
        {/* Viewers en Línea */}
        <Card variant="outlined">
          <CardContent>
            <Box sx={ { display: "flex", justifyContent: "space-between", mb: 1 } }>
              <Typography sx={ { fontSize: 11, fontWeight: 600, letterSpacing: 1.2, textTransform: "uppercase", color: "text.secondary", fontFamily: "monospace" } }>Espectadores en Línea</Typography>
            </Box>
            <Box sx={ { display: "flex", alignItems: "flex-end", gap: 1 } }>
              <Typography sx={ { fontSize: 36, fontWeight: 800 } }>{streamData ? formatViewers(streamData.viewerCount) : "—"}</Typography>
              {loadingStream && <CircularProgress size={20} />}
            </Box>
          </CardContent>
        </Card>

        {/* Título / Info del Stream */}
        <Card variant="outlined">
          <CardContent>
            <Box sx={ { display: "flex", justifyContent: "space-between", mb: 1 } }>
              <Typography sx={ { fontSize: 11, fontWeight: 600, letterSpacing: 1.2, textTransform: "uppercase", color: "text.secondary", fontFamily: "monospace" } }>Transmisión Actual</Typography>
            </Box>
            <Box sx={ { display: "flex", alignItems: "flex-start", gap: 1 } }>
              <Box sx={ { flex: 1 } }>
                <Typography sx={ { fontSize: 14, fontWeight: 700, lineHeight: 1.3, display: "-webkit-box", WebkitLineClamp: expandTitle ? undefined : 2, WebkitBoxOrient: "vertical", overflow: expandTitle ? "visible" : "hidden" } }>
                  {streamData?.isLive && streamData.title ? streamData.title : "Sin transmisión"}
                </Typography>
              </Box>
              {streamData?.isLive && streamData.title && streamData.title.length > 60 && (
                <IconButton 
                  size="small" 
                  onClick={() => setExpandTitle(!expandTitle)}
                  sx={ { flexShrink: 0, pt: 0 } }
                >
                  <span className="material-symbols-outlined" style={ { fontSize: 18 } }>
                    {expandTitle ? "expand_less" : "expand_more"}
                  </span>
                </IconButton>
              )}
            </Box>
            <Typography variant="caption" color="text.secondary">desde {sourceLabel}</Typography>
          </CardContent>
        </Card>

        {/* Tiempo en Aire */}
        <Card variant="outlined">
          <CardContent>
            <Box sx={ { display: "flex", justifyContent: "space-between", mb: 1 } }>
              <Typography sx={ { fontSize: 11, fontWeight: 600, letterSpacing: 1.2, textTransform: "uppercase", color: "text.secondary", fontFamily: "monospace" } }>Tiempo en Aire</Typography>
            </Box>
            <Typography sx={ { fontSize: 36, fontWeight: 800 } }>{streamData?.isLive ? formatDuration(streamData.duration) : "—"}</Typography>
          </CardContent>
        </Card>

        {/* Estado del Stream */}
        <Card variant="outlined" sx={ { borderColor: streamData?.isLive ? "error.main" : undefined, boxShadow: streamData?.isLive ? "0 0 15px rgba(239,68,68,0.08)" : undefined } }>
          <CardContent>
            <Box sx={ { display: "flex", justifyContent: "space-between", mb: 2 } }>
              <Typography sx={ { fontSize: 11, fontWeight: 600, letterSpacing: 1.2, textTransform: "uppercase", color: "text.secondary", fontFamily: "monospace" } }>Estado del Stream</Typography>
            </Box>
            <Box sx={ { display: "flex", alignItems: "center", justifyContent: "center" } }>
              {streamData?.isLive ? (
                <Box sx={ { display: "inline-flex", alignItems: "center", gap: 1.5, px: 3, py: 1.5, bgcolor: "error.main", color: "error.contrastText", borderRadius: 3 } }>
                  <Box className="pulse-dot" sx={ { width: 8, height: 8, borderRadius: "50%", bgcolor: "#fff", boxShadow: "0 0 8px rgba(255,255,255,0.15)" } } />
                  <Typography sx={ { fontSize: 18, fontWeight: 800, letterSpacing: 1 } }>EN VIVO</Typography>
                </Box>
              ) : (
                <Box sx={ { display: "inline-flex", alignItems: "center", gap: 1.5, px: 3, py: 1.5, bgcolor: "background.paper", borderRadius: 3 } }>
                  <Typography sx={ { fontSize: 18, fontWeight: 800 } }>DESCONECTADO</Typography>
                </Box>
              )}
            </Box>
            {!streamUrl && (
              <Typography variant="caption" color="text.secondary" sx={ { display: "block", mt: 1, textAlign: "center" } }>
                Sin URL de streaming configurada
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Branding / Streaming - mantener diseño de tarjetas compactas */}
      {(puedeVerBranding || puedeVerStreaming) && (
        <Box
          sx={ {
            display: "grid",
            gridTemplateColumns: { xs: "1fr", md: puedeVerBranding && puedeVerStreaming ? "1fr 1fr" : "1fr" },
            gap: 2,
            mb: 3,
          } }
        >
          {puedeVerBranding && (
            <Card variant="outlined">
              <CardContent>
                <Box sx={ { display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 } }>
                  <SectionHeader icon="palette">Branding</SectionHeader>
                  <Chip label={perfil.tenant?.logoUrl || perfil.tenant?.bannerUrl ? "Completo" : "Incompleto"} color={perfil.tenant?.logoUrl || perfil.tenant?.bannerUrl ? "success" : "warning"} size="small" sx={ { fontWeight: 700 } } />
                </Box>
                <Typography color="text.secondary" variant="body2" sx={ { mb: 2 } }>
                  Logo, colores y banner configurados para el canal principal.
                </Typography>
                <Button component={Link} to="/branding" size="small" sx={ { fontWeight: 700, letterSpacing: 0.5 } }>Editar Branding →</Button>
              </CardContent>
            </Card>
          )}

          {puedeVerStreaming && (
            <Card variant="outlined">
              <CardContent>
                <Box sx={ { display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 } }>
                  <SectionHeader icon="sensors">Streaming</SectionHeader>
                  <Chip label={streamData?.isLive ? "En Vivo" : "Offline"} size="small" color={streamData?.isLive ? "error" : "default"} sx={ { fontWeight: 700 } } />
                </Box>
                <Typography color="text.secondary" variant="body2" sx={ { mb: 2 } }>
                  Configurá la URL de tu canal para empezar a transmitir.
                </Typography>
                <Box sx={ { display: "flex", alignItems: "center", gap: 1, mb: 2, p: 1, border: "1px solid", borderColor: "divider", borderRadius: 1 } }>
                  <Typography sx={ { fontFamily: "monospace", color: "text.primary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 } }>
                    {perfil.tenant?.streamUrl ?? "—"}
                  </Typography>
                  <Button size="small">Copiar</Button>
                </Box>
                <Button component={Link} to="/streaming" size="small" sx={ { fontWeight: 700, letterSpacing: 0.5 } }>Configurar Stream →</Button>
              </CardContent>
            </Card>
          )}
        </Box>
      )}

      {/* Programación */}
      {puedeVerProgramacion && (
        <Card variant="outlined" sx={ { mb: 3 } }>
          <CardContent>
            <Box sx={ { display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 } }>
              <SectionHeader icon="calendar_month">Programación</SectionHeader>
              <Button component={Link} to="/programacion" size="small" variant="outlined" sx={ { fontWeight: 700, letterSpacing: 0.5 } }>+ Agregar</Button>
            </Box>
            <Box sx={ { display: "grid", gridTemplateColumns: "1fr", gap: 1, px: 1, py: 1, borderBottom: "1px solid", borderColor: "divider" } }>
              {programas && programas.length > 0 ? (
                programas.slice(0, 3).map((p: Programa) => (
                  <Box key={p.id} sx={ { display: "flex", alignItems: "center", justifyContent: "space-between", py: 1 } }>
                    <Typography sx={ { fontSize: 14, fontWeight: 700 } }>{p.titulo}</Typography>
                    <Typography color="text.secondary">{p.horaInicio} — {p.horaFin}</Typography>
                  </Box>
                ))
              ) : (
                <Typography color="text.secondary" variant="body2" sx={ { textAlign: "center", py: 4 } }>
                  Todavía no hay programas cargados.
                </Typography>
              )}
            </Box>
            {programas && programas.length > 3 && (
              <Box sx={ { display: "flex", justifyContent: "flex-end", mt: 1 } }>
                <Button component={Link} to="/programacion" size="small">Ver todo</Button>
              </Box>
            )}
          </CardContent>
        </Card>
      )}

      {/* Noticias */}
      {puedeVerNoticias && (
        <Card variant="outlined">
          <CardContent>
            <Box sx={ { display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 } }>
              <SectionHeader icon="newspaper">Últimas Noticias</SectionHeader>
              <Button component={Link} to="/noticias" size="small" variant="outlined" sx={ { fontWeight: 700, letterSpacing: 0.5 } }>+ Nueva</Button>
            </Box>
            <Box sx={ { display: "grid", gap: 1 } }>
              {noticias && noticias.length > 0 ? (
                noticias.slice(0, 3).map((n: News) => (
                  <Box key={n.id} sx={ { display: "flex", alignItems: "center", justifyContent: "space-between", py: 1 } }>
                    <Typography sx={ { fontSize: 14, fontWeight: 700 } }>{n.title}</Typography>
                    <Typography color="text.secondary">{n.status === 'published' ? "Publicado" : "Borrador"}</Typography>
                  </Box>
                ))
              ) : (
                <Typography color="text.secondary" variant="body2" sx={ { textAlign: "center", py: 4 } }>
                  Todavía no hay noticias publicadas.
                </Typography>
              )}
            </Box>
            {noticias && noticias.length > 3 && (
              <Box sx={ { display: "flex", justifyContent: "flex-end", mt: 1 } }>
                <Button component={Link} to="/noticias" size="small">Ver todo</Button>
              </Box>
            )}
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

