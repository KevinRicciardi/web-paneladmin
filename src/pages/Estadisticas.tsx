import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  MenuItem,
  Select,
  Stack,
  Typography,
} from "@mui/material";
import type { Estadisticas as EstadisticasData, PeriodoEstadisticas } from "../types";
import { obtenerEstadisticas } from "../services/analytics.service";

const PERIODOS: { value: PeriodoEstadisticas; label: string }[] = [
  { value: "7d", label: "Últimos 7 días" },
  { value: "30d", label: "Últimos 30 días" },
  { value: "90d", label: "Últimos 90 días" },
];

const BANDERAS: Record<string, string> = {
  Argentina: "🇦🇷",
  México: "🇲🇽",
  España: "🇪🇸",
  Chile: "🇨🇱",
  Colombia: "🇨🇴",
  Perú: "🇵🇪",
  Uruguay: "🇺🇾",
  Paraguay: "🇵🇾",
  Bolivia: "🇧🇴",
  "Estados Unidos": "🇺🇸",
  Brasil: "🇧🇷",
  Desconocido: "🌎",
};

function KpiCard({
  icon,
  label,
  value,
  hint,
  chip,
}: {
  icon: string;
  label: string;
  value: string;
  hint?: string;
  chip?: { label: string; color: "success" | "default" | "warning" };
}) {
  return (
    <Card variant="outlined">
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1.5 }}>
          <Typography
            sx={{
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: 1.2,
              textTransform: "uppercase",
              color: "text.secondary",
              fontFamily: "monospace",
            }}
          >
            {label}
          </Typography>
          <span className="material-symbols-outlined" style={{ fontSize: 20, opacity: 0.6 }}>
            {icon}
          </span>
        </Box>

        <Box sx={{ display: "flex", alignItems: "baseline", gap: 1, flexWrap: "wrap" }}>
          <Typography sx={{ fontSize: 32, fontWeight: 800 }}>{value}</Typography>
          {chip && (
            <Chip size="small" label={chip.label} color={chip.color} sx={{ fontWeight: 700 }} />
          )}
        </Box>

        {hint && (
          <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
            {hint}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

function SectionHeader({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <Typography variant="h6" sx={{ display: "flex", alignItems: "center", gap: 1, fontWeight: 800 }}>
      <span className="material-symbols-outlined" style={{ fontSize: 20 }}>
        {icon}
      </span>
      {children}
    </Typography>
  );
}

function EstadoVacio({ icono, texto }: { icono: string; texto: string }) {
  return (
    <Box sx={{ textAlign: "center", py: 5, color: "text.secondary" }}>
      <span className="material-symbols-outlined" style={{ fontSize: 28, opacity: 0.5 }}>
        {icono}
      </span>
      <Typography variant="body2" sx={{ mt: 1 }}>
        {texto}
      </Typography>
    </Box>
  );
}

export default function Estadisticas() {
  const [periodo, setPeriodo] = useState<PeriodoEstadisticas>("30d");
  const [datos, setDatos] = useState<EstadisticasData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let activo = true;

    setLoading(true);
    setError("");

    obtenerEstadisticas(periodo)
      .then((res) => {
        if (activo) setDatos(res);
      })
      .catch((err) => {
        if (activo) {
          setError(err instanceof Error ? err.message : "No se pudieron cargar las estadísticas");
        }
      })
      .finally(() => {
        if (activo) setLoading(false);
      });

    return () => {
      activo = false;
    };
  }, [periodo]);

  const barras = datos?.descargasEnElTiempo ?? [];
  const maxBarra = useMemo(
    () => (barras.length ? Math.max(...barras.map((b) => b.valor), 1) : 1),
    [barras],
  );

  return (
    <Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 2,
          flexWrap: "wrap",
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.75 }}>
            Estadísticas de la Aplicación
          </Typography>
          <Typography color="text.secondary">
            Visualizá cómo se usa y desde dónde se instala tu aplicación.
          </Typography>
        </Box>

        <Select
          value={periodo}
          onChange={(event) => setPeriodo(event.target.value as PeriodoEstadisticas)}
          size="small"
          sx={{ minWidth: 200, fontWeight: 700 }}
        >
          {PERIODOS.map((p) => (
            <MenuItem key={p.value} value={p.value}>
              {p.label}
            </MenuItem>
          ))}
        </Select>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }} onClose={() => setError("")}>
          {error}
        </Alert>
      )}

      {loading && !datos ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : (
        datos && (
          <>
            {/* KPIs principales */}
            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr", md: "repeat(3, 1fr)" },
                gap: 2,
                mb: 3,
              }}
            >
              <KpiCard
                icon="download"
                label="Descargas"
                value={datos.kpis.descargas.toLocaleString("es-AR")}
                hint={
                  datos.kpis.descargas > 0 || datos.kpis.descargasVariacion !== 0
                    ? `${datos.kpis.descargasVariacion >= 0 ? "+" : ""}${datos.kpis.descargasVariacion}% vs. período anterior`
                    : "Sin descargas en el período anterior"
                }
              />
              <KpiCard
                icon="group"
                label="Usuarios Activos"
                value={datos.kpis.usuariosActivos.toLocaleString("es-AR")}
                hint="Abrieron la app en el período"
              />
              <KpiCard
                icon="android"
                label="Usuarios Android"
                value={datos.kpis.usuariosAndroid.toLocaleString("es-AR")}
              />
            </Box>

            {/* Descargas en el tiempo */}
            <Card variant="outlined" sx={{ mb: 3 }}>
              <CardContent>
                <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3 }}>
                  <SectionHeader icon="trending_up">Descargas en el tiempo</SectionHeader>
                </Box>

                {barras.length === 0 ? (
                  <EstadoVacio icono="bar_chart" texto="Todavía no hay descargas registradas en este período." />
                ) : (
                  <Box
                    sx={{
                      display: "flex",
                      alignItems: "flex-end",
                      gap: { xs: 1, sm: 2 },
                      height: 200,
                      px: 1,
                    }}
                  >
                    {barras.map((barra, index) => (
                      <Box
                        key={`${barra.etiqueta}-${index}`}
                        sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", height: "100%" }}
                      >
                        <Box sx={{ flex: 1, display: "flex", alignItems: "flex-end", width: "100%" }}>
                          <Box
                            sx={{
                              width: "100%",
                              borderRadius: "6px 6px 0 0",
                              bgcolor: "primary.main",
                              opacity: 0.85,
                              height: `${(barra.valor / maxBarra) * 100}%`,
                              minHeight: 4,
                              transition: "height 200ms ease",
                            }}
                          />
                        </Box>
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, fontWeight: 700 }}>
                          {barra.etiqueta}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                )}
              </CardContent>
            </Card>

            <Box
              sx={{
                display: "grid",
                gridTemplateColumns: { xs: "1fr", lg: "1fr 1fr" },
                gap: 3,
              }}
            >
              {/* Ubicación geográfica */}
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                    <SectionHeader icon="public">Usuarios por país</SectionHeader>
                  </Box>
                  <Typography color="text.secondary" variant="body2" sx={{ mb: 3 }}>
                    Ubicación geográfica aproximada, según la IP de conexión.
                  </Typography>

                  {datos.paises.length === 0 ? (
                    <EstadoVacio icono="public" texto="Todavía no hay datos de país para este período." />
                  ) : (
                    <Stack spacing={2}>
                      {datos.paises.map((p) => (
                        <Box key={p.pais}>
                          <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.75 }}>
                            <Typography sx={{ fontWeight: 700, display: "flex", alignItems: "center", gap: 1 }}>
                              <span>{BANDERAS[p.pais] ?? "🌎"}</span> {p.pais}
                            </Typography>
                            <Typography color="text.secondary" variant="body2">
                              {p.porcentaje}%
                            </Typography>
                          </Box>
                          <Box sx={{ width: "100%", height: 8, borderRadius: 999, bgcolor: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                            <Box sx={{ width: `${p.porcentaje}%`, height: "100%", bgcolor: "primary.main" }} />
                          </Box>
                        </Box>
                      ))}
                    </Stack>
                  )}

                  <Divider sx={{ my: 3 }} />

                  <Box
                    sx={{
                      borderRadius: 2,
                      border: "1px dashed",
                      borderColor: "divider",
                      py: 4,
                      textAlign: "center",
                      color: "text.secondary",
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 28, opacity: 0.5 }}>
                      map
                    </span>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      Mapa interactivo próximamente
                    </Typography>
                  </Box>
                </CardContent>
              </Card>

              {/* Top ciudades */}
              <Card variant="outlined">
                <CardContent>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
                    <SectionHeader icon="location_on">Principales ciudades</SectionHeader>
                  </Box>
                  <Typography color="text.secondary" variant="body2" sx={{ mb: 3 }}>
                    Lugares desde donde más se instala y usa la aplicación.
                  </Typography>

                  {datos.ciudades.length === 0 ? (
                    <EstadoVacio icono="location_on" texto="Todavía no hay datos de ciudad para este período." />
                  ) : (
                    <Stack divider={<Divider />} spacing={1.5}>
                      {datos.ciudades.map((c, index) => (
                        <Box key={c.ciudad} sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", py: 0.5 }}>
                          <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                            <Typography
                              sx={{
                                width: 24,
                                height: 24,
                                borderRadius: "50%",
                                bgcolor: "rgba(255,255,255,0.06)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 12,
                                fontWeight: 800,
                              }}
                            >
                              {index + 1}
                            </Typography>
                            <Typography sx={{ fontWeight: 700 }}>{c.ciudad}</Typography>
                          </Box>
                          <Typography color="text.secondary">{c.usuarios.toLocaleString("es-AR")} usuarios</Typography>
                        </Box>
                      ))}
                    </Stack>
                  )}
                </CardContent>
              </Card>
            </Box>
          </>
        )
      )}
    </Box>
  );
}
