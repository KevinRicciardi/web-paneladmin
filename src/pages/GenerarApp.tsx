import { useEffect, useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Divider,
  FormControlLabel,
  IconButton,
  Snackbar,
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
  Perfil,
} from "../types";
import {
  crearSolicitud,
  editarSolicitud,
  listarMisSolicitudes,
} from "../services/buildRequests.service";
import { subirACloudinary } from "../utils/cloudinary";

const MIN_SCREENSHOTS = 2;
const MAX_SCREENSHOTS = 8;

// Estados en los que ya no tiene sentido seguir operando sobre la
// solicitud — igual que en el backend (src/build-requests/build-requests.service.ts).
const ESTADOS_FINALES: BuildRequestStatus[] = ["PUBLISHED", "FAILED", "CANCELLED"];

function esActiva(solicitud: BuildRequest) {
  return !ESTADOS_FINALES.includes(solicitud.status);
}

function ErrorSnackbar({ error, onClose }: { error: string; onClose: () => void }) {
  return (
    <Snackbar
      open={Boolean(error)}
      autoHideDuration={6000}
      onClose={onClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
    >
      <Alert severity="error" onClose={onClose} variant="filled" sx={{ width: "100%" }}>
        {error}
      </Alert>
    </Snackbar>
  );
}

function validarAssets(publishInfo: BuildRequestPublishInfoPayload): string {
  if (!publishInfo.iconUrl) return "Falta el ícono de la app";
  if (!publishInfo.featureGraphicUrl) return "Falta la imagen destacada";
  if (publishInfo.screenshotUrls.length < MIN_SCREENSHOTS) {
    return `Subí al menos ${MIN_SCREENSHOTS} capturas de pantalla`;
  }
  return "";
}

const PASOS: { status: BuildRequestStatus; label: string }[] = [
  { status: "PENDING", label: "Solicitud enviada" },
  { status: "IN_PROGRESS", label: "En revisión" },
  { status: "BUILDING", label: "Compilando" },
  { status: "COMPLETED", label: "Compilación lista" },
  { status: "PUBLISHED", label: "Publicada en Google Play" },
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
  iconUrl: "",
  featureGraphicUrl: "",
  screenshotUrls: [],
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
        Cuando tu aplicación esté lista, solicitá acá que el equipo de Pinnacle la
        publique en Google Play.
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
                    <Typography sx={{ fontWeight: 700 }}>Publicación por Pinnacle</Typography>
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
  const pasoActivo = PASOS.findIndex((p) => p.status === solicitud.status);

  return (
    <Card variant="outlined" sx={{ bgcolor: "rgba(255,255,255,0.03)", borderColor: "divider" }}>
      <CardContent>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 3, gap: 2, flexWrap: "wrap" }}>
          <Box>
            <Typography sx={{ fontWeight: 800 }}>Publicación por Pinnacle</Typography>
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
              {PASOS.map((p) => (
                <Step key={p.status}>
                  <StepLabel>{p.label}</StepLabel>
                </Step>
              ))}
            </Stepper>

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
          screenshotUrls: solicitud.publishInfo.screenshotUrls ?? [],
        }
      : EMPTY_PUBLISH_INFO,
  );
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  const reenviar = async () => {
    const errorAssets = validarAssets(publishInfo);
    if (errorAssets) {
      setError(errorAssets);
      return;
    }

    setEnviando(true);
    setError("");

    try {
      await editarSolicitud(solicitud.id, { notes, publishInfo });
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

      <ErrorSnackbar error={error} onClose={() => setError("")} />

      <TextField
        label="Mensaje para el equipo de Pinnacle"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        multiline
        minRows={2}
        fullWidth
      />

      <FormularioPublishInfo value={publishInfo} onChange={setPublishInfo} />

      <Button variant="contained" onClick={reenviar} disabled={enviando} sx={{ alignSelf: "flex-start" }}>
        {enviando ? "Reenviando..." : "Reenviar solicitud"}
      </Button>
    </Stack>
  );
}

function NuevaSolicitud({ onCreada }: { onCreada: () => void }) {
  const [notes, setNotes] = useState("");
  const [publishInfo, setPublishInfo] = useState<BuildRequestPublishInfoPayload>(EMPTY_PUBLISH_INFO);
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState("");

  const enviar = async () => {
    const errorAssets = validarAssets(publishInfo);
    if (errorAssets) {
      setError(errorAssets);
      return;
    }

    setEnviando(true);
    setError("");

    try {
      await crearSolicitud({ notes: notes || undefined, publishInfo });
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
        <Typography sx={{ fontWeight: 800, mb: 0.5 }}>Solicitar publicación</Typography>
        <Typography color="text.secondary" sx={{ mb: 3 }}>
          Completá los datos para que el equipo de Pinnacle publique tu app en Google Play.
        </Typography>

        <Stack spacing={2.5}>
          <ErrorSnackbar error={error} onClose={() => setError("")} />

          <TextField
            label="Mensaje para el equipo de Pinnacle (opcional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            minRows={2}
            fullWidth
          />

          <FormularioPublishInfo value={publishInfo} onChange={setPublishInfo} />

          <Divider />

          <Button variant="contained" onClick={enviar} disabled={enviando} sx={{ alignSelf: "flex-start" }}>
            {enviando ? "Enviando..." : "Enviar solicitud"}
          </Button>
        </Stack>
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
  const setField = (
    field: keyof BuildRequestPublishInfoPayload,
    val: string | boolean | string[],
  ) => {
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

      <Divider />

      <Box>
        <Typography sx={{ fontSize: 12, fontWeight: 800, textTransform: "uppercase", letterSpacing: 1, color: "text.secondary", mb: 0.5 }}>
          Assets para la ficha de Google Play
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Sin estas imágenes, Google no deja publicar la app.
        </Typography>
      </Box>

      <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 2 }}>
        <ImageUploadBox
          label="Ícono de la app"
          hint="Cuadrado, 512×512px"
          url={value.iconUrl}
          onUploaded={(url) => setField("iconUrl", url)}
          onRemove={() => setField("iconUrl", "")}
        />
        <ImageUploadBox
          label="Imagen destacada"
          hint="1024×500px"
          url={value.featureGraphicUrl}
          onUploaded={(url) => setField("featureGraphicUrl", url)}
          onRemove={() => setField("featureGraphicUrl", "")}
        />
      </Box>

      <ScreenshotsUploadBox
        urls={value.screenshotUrls}
        onChange={(urls) => setField("screenshotUrls", urls)}
      />
    </Stack>
  );
}

function ImageUploadBox({
  label,
  hint,
  url,
  onUploaded,
  onRemove,
}: {
  label: string;
  hint: string;
  url: string;
  onUploaded: (url: string) => void;
  onRemove: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setSubiendo(true);
    setError("");
    try {
      const subida = await subirACloudinary(file);
      onUploaded(subida);
    } catch {
      setError("No se pudo subir la imagen");
    } finally {
      setSubiendo(false);
    }
  };

  return (
    <Box>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        hidden
        onChange={(e) => void handleFile(e.target.files?.[0])}
      />
      <Box
        onClick={() => !subiendo && inputRef.current?.click()}
        sx={{
          border: "2px dashed",
          borderColor: url ? "primary.main" : "divider",
          borderRadius: 2,
          p: 2,
          textAlign: "center",
          cursor: "pointer",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: 0.5,
          minHeight: 120,
          bgcolor: "rgba(255,255,255,0.02)",
        }}
      >
        {subiendo ? (
          <CircularProgress size={28} />
        ) : url ? (
          <Box component="img" src={url} sx={{ maxHeight: 90, maxWidth: "100%", objectFit: "contain", borderRadius: 1 }} />
        ) : (
          <>
            <span className="material-symbols-outlined">file_upload</span>
            <Typography variant="body2">{label}</Typography>
          </>
        )}
        <Typography variant="caption" color="text.secondary">{hint}</Typography>
      </Box>
      {url && (
        <Button size="small" color="error" onClick={onRemove} sx={{ mt: 0.5 }}>
          Quitar
        </Button>
      )}
      {error && <Typography variant="caption" color="error">{error}</Typography>}
    </Box>
  );
}

function ScreenshotsUploadBox({
  urls,
  onChange,
}: {
  urls: string[];
  onChange: (urls: string[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState("");

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const disponibles = MAX_SCREENSHOTS - urls.length;
    const aSubir = Array.from(files).slice(0, Math.max(disponibles, 0));

    if (aSubir.length === 0) {
      setError(`Ya tenés el máximo de ${MAX_SCREENSHOTS} capturas`);
      return;
    }

    setSubiendo(true);
    setError("");
    try {
      const subidas = await Promise.all(aSubir.map((file) => subirACloudinary(file)));
      onChange([...urls, ...subidas]);
    } catch {
      setError("No se pudieron subir una o más capturas");
    } finally {
      setSubiendo(false);
    }
  };

  const quitar = (index: number) => {
    onChange(urls.filter((_, i) => i !== index));
  };

  const faltan = Math.max(MIN_SCREENSHOTS - urls.length, 0);

  return (
    <Box>
      <Typography sx={{ mb: 1 }}>
        Capturas de pantalla ({urls.length}/{MAX_SCREENSHOTS}, mínimo {MIN_SCREENSHOTS})
      </Typography>

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg"
        multiple
        hidden
        onChange={(e) => void handleFiles(e.target.files)}
      />

      <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
        {urls.map((url, index) => (
          <Box key={url} sx={{ position: "relative" }}>
            <Box
              component="img"
              src={url}
              sx={{ width: 90, height: 160, objectFit: "cover", borderRadius: 1, border: "1px solid", borderColor: "divider" }}
            />
            <IconButton
              size="small"
              onClick={() => quitar(index)}
              sx={{ position: "absolute", top: -8, right: -8, bgcolor: "background.paper", "&:hover": { bgcolor: "background.paper" } }}
            >
              <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
            </IconButton>
          </Box>
        ))}

        {urls.length < MAX_SCREENSHOTS && (
          <Box
            onClick={() => !subiendo && inputRef.current?.click()}
            sx={{
              width: 90,
              height: 160,
              border: "2px dashed",
              borderColor: "divider",
              borderRadius: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              bgcolor: "rgba(255,255,255,0.02)",
            }}
          >
            {subiendo ? <CircularProgress size={24} /> : <span className="material-symbols-outlined">add</span>}
          </Box>
        )}
      </Box>

      {faltan > 0 && (
        <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 0.5 }}>
          Faltan {faltan} captura{faltan === 1 ? "" : "s"} más
        </Typography>
      )}
      {error && <Typography variant="caption" color="error" sx={{ display: "block", mt: 0.5 }}>{error}</Typography>}
    </Box>
  );
}
