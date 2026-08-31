import { useEffect, useState } from "react";
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
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { CARGOS_ADMINISTRADOR, type Administrador } from "../types";
import {
  cancelarInvitacion,
  invitarAdministrador,
  listarAdministradores,
  reenviarInvitacion,
} from "../services/administradores.service";

function formatFecha(value: string) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
}

function estadoChip(status: Administrador["status"]) {
  return status === "ACTIVE"
    ? { label: "Activo", color: "success" as const }
    : { label: "Pendiente de activación", color: "warning" as const };
}

export default function Administradores() {
  const [administradores, setAdministradores] = useState<Administrador[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [modalAbierto, setModalAbierto] = useState(false);
  const [email, setEmail] = useState("");
  const [cargo, setCargo] = useState("");
  const [invitando, setInvitando] = useState(false);
  const [errorModal, setErrorModal] = useState("");

  const [accionandoId, setAccionandoId] = useState<number | null>(null);
  const [aCancelar, setACancelar] = useState<Administrador | null>(null);
  const [cancelando, setCancelando] = useState(false);

  const cargar = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await listarAdministradores();
      setAdministradores(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los administradores");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void cargar();
  }, []);

  useEffect(() => {
    if (!success) return;
    const timer = window.setTimeout(() => setSuccess(""), 3000);
    return () => window.clearTimeout(timer);
  }, [success]);

  const abrirModal = () => {
    setEmail("");
    setCargo("");
    setErrorModal("");
    setModalAbierto(true);
  };

  const enviarInvitacion = async () => {
    if (!email.trim()) {
      setErrorModal("Ingresá un email.");
      return;
    }

    setInvitando(true);
    setErrorModal("");

    try {
      await invitarAdministrador(email.trim(), cargo || undefined);
      setModalAbierto(false);
      setSuccess("Invitación enviada correctamente.");
      await cargar();
    } catch (err) {
      setErrorModal(err instanceof Error ? err.message : "No se pudo enviar la invitación");
    } finally {
      setInvitando(false);
    }
  };

  const reenviar = async (admin: Administrador) => {
    setAccionandoId(admin.id);
    setError("");

    try {
      await reenviarInvitacion(admin.id);
      setSuccess(`Invitación reenviada a ${admin.email}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo reenviar la invitación");
    } finally {
      setAccionandoId(null);
    }
  };

  const confirmarCancelar = async () => {
    if (!aCancelar) return;

    setCancelando(true);
    setError("");

    try {
      await cancelarInvitacion(aCancelar.id);
      setSuccess(`Invitación a ${aCancelar.email} cancelada.`);
      setACancelar(null);
      await cargar();
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo cancelar la invitación");
    } finally {
      setCancelando(false);
    }
  };

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
            Administradores
          </Typography>
          <Typography color="text.secondary">
            Invitá y gestioná a los administradores internos de tu equipo.
          </Typography>
        </Box>

        <Button
          variant="contained"
          onClick={abrirModal}
          startIcon={<span className="material-symbols-outlined">add</span>}
          sx={{ fontWeight: 800 }}
        >
          Invitar administrador
        </Button>
      </Box>

      {(error || success) && (
        <Stack spacing={1.5} sx={{ mb: 2 }}>
          {error && (
            <Alert severity="error" onClose={() => setError("")}>
              {error}
            </Alert>
          )}
          {success && (
            <Alert severity="success" onClose={() => setSuccess("")}>
              {success}
            </Alert>
          )}
        </Stack>
      )}

      <Card variant="outlined" sx={{ bgcolor: "rgba(255,255,255,0.03)", borderColor: "divider" }}>
        <CardContent sx={{ p: 0 }}>
          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
              <CircularProgress />
            </Box>
          ) : administradores.length === 0 ? (
            <Box sx={{ textAlign: "center", py: 8, px: 3 }}>
              <Typography variant="h6" sx={{ fontWeight: 800, mb: 1 }}>
                Todavía no invitaste a ningún administrador
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                Invitá a alguien de tu equipo para que te ayude a gestionar la aplicación.
              </Typography>
              <Button variant="contained" onClick={abrirModal}>
                Invitar administrador
              </Button>
            </Box>
          ) : (
            <Stack divider={<Divider />}>
              {administradores.map((admin) => {
                const chip = estadoChip(admin.status);
                const pendiente = admin.status === "PENDING_ACTIVATION";

                return (
                  <Box
                    key={admin.id}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 2,
                      flexWrap: "wrap",
                      p: 2.5,
                    }}
                  >
                    <Box sx={{ minWidth: 0 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5, flexWrap: "wrap" }}>
                        <Typography sx={{ fontWeight: 800 }}>{admin.email}</Typography>
                        <Chip
                          size="small"
                          label={chip.label}
                          color={chip.color}
                          sx={{ textTransform: "uppercase", fontWeight: 700 }}
                        />
                      </Box>
                      <Typography color="text.secondary" variant="body2">
                        {admin.cargo || "Sin cargo asignado"} · Invitado el {formatFecha(admin.createdAt)}
                      </Typography>
                    </Box>

                    {pendiente && (
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          variant="outlined"
                          disabled={accionandoId === admin.id}
                          onClick={() => reenviar(admin)}
                        >
                          {accionandoId === admin.id ? "Enviando..." : "Reenviar invitación"}
                        </Button>
                        <Button size="small" color="error" onClick={() => setACancelar(admin)}>
                          Cancelar invitación
                        </Button>
                      </Stack>
                    )}
                  </Box>
                );
              })}
            </Stack>
          )}
        </CardContent>
      </Card>

      <Dialog open={modalAbierto} onClose={() => !invitando && setModalAbierto(false)} fullWidth maxWidth="xs">
        <DialogTitle>Invitar administrador</DialogTitle>
        <DialogContent>
          <Stack spacing={2.5} sx={{ mt: 1 }}>
            {errorModal && <Alert severity="error">{errorModal}</Alert>}

            <TextField
              label="Correo electrónico"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
              autoFocus
            />

            <TextField
              select
              label="Cargo"
              value={cargo}
              onChange={(e) => setCargo(e.target.value)}
              fullWidth
            >
              <MenuItem value="">
                <em>Sin especificar</em>
              </MenuItem>
              {CARGOS_ADMINISTRADOR.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </TextField>

            <Typography variant="caption" color="text.secondary">
              Le vamos a mandar un email con un link para que defina su contraseña. No se envía ninguna
              contraseña por correo.
            </Typography>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModalAbierto(false)} disabled={invitando}>
            Cancelar
          </Button>
          <Button variant="contained" onClick={enviarInvitacion} disabled={invitando}>
            {invitando ? "Enviando..." : "Invitar"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(aCancelar)} onClose={() => setACancelar(null)}>
        <DialogTitle>Cancelar invitación</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Cancelar la invitación a "{aCancelar?.email}"? Esta acción no se puede deshacer.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setACancelar(null)} disabled={cancelando}>
            Volver
          </Button>
          <Button color="error" variant="contained" onClick={confirmarCancelar} disabled={cancelando}>
            {cancelando ? <CircularProgress size={18} color="inherit" /> : "Cancelar invitación"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
