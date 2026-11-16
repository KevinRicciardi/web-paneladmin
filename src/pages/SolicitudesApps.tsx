import { useEffect, useMemo, useState, type MouseEvent } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { BuildRequest, BuildRequestStatus } from "../types";
import { confirmacionDeEstado } from "../utils/solicitudes";
import { useErrorConScroll } from "../utils/useErrorConScroll";
import {
  actualizarEstadoSolicitud,
  descargarAab,
  listarSolicitudes,
} from "../services/buildRequests.service";
import { cambiarSlugDeTenant } from "../services/tenant.service";

// Mismo formato que valida la API y el script que genera la APK.
const FORMATO_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const LARGO_MAXIMO_SLUG = 50;

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
                    <Typography sx={{ fontWeight: 800, mb: 0.5 }}>{s.tenant?.nombre ?? `Tenant #${s.tenantId}`}</Typography>
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
        onSlugCambiado={(tenantId, slug) => {
          // Todas las solicitudes del mismo tenant muestran el slug nuevo.
          const conSlug = (s: BuildRequest) =>
            s.tenantId === tenantId && s.tenant ? { ...s, tenant: { ...s.tenant, slug } } : s;
          setSolicitudes((prev) => prev.map(conSlug));
          setSeleccionada((prev) => (prev ? conSlug(prev) : prev));
          // Por si es el tenant del propio MEGA_ADMIN: se vuelve a pedir su perfil.
          window.dispatchEvent(new CustomEvent("tenantUpdated"));
        }}
      />
    </Box>
  );
}

function DetalleSolicitud({
  solicitud,
  onClose,
  onActualizada,
  onSlugCambiado,
}: {
  solicitud: BuildRequest | null;
  onClose: () => void;
  onActualizada: () => void;
  onSlugCambiado: (tenantId: number, slug: string) => void;
}) {
  const [internalNotes, setInternalNotes] = useState("");
  const [aplicando, setAplicando] = useState<BuildRequestStatus | null>(null);
  const [descargando, setDescargando] = useState(false);
  const { error, setError, avisoRef } = useErrorConScroll();
  const [porConfirmar, setPorConfirmar] = useState<BuildRequestStatus | null>(null);

  useEffect(() => {
    setInternalNotes(solicitud?.internalNotes ?? "");
    setError("");
    setPorConfirmar(null);
  }, [solicitud?.id, setError]);

  if (!solicitud) return null;

  const transicionesDisponibles = TRANSICIONES[solicitud.status];

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

  const handleDescargar = async () => {
    setDescargando(true);
    setError("");

    try {
      const nombre = `${solicitud.tenant?.slug ?? solicitud.tenantId}-${solicitud.id}.aab`;
      await descargarAab(solicitud.id, nombre);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo descargar el .aab");
    } finally {
      setDescargando(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      fullWidth
      maxWidth="md"
      slotProps={{
        paper: {
          sx: {
            bgcolor: "#000",
            backgroundImage: "none",
            color: "#f4f4f5",
            border: "1px solid #27272a",
            borderRadius: 3,
            boxShadow: "0 24px 80px rgba(0,0,0,0.7)",
          },
        },
      }}
    >
      <DialogTitle sx={{ px: { xs: 2.5, sm: 3.5 }, pt: 3, pb: 2.5, borderBottom: "1px solid #242426" }}>
        <Box sx={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 2 }}>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="overline" sx={{ color: "#d4d4d8", fontWeight: 800, letterSpacing: 1.8, lineHeight: 1.5 }}>
              SOLICITUD DE APP
            </Typography>
            <Typography variant="h5" sx={{ fontWeight: 900, overflowWrap: "anywhere" }}>
              {solicitud.tenant?.nombre ?? `Tenant #${solicitud.tenantId}`}
            </Typography>
          </Box>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexShrink: 0 }}>
            <Chip size="small" label={statusLabel(solicitud.status)} color={statusColor(solicitud.status)} />
            <IconButton aria-label="Cerrar detalle de solicitud" onClick={onClose} sx={{ color: "#a1a1aa" }}>
              <Box component="svg" viewBox="0 0 24 24" sx={{ width: 20, height: 20, fill: "none", stroke: "currentColor", strokeWidth: 2 }}>
                <path d="m6 6 12 12M18 6 6 18" />
              </Box>
            </IconButton>
          </Box>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ px: { xs: 2.5, sm: 3.5 }, py: 3, bgcolor: "#000" }}>
        <Stack spacing={2.5}>
          {error && <Alert ref={avisoRef} severity="error">{error}</Alert>}

          <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap", alignItems: "center", pt: 1.5 }}>
            {solicitud.artifactPath && (
              <Button
                size="small"
                variant="contained"
                disabled={descargando}
                onClick={handleDescargar}
                startIcon={descargando ? <CircularProgress size={15} color="inherit" /> : undefined}
                sx={{
                  bgcolor: "#fff",
                  color: "#000",
                  fontWeight: 700,
                  "&:hover": { bgcolor: "#e5e5e5" },
                }}
              >
                {descargando ? "Descargando..." : "Descargar .aab"}
              </Button>
            )}
          </Box>

          <Box sx={{ px: 2, py: 1.5, borderRadius: 2, bgcolor: "#101012", border: "1px solid #242426" }}>
            <Typography variant="body2" sx={{ color: "#a1a1aa" }}>
              Solicitada por <Box component="span" sx={{ color: "#e4e4e7", fontWeight: 600 }}>{solicitud.requestedBy?.email ?? "—"}</Box>
              {" · "}{formatFecha(solicitud.createdAt)}
            </Typography>
          </Box>

          {solicitud.tenant && (
            <EditorSlug
              // Otra solicitud u otro slug: el editor arranca de cero.
              key={`${solicitud.id}:${solicitud.tenant.slug}`}
              tenantId={solicitud.tenantId}
              slug={solicitud.tenant.slug}
              onCambiado={(slug) => onSlugCambiado(solicitud.tenantId, slug)}
            />
          )}

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
              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1.5, p: 2, borderRadius: 2, bgcolor: "#101012", border: "1px solid #242426" }}>
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

              <Divider />
              <Typography sx={{ fontWeight: 800 }}>Assets para la ficha de Google Play</Typography>
              <Box sx={{ display: "flex", alignItems: "flex-end", gap: 2, flexWrap: "wrap" }}>
                <AssetPreview label="Ícono" url={solicitud.publishInfo.iconUrl} size={64} onDownloadError={setError} />
                <AssetPreview label="Imagen destacada" url={solicitud.publishInfo.featureGraphicUrl} width={160} height={78} onDownloadError={setError} />
              </Box>
              {solicitud.publishInfo.screenshotUrls?.length > 0 && (
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 1, display: "block", mb: 0.5 }}>
                    Capturas de pantalla ({solicitud.publishInfo.screenshotUrls.length})
                  </Typography>
                  <Box sx={{ display: "flex", gap: 1.25, flexWrap: "wrap" }}>
                    {solicitud.publishInfo.screenshotUrls.map((url, index) => (
                      <AssetImage
                        key={`${url}-${index}`}
                        label={`Captura ${index + 1}`}
                        url={url}
                        width={70}
                        height={124}
                        onDownloadError={setError}
                      />
                    ))}
                  </Box>
                </Box>
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
                    onClick={() => (confirmacionDeEstado(status) ? setPorConfirmar(status) : aplicar(status))}
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

      <Dialog
        open={porConfirmar !== null}
        onClose={() => setPorConfirmar(null)}
        slotProps={{ paper: { sx: { bgcolor: "#000", backgroundImage: "none", color: "#f4f4f5", border: "1px solid #27272a" } } }}
      >
        <DialogTitle>{porConfirmar ? confirmacionDeEstado(porConfirmar)?.titulo : ""}</DialogTitle>
        <DialogContent>
          <Typography>{porConfirmar ? confirmacionDeEstado(porConfirmar)?.mensaje : ""}</Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPorConfirmar(null)} disabled={aplicando !== null}>
            Volver
          </Button>
          <Button
            color="error"
            variant="contained"
            disabled={aplicando !== null}
            onClick={async () => {
              const estado = porConfirmar;
              setPorConfirmar(null);
              if (estado) await aplicar(estado);
            }}
          >
            {porConfirmar ? confirmacionDeEstado(porConfirmar)?.boton : "Confirmar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Dialog>
  );
}

/// El slug da el nombre del archivo de la APK y su applicationId. Si ya lo
/// usa otro tenant, la API responde 409 y el mensaje queda bajo el campo.
function EditorSlug({
  tenantId,
  slug,
  onCambiado,
}: {
  tenantId: number;
  slug: string;
  onCambiado: (slug: string) => void;
}) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(slug);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const normalizado = valor.trim().toLowerCase();
  const formatoValido = normalizado.length <= LARGO_MAXIMO_SLUG && FORMATO_SLUG.test(normalizado);
  const sinCambios = normalizado === slug;

  const guardar = async () => {
    setGuardando(true);
    setError("");

    try {
      const tenant = await cambiarSlugDeTenant(tenantId, normalizado);
      setEditando(false);
      onCambiado(tenant.slug);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cambiar el slug");
    } finally {
      setGuardando(false);
    }
  };

  if (!editando) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap" }}>
        <CampoDetalle label="Slug (nombre de la APK)" value={slug} />
        <Button size="small" variant="outlined" onClick={() => setEditando(true)}>
          Cambiar slug
        </Button>
      </Box>
    );
  }

  const errorDeFormato = normalizado && !formatoValido
    ? `Solo letras minúsculas, números y guiones simples (hasta ${LARGO_MAXIMO_SLUG} caracteres).`
    : "";

  return (
    <Stack spacing={1.5}>
      <TextField
        label="Slug (nombre de la APK)"
        size="small"
        value={valor}
        autoFocus
        disabled={guardando}
        onChange={(e) => {
          setValor(e.target.value);
          setError("");
        }}
        error={Boolean(error || errorDeFormato)}
        helperText={error || errorDeFormato || `La APK se va a llamar ${normalizado || "…"}.apk`}
        fullWidth
      />
      <Alert severity="warning">
        Las apps ya instaladas con el slug "{slug}" dejan de cargar este tenant, y la APK nueva
        tiene otro applicationId: se instala como una app aparte, no como actualización.
      </Alert>
      <Box sx={{ display: "flex", gap: 1 }}>
        <Button
          size="small"
          variant="contained"
          disabled={guardando || !formatoValido || sinCambios}
          onClick={guardar}
        >
          {guardando ? "Guardando..." : "Guardar slug"}
        </Button>
        <Button
          size="small"
          disabled={guardando}
          onClick={() => {
            setEditando(false);
            setValor(slug);
            setError("");
          }}
        >
          Cancelar
        </Button>
      </Box>
    </Stack>
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

function AssetPreview({
  label,
  url,
  size,
  width,
  height,
  onDownloadError,
}: {
  label: string;
  url?: string | null;
  size?: number;
  width?: number;
  height?: number;
  onDownloadError: (message: string) => void;
}) {
  if (!url) return null;

  return (
    <Box>
      <Typography variant="caption" color="text.secondary" sx={{ textTransform: "uppercase", letterSpacing: 1, display: "block", mb: 0.5 }}>
        {label}
      </Typography>
      <AssetImage label={label} url={url} width={size ?? width ?? 100} height={size ?? height ?? 100} onDownloadError={onDownloadError} />
    </Box>
  );
}

function AssetImage({
  label,
  url,
  width,
  height,
  onDownloadError,
}: {
  label: string;
  url: string;
  width: number;
  height: number;
  onDownloadError: (message: string) => void;
}) {
  const descargar = async (event: MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    event.stopPropagation();

    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error("La imagen no está disponible");

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const nombre = label
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const extensiones: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/gif": "gif",
        "image/avif": "avif",
        "image/svg+xml": "svg",
      };
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${nombre || "imagen"}.${extensiones[blob.type] ?? "img"}`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1000);
    } catch {
      onDownloadError(`No se pudo descargar ${label}. Verificá el acceso a la imagen e intentá de nuevo.`);
    }
  };

  return (
    <Box
      sx={{
        position: "relative",
        width,
        height,
        overflow: "hidden",
        borderRadius: 1.5,
        border: "1px solid #343438",
        bgcolor: "#111113",
        "&:hover .asset-download": { opacity: 1, transform: "translateY(0)" },
        "&:focus-within .asset-download": { opacity: 1, transform: "translateY(0)" },
        "&:hover img": { transform: "scale(1.04)", opacity: 0.8 },
      }}
    >
      <a href={url} target="_blank" rel="noreferrer" aria-label={`Ver ${label}`}>
        <Box
          component="img"
          src={url}
          alt={label}
          sx={{ width: "100%", height: "100%", objectFit: "cover", display: "block", transition: "transform 180ms ease, opacity 180ms ease" }}
        />
      </a>
      <Box
        component="a"
        className="asset-download"
        href={url}
        title={`Descargar ${label}`}
        aria-label={`Descargar ${label}`}
        onClick={descargar}
        sx={{
          position: "absolute",
          top: 0.75,
          right: 0.75,
          width: 30,
          height: 30,
          display: "grid",
          placeItems: "center",
          borderRadius: 2,
          color: "#fff",
          bgcolor: "rgba(10,10,12,0.88)",
          border: "1px solid rgba(255,255,255,0.22)",
          opacity: { xs: 1, sm: 0 },
          transform: { xs: "none", sm: "translateY(-4px)" },
          transition: "opacity 160ms ease, transform 160ms ease, background 160ms ease",
          "&:hover": { bgcolor: "#fff", color: "#000" },
          "&:focus-visible": { opacity: 1, transform: "translateY(0)", outline: "2px solid #fff", outlineOffset: 2 },
        }}
      >
        <svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <path d="m7 10 5 5 5-5M12 15V3" />
        </svg>
      </Box>
    </Box>
  );
}
