import { Box, Button, Card, CardContent, Chip, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import type { Perfil } from "../types";

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
  const streamActivo = perfil.tenant?.streamActivo ?? false;
  const estadoStreamLabel = streamActivo ? "Conectado" : "Desconectado";
  const metricas = [
    { label: "Viewers en Línea", value: "—", icon: "visibility" },
    { label: "Vistas Totales", value: "—", icon: "bar_chart" },
    { label: "Tiempo en Aire", value: "—", icon: "timer" },
    { label: "Estado del Stream", value: estadoStreamLabel, icon: "rss_feed" },
  ];

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

      {/* Métricas - siguiendo diseño visual */}
      <Box sx={ { display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(4, 1fr)" }, gap: 2, mb: 3 } }>
        {/* Viewers */}
        <Card variant="outlined">
          <CardContent>
            <Box sx={ { display: "flex", justifyContent: "space-between", mb: 1 } }>
              <Typography sx={ { fontSize: 11, fontWeight: 600, letterSpacing: 1.2, textTransform: "uppercase", color: "text.secondary", fontFamily: "monospace" } }>{metricas[0].label}</Typography>
            </Box>
            <Typography sx={ { fontSize: 36, fontWeight: 800 } }>{metricas[0].value}</Typography>
          </CardContent>
        </Card>

        {/* Vistas Totales */}
        <Card variant="outlined">
          <CardContent>
            <Box sx={ { display: "flex", justifyContent: "space-between", mb: 1 } }>
              <Typography sx={ { fontSize: 11, fontWeight: 600, letterSpacing: 1.2, textTransform: "uppercase", color: "text.secondary", fontFamily: "monospace" } }>{metricas[1].label}</Typography>
            </Box>
            <Typography sx={ { fontSize: 36, fontWeight: 800 } }>{metricas[1].value}</Typography>
          </CardContent>
        </Card>

        {/* Tiempo en Aire */}
        <Card variant="outlined">
          <CardContent>
            <Box sx={ { display: "flex", justifyContent: "space-between", mb: 1 } }>
              <Typography sx={ { fontSize: 11, fontWeight: 600, letterSpacing: 1.2, textTransform: "uppercase", color: "text.secondary", fontFamily: "monospace" } }>{metricas[2].label}</Typography>
            </Box>
            <Typography sx={ { fontSize: 36, fontWeight: 800 } }>{metricas[2].value}</Typography>
          </CardContent>
        </Card>

        {/* Estado del Stream */}
        <Card variant="outlined" sx={ { borderColor: streamActivo ? "error.main" : undefined, boxShadow: streamActivo ? "0 0 15px rgba(239,68,68,0.08)" : undefined } }>
          <CardContent>
            <Box sx={ { display: "flex", justifyContent: "space-between", mb: 2 } }>
              <Typography sx={ { fontSize: 11, fontWeight: 600, letterSpacing: 1.2, textTransform: "uppercase", color: "text.secondary", fontFamily: "monospace" } }>Estado del Stream</Typography>
            </Box>
            <Box sx={ { display: "flex", alignItems: "center", justifyContent: "center" } }>
              {streamActivo ? (
                <Box sx={ { display: "inline-flex", alignItems: "center", gap: 1.5, px: 3, py: 1.5, bgcolor: "error.main", color: "error.contrastText", borderRadius: 3 } }>
                  <Box sx={ { width: 8, height: 8, borderRadius: "50%", bgcolor: "#fff", boxShadow: "0 0 8px rgba(255,255,255,0.15)" } } />
                  <Typography sx={ { fontSize: 18, fontWeight: 800, letterSpacing: 1 } }>EN VIVO</Typography>
                </Box>
              ) : (
                <Box sx={ { display: "inline-flex", alignItems: "center", gap: 1.5, px: 3, py: 1.5, bgcolor: "background.paper", borderRadius: 3 } }>
                  <Typography sx={ { fontSize: 18, fontWeight: 800 } }>DESCONECTADO</Typography>
                </Box>
              )}
            </Box>
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
              <Chip label={streamActivo ? "En Vivo" : "Offline"} size="small" color={streamActivo ? "error" : "default"} sx={ { fontWeight: 700 } } />
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
            <Button size="small" variant="outlined" sx={ { fontWeight: 700, letterSpacing: 0.5 } }>+ Agregar</Button>
          </Box>
          <Box sx={ { display: "grid", gridTemplateColumns: "1fr 1fr 2fr auto", gap: 2, px: 1, py: 1, borderBottom: "1px solid", borderColor: "divider" } }>
            {["Día", "Horario", "Programa", "Acciones"].map((h) => (
              <Typography key={h} sx={ { fontSize: 11, fontWeight: 700, letterSpacing: 1, textTransform: "uppercase", color: "text.secondary" } }>
                {h}
              </Typography>
            ))}
          </Box>
          <Typography color="text.secondary" variant="body2" sx={ { textAlign: "center", py: 4 } }>
            Todavía no hay programas cargados.
          </Typography>
        </CardContent>
      </Card>

      {/* Noticias */}
      <Card variant="outlined">
        <CardContent>
          <Box sx={ { display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 } }>
            <SectionHeader icon="newspaper">Últimas Noticias</SectionHeader>
            <Button size="small" variant="outlined" sx={ { fontWeight: 700, letterSpacing: 0.5 } }>+ Nueva</Button>
          </Box>
          <Typography color="text.secondary" variant="body2" sx={ { textAlign: "center", py: 4 } }>
            Todavía no hay noticias publicadas.
          </Typography>
        </CardContent>
      </Card>
    </Box>
  );
}