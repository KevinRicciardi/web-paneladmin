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
  FormControl,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { CARGOS_ADMINISTRADOR, type Administrador } from "../types";
import type { Perfil } from "../types";
import {
  actualizarRolAdministrador,
  cancelarInvitacion,
  invitarAdministrador,
  invitarSuperAdministrador,
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

const SUPER_ADMIN_CARGO = "ROLE:SUPER_ADMIN";
const ADMIN_SIN_CARGO = "ROLE:ADMIN";
const ADMIN_CARGO_PREFIX = "CARGO:ADMIN:";
type ValorCargo = string;
const NOMBRE_ROL: Record<Administrador["rol"], string> = {
  MEGA_ADMIN: "Mega administrador",
  SUPER_ADMIN: "Super administrador",
  ADMIN: "Administrador",
  MODERADOR: "Moderador",
  USUARIO_FINAL: "Usuario final",
};

function valorCargoActual(admin: Administrador): ValorCargo {
  const rol = rolAdministrador(admin.rol);
  if (rol === "SUPER_ADMIN") return SUPER_ADMIN_CARGO;
  if (rol === "ADMIN") {
    return admin.cargo ? `${ADMIN_CARGO_PREFIX}${admin.cargo}` : ADMIN_SIN_CARGO;
  }
  if (rol) return `ROLE:${rol}`;
  return admin.cargo ? `${ADMIN_CARGO_PREFIX}${admin.cargo}` : "";
}

function rolAdministrador(value: unknown): Administrador["rol"] | undefined {
  if (typeof value !== "string") return undefined;
  return Object.prototype.hasOwnProperty.call(NOMBRE_ROL, value)
    ? (value as Administrador["rol"])
    : undefined;
}

function etiquetaCargoActual(admin: Administrador) {
  const rol = rolAdministrador(admin.rol);
  if (rol === "ADMIN") return admin.cargo || NOMBRE_ROL.ADMIN;
  if (rol) return NOMBRE_ROL[rol];
  return admin.cargo || "Cargo no disponible";
}

function etiquetaValorCargo(value: ValorCargo) {
  if (value === SUPER_ADMIN_CARGO) {
    return NOMBRE_ROL.SUPER_ADMIN;
  }
  if (value === ADMIN_SIN_CARGO || value === "ADMIN") {
    return NOMBRE_ROL.ADMIN;
  }
  if (value.startsWith(ADMIN_CARGO_PREFIX)) {
    return value.slice(ADMIN_CARGO_PREFIX.length);
  }
  if (value.startsWith("ROLE:")) {
    const rol = value.slice("ROLE:".length) as Administrador["rol"];
    return NOMBRE_ROL[rol] || rol;
  }
  return value;
}

export default function Administradores({ perfil }: { perfil: Perfil }) {
  const [administradores, setAdministradores] = useState<Administrador[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [modalAbierto, setModalAbierto] = useState(false);
  const [email, setEmail] = useState("");
  const [cargoInvitado, setCargoInvitado] = useState("");
  const [invitando, setInvitando] = useState(false);
  const [errorModal, setErrorModal] = useState("");

  const [accionandoId, setAccionandoId] = useState<number | null>(null);
  const [guardandoCambios, setGuardandoCambios] = useState(false);
  const [cambiosPendientes, setCambiosPendientes] = useState<Record<number, ValorCargo>>({});
  const [aCancelar, setACancelar] = useState<Administrador | null>(null);
  const [cancelando, setCancelando] = useState(false);

  const cargar = async () => {
    setLoading(true);
    setError("");

    try {
      const data = await listarAdministradores();
      setAdministradores(data);
      setCambiosPendientes({});
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudieron cargar los administradores");
    } finally {
      setLoading(false);
    }
  };

  const valorCargoPendiente = (admin: Administrador) =>
    cambiosPendientes[admin.id] ?? valorCargoActual(admin);

  const descartarCambios = () => setCambiosPendientes({});

  const guardarCambios = async () => {
    const pendientes = administradores.filter(
      (admin) =>
        admin.id !== perfil.id &&
        cambiosPendientes[admin.id] !== undefined &&
        cambiosPendientes[admin.id] !== valorCargoActual(admin),
    );
    if (pendientes.length === 0) return;

    setGuardandoCambios(true);
    setError("");
    const errores: string[] = [];
    let guardados = 0;

    for (const admin of pendientes) {
      const value = cambiosPendientes[admin.id];
      let rol: Administrador["rol"];
      let cargo: string | null = null;

      if (value === SUPER_ADMIN_CARGO || value === "ROLE:SUPER_ADMIN") {
        rol = "SUPER_ADMIN";
      } else if (value === ADMIN_SIN_CARGO || value === "ROLE:ADMIN" || value === "ADMIN") {
        rol = "ADMIN";
      } else if (value.startsWith(ADMIN_CARGO_PREFIX)) {
        rol = "ADMIN";
        cargo = value.slice(ADMIN_CARGO_PREFIX.length);
      } else if (CARGOS_ADMINISTRADOR.some((cargoDisponible) => cargoDisponible === value)) {
        rol = "ADMIN";
        cargo = value;
      } else {
        errores.push(`${admin.email}: el cargo seleccionado no es válido`);
        continue;
      }

      if (admin.rol === rol && (admin.cargo || null) === cargo) {
        setCambiosPendientes((actuales) => {
          const siguientes = { ...actuales };
          delete siguientes[admin.id];
          return siguientes;
        });
        continue;
      }

      try {
        const actualizado = await actualizarRolAdministrador(admin.id, rol, cargo);
        setAdministradores((usuarios) =>
          usuarios.map((usuario) =>
            usuario.id === admin.id
              ? { ...usuario, rol: actualizado.rol, cargo: actualizado.cargo }
              : usuario,
          ),
        );
        setCambiosPendientes((actuales) => {
          const siguientes = { ...actuales };
          delete siguientes[admin.id];
          return siguientes;
        });
        guardados += 1;
      } catch (err) {
        errores.push(
          `${admin.email}: ${err instanceof Error ? err.message : "error al guardar"}`,
        );
      }
    }

    setGuardandoCambios(false);
    if (errores.length > 0) {
      setError(`No se pudieron guardar algunos cambios: ${errores.join("; ")}`);
    }
    if (guardados > 0) {
      setSuccess(
        guardados === 1
          ? "Se guardó 1 cambio."
          : `Se guardaron ${guardados} cambios.`,
      );
    }
  };

  const hayCambiosPendientes = administradores.some(
    (admin) =>
      admin.id !== perfil.id &&
      cambiosPendientes[admin.id] !== undefined &&
      cambiosPendientes[admin.id] !== valorCargoActual(admin),
  );

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
    setCargoInvitado("");
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
      if (cargoInvitado === SUPER_ADMIN_CARGO) {
        await invitarSuperAdministrador(email.trim());
      } else {
        if (!CARGOS_ADMINISTRADOR.some((cargoDisponible) => cargoDisponible === cargoInvitado)) {
          setErrorModal("Elegí un cargo.");
          return;
        }
        await invitarAdministrador(email.trim(), cargoInvitado);
      }
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
            Invitá usuarios y gestioná los roles y cargos de tu equipo.
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
                Todavía no hay usuarios en este equipo
              </Typography>
              <Typography color="text.secondary" sx={{ mb: 3 }}>
                Invitá a alguien de tu equipo para que tenga acceso a la aplicación.
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
                        {etiquetaCargoActual(admin)}
                        {" · Invitado el "}{formatFecha(admin.createdAt)}
                      </Typography>
                    </Box>

                    <Stack
                      direction="row"
                      spacing={1}
                      sx={{ alignItems: "center", flexWrap: "wrap" }}
                    >
                      {perfil.rol === "SUPER_ADMIN" && admin.id !== perfil.id && (
                        <FormControl size="small" sx={{ minWidth: 220 }}>
                          <Select
                            value={valorCargoPendiente(admin)}
                            displayEmpty
                            disabled={guardandoCambios}
                            renderValue={(value) =>
                              value ? etiquetaValorCargo(value) : "Rol no disponible"
                            }
                            onChange={(event) => {
                              setCambiosPendientes((pendientes) => ({
                                ...pendientes,
                                [admin.id]: event.target.value,
                              }));
                            }}
                          >
                            <MenuItem value={SUPER_ADMIN_CARGO}>
                              {NOMBRE_ROL.SUPER_ADMIN}
                            </MenuItem>
                            <MenuItem value={ADMIN_SIN_CARGO}>
                              {NOMBRE_ROL.ADMIN}
                            </MenuItem>
                            {admin.rol === "ADMIN" &&
                              admin.cargo &&
                              !CARGOS_ADMINISTRADOR.some(
                                (cargoDisponible) => cargoDisponible === admin.cargo,
                              ) && (
                                <MenuItem
                                  value={`${ADMIN_CARGO_PREFIX}${admin.cargo}`}
                                >
                                  {admin.cargo}
                                </MenuItem>
                              )}
                            {CARGOS_ADMINISTRADOR.map((cargoDisponible) => (
                              <MenuItem
                                key={cargoDisponible}
                                value={`${ADMIN_CARGO_PREFIX}${cargoDisponible}`}
                              >
                                {cargoDisponible}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      )}
                      {pendiente && (
                        <>
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
                        </>
                      )}
                    </Stack>
                  </Box>
                );
              })}
            </Stack>
          )}
        </CardContent>
      </Card>

      {perfil.rol === "SUPER_ADMIN" && (
        <Stack
          direction="row"
          spacing={1}
          sx={{ justifyContent: "flex-end", mt: 2 }}
        >
          <Button
            disabled={guardandoCambios || !hayCambiosPendientes}
            onClick={descartarCambios}
          >
            Descartar cambios
          </Button>
          <Button
            variant="contained"
            disabled={guardandoCambios || !hayCambiosPendientes}
            onClick={() => void guardarCambios()}
          >
            {guardandoCambios ? "Guardando..." : "Guardar cambios"}
          </Button>
        </Stack>
      )}

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
              value={cargoInvitado}
              onChange={(e) => setCargoInvitado(e.target.value)}
              fullWidth
            >
              <MenuItem value="">
                <em>Elegir cargo</em>
              </MenuItem>
              {CARGOS_ADMINISTRADOR.map((cargoDisponible) => (
                <MenuItem key={cargoDisponible} value={cargoDisponible}>
                  {cargoDisponible}
                </MenuItem>
              ))}
              <MenuItem value={SUPER_ADMIN_CARGO}>Super administrador</MenuItem>
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
