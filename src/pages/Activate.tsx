// Página que abre los links de los correos de Firebase: verificar el correo,
// elegir contraseña (invitación de admin o "olvidé mi contraseña"), recuperar
// el correo y confirmar un cambio de correo. Reemplaza la página por defecto de
// Firebase una vez configurada en la consola (Authentication > Templates >
// "Customize action URL" = <panel>/activate). La lógica está en
// utils/accionCorreo.ts.
import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, ReactNode } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  applyActionCode,
  checkActionCode,
  confirmPasswordReset,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  verifyPasswordResetCode,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { Alert, Box, Button, Card, CardContent, CircularProgress, Container, Stack, TextField, Typography } from "@mui/material";
import { auth } from "../firebase";
import { leerAccion, llegoSinDatos, mensajeDeError, TEXTOS } from "../utils/accionCorreo";

type Fase =
  | { tipo: "cargando" }
  | { tipo: "error"; mensaje: string }
  | { tipo: "sinDatos" }
  | { tipo: "elegirClave"; email: string }
  | { tipo: "listo"; titulo: string; mensaje: ReactNode; recuperarClaveDe?: string };

const codigoDe = (error: unknown) => (error instanceof FirebaseError ? error.code : undefined);

// Íconos dibujados acá (no con la fuente de íconos): se ven apenas carga la
// página, sin esperar a que baje la fuente.
const TRAZOS = {
  ok: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 12.5l2.7 2.7L16 9.8" />
    </>
  ),
  aviso: (
    <>
      <path d="M12 4.5l8.5 15h-17z" />
      <path d="M12 10.5v3.5" />
      <path d="M12 17v.01" />
    </>
  ),
  clave: (
    <>
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </>
  ),
  invitacion: (
    <>
      <circle cx="10" cy="8" r="3.5" />
      <path d="M3.5 19.5a6.5 6.5 0 0 1 13 0" />
      <path d="M16 11.5l1.8 1.8L21 10" />
    </>
  ),
};

function Icono({ nombre, color }: { nombre: keyof typeof TRAZOS; color: string }) {
  return (
    <Box
      sx={{
        width: 56,
        height: 56,
        borderRadius: "50%",
        display: "grid",
        placeItems: "center",
        bgcolor: `${color}1f`,
        color,
        // alignSelf: centrado dentro de un Stack (que le pisa el margen); mx: fuera de él.
        alignSelf: "center",
        mx: "auto",
        mb: 2,
        flexShrink: 0,
      }}
    >
      <svg
        viewBox="0 0 24 24"
        width="28"
        height="28"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        {TRAZOS[nombre]}
      </svg>
    </Box>
  );
}

export default function Activate() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const accion = useMemo(() => leerAccion(searchParams, window.location.origin), [searchParams]);

  const [fase, setFase] = useState<Fase>(() => {
    if (llegoSinDatos(searchParams)) return { tipo: "sinDatos" };
    if (!accion.modo || !accion.oobCode) {
      return { tipo: "error", mensaje: "Este enlace no es válido o está incompleto. Abrilo de nuevo desde el correo." };
    }
    return { tipo: "cargando" };
  });
  const [password, setPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");
  const [errorForm, setErrorForm] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [avisoRecuperar, setAvisoRecuperar] = useState("");

  // Un código se puede usar una sola vez: en desarrollo React monta el efecto
  // dos veces, y la segunda vez Firebase diría "enlace ya usado".
  const procesado = useRef<string | null>(null);

  useEffect(() => {
    const { modo, oobCode, esInvitacion } = accion;
    if (!modo || !oobCode || procesado.current === oobCode) return;
    procesado.current = oobCode;
    document.title = accion.esInvitacion ? "Activar cuenta" : TEXTOS[modo].titulo;

    const fallo = (error: unknown) => {
      console.error(error);
      setFase({ tipo: "error", mensaje: mensajeDeError(codigoDe(error), modo, esInvitacion) });
    };

    if (modo === "verifyEmail") {
      applyActionCode(auth, oobCode)
        .then(() =>
          setFase({
            tipo: "listo",
            titulo: "¡Correo verificado!",
            mensaje: "Ya podés volver a la página o a la app donde te estabas registrando: se actualiza sola.",
          }),
        )
        .catch(fallo);
    } else if (modo === "resetPassword") {
      verifyPasswordResetCode(auth, oobCode)
        .then((email) => setFase({ tipo: "elegirClave", email }))
        .catch(fallo);
    } else if (modo === "recoverEmail") {
      checkActionCode(auth, oobCode)
        .then(async (info) => {
          await applyActionCode(auth, oobCode);
          const email = info.data.email ?? "";
          setFase({
            tipo: "listo",
            titulo: "Recuperaste tu correo",
            mensaje: email ? <>Tu cuenta vuelve a usar <strong>{email}</strong>.</> : "Tu cuenta vuelve a usar el correo de antes.",
            recuperarClaveDe: email || undefined,
          });
        })
        .catch(fallo);
    } else {
      checkActionCode(auth, oobCode)
        .then(async (info) => {
          await applyActionCode(auth, oobCode);
          const email = info.data.email ?? "";
          setFase({
            tipo: "listo",
            titulo: "Correo cambiado",
            mensaje: email ? <>Desde ahora tu cuenta usa <strong>{email}</strong>.</> : "Tu correo quedó cambiado.",
          });
        })
        .catch(fallo);
    }
  }, [accion]);

  const guardarClave = async (e: FormEvent) => {
    e.preventDefault();
    if (fase.tipo !== "elegirClave" || !accion.oobCode) return;

    if (password.length < 6) {
      setErrorForm("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirmarPassword) {
      setErrorForm("Las contraseñas no coinciden.");
      return;
    }

    setErrorForm("");
    setGuardando(true);
    try {
      await confirmPasswordReset(auth, accion.oobCode, password);
    } catch (error) {
      console.error(error);
      setErrorForm(mensajeDeError(codigoDe(error), "resetPassword", accion.esInvitacion));
      setGuardando(false);
      return;
    }

    if (!accion.esInvitacion) {
      // "Olvidé mi contraseña" puede venir de la app de una marca: no se entra
      // al panel, solo se avisa que ya puede usar la contraseña nueva.
      setFase({
        tipo: "listo",
        titulo: "Contraseña actualizada",
        mensaje: "Ya podés iniciar sesión con tu contraseña nueva.",
      });
      return;
    }

    // Invitación de admin: se entra al panel directamente.
    try {
      await signInWithEmailAndPassword(auth, fase.email, password);
      setFase({ tipo: "listo", titulo: "Cuenta activada", mensaje: "Entrando al panel…" });
      window.setTimeout(() => navigate("/"), 1200);
    } catch (error) {
      // La contraseña ya quedó guardada: solo falló el ingreso automático.
      console.error(error);
      setFase({ tipo: "listo", titulo: "Cuenta activada", mensaje: "Tu contraseña quedó guardada. Iniciá sesión con ella." });
    }
  };

  const mandarCambioDeClave = async (email: string) => {
    try {
      await sendPasswordResetEmail(auth, email);
      setAvisoRecuperar(`Te mandamos un correo a ${email} para elegir una contraseña nueva.`);
    } catch (error) {
      console.error(error);
      setAvisoRecuperar(mensajeDeError(codigoDe(error), "recoverEmail", false));
    }
  };

  // Página neutra: la misma para el panel, la webyogur y la app de todas las marcas.
  const acento = "#e2e2e2";
  // Al panel solo se manda a quien viene de una invitación de admin.
  const irAlPanel = (
    <Button variant="contained" size="large" fullWidth onClick={() => navigate("/")}>
      Ir a iniciar sesión
    </Button>
  );
  const titulo = accion.modo ? (accion.esInvitacion ? "Activar cuenta" : TEXTOS[accion.modo].titulo) : "Enlace";

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
        px: 2,
        py: 4,
      }}
    >
      <Container maxWidth="xs" disableGutters>
        <Card variant="outlined" sx={{ borderRadius: 3 }}>
          <CardContent sx={{ p: { xs: 3, sm: 4 }, textAlign: "center" }}>
            {fase.tipo === "cargando" && (
              <Box role="status" sx={{ py: 3 }}>
                <CircularProgress sx={{ color: acento }} />
                <Typography color="text.secondary" sx={{ mt: 2 }}>
                  {accion.modo ? TEXTOS[accion.modo].cargando : "Cargando…"}
                </Typography>
              </Box>
            )}

            {fase.tipo === "error" && (
              <Stack spacing={2}>
                <Icono nombre="aviso" color="#f59e0b" />
                <Typography variant="h5" component="h1" sx={{ fontSize: { xs: 22, sm: 24 }, fontWeight: 700 }}>
                  No pudimos usar este enlace
                </Typography>
                <Typography color="text.secondary" role="alert">
                  {fase.mensaje}
                </Typography>
                {accion.esInvitacion && irAlPanel}
              </Stack>
            )}

            {fase.tipo === "sinDatos" && (
              <Stack spacing={2}>
                <Icono nombre="ok" color="#16a34a" />
                <Typography variant="h5" component="h1" sx={{ fontSize: { xs: 22, sm: 24 }, fontWeight: 700 }}>
                  Todo listo
                </Typography>
                <Typography color="text.secondary">
                  Si ya elegiste tu contraseña, iniciá sesión con tu correo y esa contraseña.
                </Typography>
                {irAlPanel}
              </Stack>
            )}

            {fase.tipo === "elegirClave" && (
              <Box sx={{ textAlign: "left" }}>
                <Icono nombre={accion.esInvitacion ? "invitacion" : "clave"} color={acento} />
                <Typography variant="h5" component="h1" sx={{ fontSize: { xs: 22, sm: 24 }, fontWeight: 700, textAlign: "center", mb: 1 }}>
                  {titulo}
                </Typography>
                <Typography color="text.secondary" sx={{ textAlign: "center", mb: 3, overflowWrap: "anywhere" }}>
                  {accion.esInvitacion ? "Definí tu contraseña para " : "Para tu cuenta "}
                  <strong>{fase.email}</strong>.
                </Typography>

                {errorForm && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {errorForm}
                  </Alert>
                )}

                <form onSubmit={guardarClave}>
                  <Stack spacing={2}>
                    <TextField
                      label="Contraseña nueva"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      fullWidth
                      autoFocus
                      autoComplete="new-password"
                      helperText="Mínimo 6 caracteres."
                    />
                    <TextField
                      label="Repetí la contraseña"
                      type="password"
                      value={confirmarPassword}
                      onChange={(e) => setConfirmarPassword(e.target.value)}
                      fullWidth
                      autoComplete="new-password"
                    />
                    <Button type="submit" variant="contained" fullWidth size="large" disabled={guardando}>
                      {guardando ? "Guardando…" : accion.esInvitacion ? "Activar cuenta" : "Guardar contraseña"}
                    </Button>
                  </Stack>
                </form>
              </Box>
            )}

            {fase.tipo === "listo" && (
              <Stack spacing={2}>
                <Icono nombre="ok" color="#16a34a" />
                <Typography variant="h5" component="h1" sx={{ fontSize: { xs: 22, sm: 24 }, fontWeight: 700 }}>
                  {fase.titulo}
                </Typography>
                <Typography color="text.secondary" role="status" sx={{ overflowWrap: "anywhere" }}>
                  {fase.mensaje}
                </Typography>
                {fase.recuperarClaveDe && (
                  <>
                    <Typography variant="body2" color="text.secondary">
                      Si no fuiste vos quien cambió el correo, cambiá también la contraseña.
                    </Typography>
                    {avisoRecuperar ? (
                      <Alert severity="info">{avisoRecuperar}</Alert>
                    ) : (
                      <Button variant="outlined" onClick={() => mandarCambioDeClave(fase.recuperarClaveDe!)}>
                        Cambiar mi contraseña
                      </Button>
                    )}
                  </>
                )}
                {accion.continuar && !accion.esInvitacion && (
                  <Button variant="contained" size="large" fullWidth href={accion.continuar}>
                    Continuar
                  </Button>
                )}
              </Stack>
            )}
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
