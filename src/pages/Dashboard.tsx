import { Box, Button, Card, CardContent, Chip, Typography, CircularProgress, IconButton } from "@mui/material";
import { Link } from "react-router-dom";
import { useEffect, useState } from "react";
import type { Perfil } from "../types";
import { listarMiProgramacion } from "../services/schedule.service";
import { listarMisNoticias } from "../services/news.service";
import type { Programa, News } from "../types";
import { getKickStreamData, extractKickChannelName, formatDuration, formatViewers } from "../services/kick.service";
import type { KickStreamData } from "../services/kick.service";

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
  const channelName = extractKickChannelName(streamUrl);

  const [programas, setProgramas] = useState<Programa[] | null>(null);
  const [noticias, setNoticias] = useState<News[] | null>(null);
  const [kickData, setKickData] = useState<KickStreamData | null>(null);
  const [loadingKick, setLoadingKick] = useState(false);
  const [expandTitle, setExpandTitle] = useState(false);

  useEffect(() => {
    let active = true;
    let kickInterval: ReturnType<typeof setInterval> | null = null;

    console.log("Dashboard useEffect started. streamUrl:", streamUrl, "channelName:", channelName);

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

    // Polling de Kick cada 1 segundo si hay canal
    const fetchKickData = async () => {
      console.log("fetchKickData called. channelName:", channelName);

      if (!channelName) {
        console.warn("No channelName available, skipping Kick fetch");
        return;
      }

      try {
        setLoadingKick(true);
        console.log("Fetching Kick data for channel:", channelName);
        const data = await getKickStreamData(channelName);
        console.log("Got Kick data:", data);
        if (!active) return;

        setKickData(data);

        if (!data?.isLive) {
          console.log("Stream offline, stopping Kick polling");
          if (kickInterval) {
            clearInterval(kickInterval);
            kickInterval = null;
          }
          return;
        }

        if (!kickInterval) {
          console.log("Stream live, starting Kick polling for channel:", channelName);
          kickInterval = setInterval(() => {
            void fetchKickData();
          }, 1000);
        }
      } catch (e) {
        console.error("Error fetching Kick data:", e);
      } finally {
        if (active) setLoadingKick(false);
      }
    };

    // Fetch inicial inmediato
    void fetchKickData();

    return () => {
      console.log("Dashboard useEffect cleanup");
      active = false;
      if (kickInterval) clearInterval(kickInterval);
    };
  }, [channelName]);

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
          <Button component={Link} to="/programacion" variant="contained" sx={ { fontWeight: 700 } }>+ Nuevo Evento</Button>
        </CardContent>
      </Card>

      {/* Métricas - desde Kick en tiempo real */}
      <Box sx={ { display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 2, mb: 3 } }>
        {/* Viewers en Línea */}
        <Card variant="outlined">
          <CardContent>
            <Box sx={ { display: "flex", justifyContent: "space-between", mb: 1 } }>
              <Typography sx={ { fontSize: 11, fontWeight: 600, letterSpacing: 1.2, textTransform: "uppercase", color: "text.secondary", fontFamily: "monospace" } }>Espectadores en Línea</Typography>
            </Box>
            <Box sx={ { display: "flex", alignItems: "flex-end", gap: 1 } }>
              <Typography sx={ { fontSize: 36, fontWeight: 800 } }>{kickData ? formatViewers(kickData.viewerCount) : "—"}</Typography>
              {loadingKick && <CircularProgress size={20} />}
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
                  {kickData?.isLive && kickData.title ? kickData.title : "Sin transmisión"}
                </Typography>
              </Box>
              {kickData?.isLive && kickData.title && kickData.title.length > 60 && (
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
            <Typography variant="caption" color="text.secondary">desde Kick</Typography>
          </CardContent>
        </Card>

        {/* Tiempo en Aire */}
        <Card variant="outlined">
          <CardContent>
            <Box sx={ { display: "flex", justifyContent: "space-between", mb: 1 } }>
              <Typography sx={ { fontSize: 11, fontWeight: 600, letterSpacing: 1.2, textTransform: "uppercase", color: "text.secondary", fontFamily: "monospace" } }>Tiempo en Aire</Typography>
            </Box>
            <Typography sx={ { fontSize: 36, fontWeight: 800 } }>{kickData?.isLive ? formatDuration(kickData.duration) : "—"}</Typography>
          </CardContent>
        </Card>

        {/* Estado del Stream */}
        <Card variant="outlined" sx={ { borderColor: kickData?.isLive ? "error.main" : undefined, boxShadow: kickData?.isLive ? "0 0 15px rgba(239,68,68,0.08)" : undefined } }>
          <CardContent>
            <Box sx={ { display: "flex", justifyContent: "space-between", mb: 2 } }>
              <Typography sx={ { fontSize: 11, fontWeight: 600, letterSpacing: 1.2, textTransform: "uppercase", color: "text.secondary", fontFamily: "monospace" } }>Estado del Stream</Typography>
            </Box>
            <Box sx={ { display: "flex", alignItems: "center", justifyContent: "center" } }>
              {kickData?.isLive ? (
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
            {!channelName && (
              <Typography variant="caption" color="text.secondary" sx={ { display: "block", mt: 1, textAlign: "center" } }>
                Sin URL de Kick configurada
              </Typography>
            )}
          </CardContent>
        </Card>
      </Box>

      {/* Branding / Streaming - mantener diseño de tarjetas compactas */}
      <Box sx={ { display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2, mb: 3 } }>
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

        <Card variant="outlined">
          <CardContent>
            <Box sx={ { display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 } }>
              <SectionHeader icon="sensors">Streaming</SectionHeader>
              <Chip label={kickData?.isLive ? "En Vivo" : "Offline"} size="small" color={kickData?.isLive ? "error" : "default"} sx={ { fontWeight: 700 } } />
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
      </Box>

      {/* Programación */}
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

      {/* Noticias */}
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
    </Box>
  );
}

