import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogContent,
  DialogTitle,
  Divider,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { BuildRequest, BuildRequestStatus } from "../types";
import { actualizarEstadoSolicitud, listarSolicitudes } from "../services/buildRequests.service";

const TRANSICIONES: Record<BuildRequestStatus, BuildRequestStatus[]> = {
  PENDING: ["IN_PROGRESS", "WAITING_CLIENT", "CANCELLED"],
  IN_PROGRESS: ["WAITING_CLIENT", "BUILDING", "CANCELLED", "FAILED"],
  WAITING_CLIENT: ["CANCELLED"],
  BUILDING: ["COMPLETED", "FAILED", "CANCELLED"],
  COMPLETED: ["PUBLISHED"],
  FAILED: [],
  PUBLISHED: [],
  CANCELLED: [],
};

const FILTROS: { value: string; label: string }[] = [
  { value: "", label: "Todas" },
  { value: "PENDING", label: "Pendientes" },
  { value: "IN_PROGRESS", label: "En revisión" },
  { value: "WAITING_CLIENT", label: "Esperando información" },
  { value: "BUILDING", label: "Compilando" },
  { value: "COMPLETED", label: "Completadas" },
  { value: "PUBLISHED", label: "Publicadas" },
  { value: "FAILED", label: "Fallidas" },
  { value: "CANCELLED", label: "Canceladas" },
];

function statusLabel(status: BuildRequestStatus) {
  const labels: Record<BuildRequestStatus, string> = {
    PENDING: "Pendiente",
    IN_PROGRESS: "En revisión",
    WAITING_CLIENT: "Esperando información",
    BUILDING: "Compilando",
    COMPLETED: "Completada",
    FAILED: "Falló",
    PUBLISHED: "Publicada",
    CANCELLED: "Cancelada",
  };
  return labels[status];
}

function statusColor(status: BuildRequestStatus) {
  if (status === "PUBLISHED" || status === "COMPLETED") return "success" as const;
  if (status === "FAILED" || status === "CANCELLED") return "error" as const;
  if (status === "WAITING_CLIENT") return "warning" as const;
  return "default" as const;
}

function formatFecha(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function SolicitudesApps() {
  const [solicitudes, setSolicitudes] = useState<BuildRequest[]>([]);
  const [filtro, setFiltro] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [seleccionada, setSeleccionada] = useState<BuildRequest | null>(null);

  const cargar = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await listarSolicitudes(filtro || undefined);
      setSolicitudes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las solicitudes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void cargar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filtro]);

  const pendientes = useMemo(
    () => solicitudes.filter((s) => s.status === "PENDING").length,
    [solicitudes],
  );

  return (
    <Box>
      <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2, flexWrap: "wrap", mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.75, display: "flex", alignItems: "center", gap: 1.5 }}>
            Solicitudes de Apps
            {pendientes > 0 && (
              <Chip size="small" label={`${pendientes} pendiente${pendientes === 1 ? "" : "s"}`} color="warning" sx={{ fontWeight: 700 }} />
            )}
          </Typography>
          <Typography color="text.secondary">
            Gestioná las solicitudes de generación y publicación de todos los tenants.
          </Typography>
        </Box>

        <TextField select label="Estado" size="small" value={filtro} onChange={(e) => setFiltro(e.target.value)} sx={{ minWidth: 220 }}>
          {FILTROS.map((f) => (
            <MenuItem key={f.value} value={f.value}>
              {f.label}
            </MenuItem>
          ))}
        </TextField>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Card variant="outlined" sx={{ bgcolor: "rgba(255,255,255,0.03)", borderColor: "divider" }}>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
              <CircularProgress />
            </Box>
          ) : solicitudes.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 8, px: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
                No hay solicitudes
              </Typography>
              <Typography color="text.secondary">
                Las solicitudes de generación de apps van a aparecer acá.
              </Typography>
            </Box>
          ) : (
            <Stack divider={<Divider />}>
              {solicitudes.map((s) => (
                <Box
                  key={s.id}
                  onClick={() => setSeleccionada(s)}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 2,
                    flexWrap: "wrap",
                    p: 2.5,
                    cursor: "pointer",
                    "&:hover": { bgcolor: "rgba(255,255,255,0.03)" },
                  }}
                >
                  <Box sx={{ minWidth: 0 }}>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5, flexWrap: "wrap" }}>
                      <Typography sx={{ fontWeight: 800 }}>{s.tenant?.nombre ?? `Tenant #${s.tenantId}`}</Typography>
                      <Chip size="small" label={s.type === "SELF_EXPORT" ? "Generar archivo" : "Publicación Pinnacle"} />
                    </Box>
                    <Typography color="text.secondary" variant="body2">
                      {s.requestedBy?.email ?? "—"} · {formatFecha(s.createdAt)}
                    </Typography>
                  </Box>

                  <Chip label={statusLabel(s.status)} color={statusColor(s.status)} sx={{ fontWeight: 700 }} />
                </Box>
              ))}
            </Stack>
          )}
        </CardContent>
      </Card>

      <DetalleSolicitud
        solicitud={seleccionada}
        onClose={() => setSeleccionada(null)}
        onActualizada={() => {
          setSeleccionada(null);
          void cargar();
        }}
      />
    </Box>
  );
}

function DetalleSolicitud({
  solicitud,
  onClose,
  onActualizada,
}: {
  solicitud: BuildRequest | null;
  onClose: () => void;
  onActualizada: () => void;
}) {
  const [internalNotes, setInternalNotes] = useState("");
  const [aplicando, setAplicando] = useState<BuildRequestStatus | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    setInternalNotes(solicitud?.internalNotes ?? "");
    setError("");
  }, [solicitud?.id]);

  if (!solicitud) return null;

  const transicionesDisponibles = TRANSICIONES[solicitud.status].filter(
    (status) => status !== "PUBLISHED" || solicitud.type === "PINNACLE_PUBLISH",
  );

  const aplicar = async (status: BuildRequestStatus) => {
    setAplicando(status);
    setError("");

    try {
      await actualizarEstadoSolicitud(solicitud.id, { status, internalNotes: internalNotes || undefined });
      onActualizada();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo actualizar el estado");
    } finally {
      setAplicando(null);
    }
  };

  return (
    <Dialog open onClose={onClose} fullWidth maxWidth="sm" slotProps={{ paper: { sx: { bgcolor: "#161616", borderColor: "divider" } } }}>
      <DialogTitle sx={{ fontWeight: 900 }}>
        {solicitud.tenant?.nombre ?? `Tenant #${solicitud.tenantId}`}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2}>
          {error && <Alert severity="error">{error}</Alert>}

          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            <Chip size="small" label={solicitud.type === "SELF_EXPORT" ? "Generar archivo" : "Publicación Pinnacle"} />
            <Chip size="small" label={statusLabel(solicitud.status)} color={statusColor(solicitud.status)} />
          </Box>

          <Typography variant="body2" color="text.secondary">
            Solicitada por {solicitud.requestedBy?.email ?? "—"} el {formatFecha(solicitud.createdAt)}
          </Typography>

          {solicitud.notes && (
            <Box>
              <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 1 }}>
                Mensaje del cliente
              </Typography>
              <Typography>{solicitud.notes}</Typography>
            </Box>
          )}

          {solicitud.publishInfo && (
            <>
              <Divider />
              <Typography sx={{ fontWeight: 800 }}>Datos para Google Play</Typography>
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 1.5 }}>
                <CampoDetalle label="Desarrollador" value={solicitud.publishInfo.developerName} />
                <CampoDetalle label="Contacto" value={solicitud.publishInfo.contactEmail} />
                <CampoDetalle label="Soporte" value={solicitud.publishInfo.supportEmail} />
                <CampoDetalle label="Sitio web" value={solicitud.publishInfo.websiteUrl} />
                <CampoDetalle label="Política de privacidad" value={solicitud.publishInfo.privacyPolicyUrl} />
                <CampoDetalle label="Categoría" value={solicitud.publishInfo.category} />
                <CampoDetalle label="Público objetivo" value={solicitud.publishInfo.targetAudience} />
                <CampoDetalle label="Contiene anuncios" value={solicitud.publishInfo.containsAds ? "Sí" : "No"} />
              </Box>
              <CampoDetalle label="Descripción corta" value={solicitud.publishInfo.shortDescription} />
              <CampoDetalle label="Descripción completa" value={solicitud.publishInfo.appDescription} />
              {solicitud.publishInfo.additionalNotes && (
                <CampoDetalle label="Información adicional" value={solicitud.publishInfo.additionalNotes} />
              )}
            </>
          )}

          <Divider />

          {transicionesDisponibles.length > 0 ? (
            <>
              <TextField
                label="Nota interna (opcional, visible para el cliente si queda en espera)"
                value={internalNotes}
                onChange={(e) => setInternalNotes(e.target.value)}
                multiline
                minRows={2}
                fullWidth
              />

              <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                {transicionesDisponibles.map((status) => (
                  <Button
                    key={status}
                    variant="contained"
                    size="small"
                    disabled={aplicando !== null}
                    onClick={() => aplicar(status)}
                  >
                    {aplicando === status ? "Guardando..." : `Pasar a ${statusLabel(status)}`}
                  </Button>
                ))}
              </Box>
            </>
          ) : (
            <Alert severity="info">Esta solicitud ya está en un estado final.</Alert>
          )}
        </Stack>
      </DialogContent>
    </Dialog>
  );
}

function CampoDetalle({ label, value }: { label?: string; value?: string | null }) {
  if (!value) return null;

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 1, display: "block" }}>
        {label}
      </Typography>
      <Typography variant="body2">{value}</Typography>
    </Box>
  );
}
