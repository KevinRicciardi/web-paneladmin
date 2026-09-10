import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  Stack,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from "@mui/material";
import type {
  BuildRequest,
  BuildRequestPublishInfoPayload,
  BuildRequestStatus,
  BuildRequestType,
  Perfil,
} from "../types";
import {
  crearSolicitud,
  editarSolicitud,
  listarMisSolicitudes,
} from "../services/buildRequests.service";

// Estados en los que ya no tiene sentido seguir operando sobre la
// solicitud — igual que en el backend (src/build-requests/build-requests.service.ts).
const ESTADOS_FINALES: Record<BuildRequestType, BuildRequestStatus[]> = {
  SELF_EXPORT: ["COMPLETED", "FAILED", "CANCELLED"],
  PINNACLE_PUBLISH: ["PUBLISHED", "FAILED", "CANCELLED"],
};

function esActiva(solicitud: BuildRequest) {
  return !ESTADOS_FINALES[solicitud.type].includes(solicitud.status);
}

const PASOS: Record<BuildRequestType, { status: BuildRequestStatus; label: string }[]> = {
  SELF_EXPORT: [
    { status: "PENDING", label: "Solicitud enviada" },
    { status: "IN_PROGRESS", label: "En revisión" },
    { status: "BUILDING", label: "Compilando" },
    { status: "COMPLETED", label: "Lista para descargar" },
  ],
  PINNACLE_PUBLISH: [
    { status: "PENDING", label: "Solicitud enviada" },
    { status: "IN_PROGRESS", label: "En revisión" },
    { status: "BUILDING", label: "Compilando" },
    { status: "COMPLETED", label: "Compilación lista" },
    { status: "PUBLISHED", label: "Publicada en Google Play" },
  ],
};

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

const EMPTY_PUBLISH_INFO: BuildRequestPublishInfoPayload = {
  developerName: "",
  contactEmail: "",
  supportEmail: "",
  websiteUrl: "",
  privacyPolicyUrl: "",
  shortDescription: "",
  appDescription: "",
  category: "",
  containsAds: false,
  targetAudience: "",
  additionalNotes: "",
};

export default function GenerarApp({ perfil }: { perfil: Perfil }) {
  const [solicitudes, setSolicitudes] = useState<BuildRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const cargar = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await listarMisSolicitudes();
      setSolicitudes(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar las solicitudes");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void cargar();
  }, []);

  if (perfil.rol !== "SUPER_ADMIN") {
    return (
      <Box>
        <Typography variant="h4" sx={{ fontWeight: 800, mb: 1.5 }}>
          Generar App
        </Typography>
        <Alert severity="info">
          Esta sección es para el SuperAdmin dueño del tenant. Si necesitás gestionar
          solicitudes de todos los clientes, usá "Solicitudes de Apps".
        </Alert>
      </Box>
    );
  }

  const ultima = solicitudes[0];
  const activa = ultima && esActiva(ultima) ? ultima : null;
  const historial = solicitudes.filter((s) => s.id !== activa?.id);

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 800, mb: 0.75 }}>
        Generar App
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3, maxWidth: 640 }}>
        Cuando tu aplicación esté lista, solicitá acá la generación del archivo para
        distribuirlo o pedile a nuestro equipo que lo publique por vos.
      </Typography>

      {error && (
        <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress />
        </Box>
      ) : activa ? (
        <EstadoEnVivo solicitud={activa} onActualizada={cargar} />
      ) : (
        <NuevaSolicitud onCreada={cargar} />
      )}

      {historial.length > 0 && (
        <Card variant="outlined" sx={{ mt: 3, bgcolor: "rgba(255,255,255,0.02)", borderColor: "divider" }}>
          <CardContent>
            <Typography sx={{ fontWeight: 800, mb: 2 }}>Historial</Typography>
            <Stack divider={<Divider />} spacing={0}>
              {historial.map((s) => (
                <Box key={s.id} sx={{ py: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, flexWrap: "wrap" }}>
                  <Box>
                    <Typography sx={{ fontWeight: 700 }}>
                      {s.type === "SELF_EXPORT" ? "Generar archivo" : "Publicación por Pinnacle"}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatFecha(s.createdAt)}
                    </Typography>
                  </Box>
                  <Chip size="small" label={statusLabel(s.status)} color={statusColor(s.status)} />
                </Box>
              ))}
            </Stack>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

function EstadoEnVivo({
  solicitud,
  onActualizada,
}: {
  solicitud: BuildRequest;
  onActualizada: () => void;
}) {
  const pasos = PASOS[solicitud.type];
  const pasoActivo = pasos.findIndex((p) => p.status === solicitud.status);

  return (
    <Card variant="outlined" sx={{ bgcolor: "rgba(255,255,255,0.03)", borderColor: "divider" }}>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3, gap: 2, flexWrap: "wrap" }}>
          <Box>
            <Typography sx={{ fontWeight: 800 }}>
              {solicitud.type === "SELF_EXPORT" ? "Generar archivo" : "Publicación por Pinnacle"}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Solicitada el {formatFecha(solicitud.createdAt)}
            </Typography>
          </Box>
          <Chip label={statusLabel(solicitud.status)} color={statusColor(solicitud.status)} sx={{ fontWeight: 700 }} />
        </Box>

        {solicitud.status === "WAITING_CLIENT" ? (
          <ReenvioSolicitud solicitud={solicitud} onActualizada={onActualizada} />
        ) : (
          <>
            <Stepper activeStep={pasoActivo} alternativeLabel sx={{ mb: 1 }}>
              {pasos.map((p) => (
                <Step key={p.status}>
                  <StepLabel>{p.label}</StepLabel>
                </Step>
              ))}
            </Stepper>

            {solicitud.status === "COMPLETED" && solicitud.type === "SELF_EXPORT" && (
              <Alert severity="success" sx={{ mt: 2 }}>
                La compilación está lista. Nuestro equipo se va a poner en contacto para
                hacerte llegar el archivo .aab.
              </Alert>
            )}

            {solicitud.status === "PUBLISHED" && (
              <Alert severity="success" sx={{ mt: 2 }}>
                Tu app ya está publicada en Google Play.
              </Alert>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ReenvioSolicitud({
  solicitud,
  onActualizada,
}: {
  solicitud: BuildRequest;
  onActualizada: () => void;
}) {
  const [notes, setNotes] = useState(solicitud.notes ?? "");
  const [publishInfo, setPublishInfo] = useState<BuildRequestPublishInfoPayload>(
    solicitud.publishInfo
      ? {
          ...EMPTY_PUBLISH_INFO,
          ...solicitud.publishInfo,
          websiteUrl: solicitud.publishInfo.websiteUrl ?? "",
          targetAudience: solicitud.publishInfo.targetAudience ?? "",
          additionalNotes: solicitud.publishInfo.additionalNotes ?? "",
        }
      : EMPTY_PUBLISH_INFO,
  );
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  const reenviar = async () => {
    setEnviando(true);
    setError("");

    try {
      await editarSolicitud(solicitud.id, {
        notes,
        publishInfo: solicitud.type === "PINNACLE_PUBLISH" ? publishInfo : undefined,
      });
      onActualizada();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo reenviar la solicitud");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Stack spacing={2.5}>
      <Alert severity="warning">
        Nuestro equipo necesita más información antes de seguir
        {solicitud.internalNotes ? `: ${solicitud.internalNotes}` : "."}
      </Alert>

      {error && <Alert severity="error">{error}</Alert>}

      <TextField
        label="Mensaje para el equipo de Pinnacle"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        multiline
        minRows={2}
        fullWidth
      />

      {solicitud.type === "PINNACLE_PUBLISH" && (
        <FormularioPublishInfo value={publishInfo} onChange={setPublishInfo} />
      )}

      <Button variant="contained" onClick={reenviar} disabled={enviando} sx={{ alignSelf: "flex-start" }}>
        {enviando ? "Reenviando..." : "Reenviar solicitud"}
      </Button>
    </Stack>
  );
}

function NuevaSolicitud({ onCreada }: { onCreada: () => void }) {
  const [type, setType] = useState<BuildRequestType | null>(null);
  const [notes, setNotes] = useState("");
  const [publishInfo, setPublishInfo] = useState<BuildRequestPublishInfoPayload>(EMPTY_PUBLISH_INFO);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  const enviar = async () => {
    if (!type) return;

    setEnviando(true);
    setError("");

    try {
      await crearSolicitud({
        type,
        notes: notes || undefined,
        publishInfo: type === "PINNACLE_PUBLISH" ? publishInfo : undefined,
      });
      onCreada();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo enviar la solicitud");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <Card variant="outlined" sx={{ bgcolor: "rgba(255,255,255,0.03)", borderColor: "divider" }}>
      <CardContent>
        <Typography sx={{ fontWeight: 800, mb: 2 }}>¿Qué necesitás?</Typography>

        <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2, mb: 3 }}>
          <Card
            variant="outlined"
            sx={{ borderColor: type === "SELF_EXPORT" ? "primary.main" : "divider", bgcolor: type === "SELF_EXPORT" ? "rgba(25,118,210,0.08)" : "transparent" }}
          >
            <CardActionArea onClick={() => setType("SELF_EXPORT")} sx={{ p: 2.5 }}>
              <Typography sx={{ fontWeight: 800, mb: 0.5 }}>Generar archivo</Typography>
              <Typography variant="body2" color="text.secondary">
                Quiero solo el archivo .aab para publicarlo yo mismo.
              </Typography>
            </CardActionArea>
          </Card>

          <Card
            variant="outlined"
            sx={{ borderColor: type === "PINNACLE_PUBLISH" ? "primary.main" : "divider", bgcolor: type === "PINNACLE_PUBLISH" ? "rgba(25,118,210,0.08)" : "transparent" }}
          >
            <CardActionArea onClick={() => setType("PINNACLE_PUBLISH")} sx={{ p: 2.5 }}>
              <Typography sx={{ fontWeight: 800, mb: 0.5 }}>Publicación por Pinnacle</Typography>
              <Typography variant="body2" color="text.secondary">
                Quiero que el equipo de Pinnacle publique la app en Google Play.
              </Typography>
            </CardActionArea>
          </Card>
        </Box>

        {type && (
          <Stack spacing={2.5}>
            {error && <Alert severity="error">{error}</Alert>}

            <TextField
              label="Mensaje para el equipo de Pinnacle (opcional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              multiline
              minRows={2}
              fullWidth
            />

            {type === "PINNACLE_PUBLISH" && (
              <FormularioPublishInfo value={publishInfo} onChange={setPublishInfo} />
            )}

            <Divider />

            <Button variant="contained" onClick={enviar} disabled={enviando} sx={{ alignSelf: "flex-start" }}>
              {enviando ? "Enviando..." : "Enviar solicitud"}
            </Button>
          </Stack>
        )}
      </CardContent>
    </Card>
  );
}

function FormularioPublishInfo({
  value,
  onChange,
}: {
  value: BuildRequestPublishInfoPayload;
  onChange: (value: BuildRequestPublishInfoPayload) => void;
}) {
  const setField = (field: keyof BuildRequestPublishInfoPayload, val: string | boolean) => {
    onChange({ ...value, [field]: val });
  };

  return (
    <Stack spacing={2}>
      <Typography sx={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: "text.secondary" }}>
        Datos para Google Play
      </Typography>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
        <TextField label="Nombre del desarrollador/empresa" value={value.developerName} onChange={(e) => setField("developerName", e.target.value)} fullWidth required />
        <TextField label="Correo de contacto" type="email" value={value.contactEmail} onChange={(e) => setField("contactEmail", e.target.value)} fullWidth required />
        <TextField label="Correo de soporte" type="email" value={value.supportEmail} onChange={(e) => setField("supportEmail", e.target.value)} fullWidth required />
        <TextField label="Sitio web (opcional)" value={value.websiteUrl} onChange={(e) => setField("websiteUrl", e.target.value)} fullWidth />
        <TextField label="Política de privacidad" value={value.privacyPolicyUrl} onChange={(e) => setField("privacyPolicyUrl", e.target.value)} fullWidth required />
        <TextField label="Categoría" value={value.category} onChange={(e) => setField("category", e.target.value)} fullWidth required />
        <TextField label="Público objetivo (opcional)" placeholder="Ej: Todos, +18" value={value.targetAudience} onChange={(e) => setField("targetAudience", e.target.value)} fullWidth />
      </Box>

      <TextField
        label="Descripción corta (hasta 80 caracteres)"
        value={value.shortDescription}
        onChange={(e) => setField("shortDescription", e.target.value.slice(0, 80))}
        helperText={`${value.shortDescription.length}/80`}
        fullWidth
        required
      />

      <TextField
        label="Descripción completa de la app"
        value={value.appDescription}
        onChange={(e) => setField("appDescription", e.target.value)}
        multiline
        minRows={3}
        fullWidth
        required
      />

      <FormControlLabel
        control={<Checkbox checked={Boolean(value.containsAds)} onChange={(e) => setField("containsAds", e.target.checked)} />}
        label="La app contiene anuncios"
      />

      <TextField
        label="Información adicional para Google Play (opcional)"
        value={value.additionalNotes}
        onChange={(e) => setField("additionalNotes", e.target.value)}
        multiline
        minRows={2}
        fullWidth
      />
    </Stack>
  );
}
