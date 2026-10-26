import { useState } from "react";
import type { FormEvent } from "react";
import { auth, googleProvider } from "../firebase";
import { sendPasswordResetEmail, signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import { FirebaseError } from "firebase/app";
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Divider,
  Link,
  TextField,
  Typography,
  Alert,
  Stack,
  IconButton,
  InputAdornment,
} from "@mui/material";

interface LoginProps {
  error?: string;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function mensajeErrorReset(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case "auth/invalid-email":
        return "El correo electrónico no es válido.";
      case "auth/too-many-requests":
        return "Hiciste demasiados intentos. Esperá unos minutos.";
      case "auth/network-request-failed":
        return "No se pudo conectar. Revisá tu conexión a internet.";
    }
  }
  return "No se pudo enviar el enlace. Intentá de nuevo.";
}

function mensajeErrorGoogle(err: unknown): string {
  if (err instanceof FirebaseError) {
    switch (err.code) {
      case "auth/unauthorized-domain":
        return "Este dominio no está autorizado en Firebase Authentication. Agregalo en Authentication > Settings > Authorized domains.";
      case "auth/operation-not-allowed":
        return "El acceso con Google no está habilitado en Firebase Authentication.";
      case "auth/popup-blocked":
        return "El navegador bloqueó la ventana de Google. Permití las ventanas emergentes y volvé a intentarlo.";
      case "auth/popup-closed-by-user":
        return "Se cerró la ventana de Google antes de completar el inicio de sesión.";
      case "auth/network-request-failed":
        return "No se pudo conectar con Google. Revisá tu conexión e intentá de nuevo.";
      case "auth/cancelled-popup-request":
        return "Ya hay un inicio de sesión en curso. Esperá un momento e intentá de nuevo.";
    }
  }
  return "No se pudo iniciar sesión con Google. Intentá de nuevo.";
}

export default function Login({ error }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorLocal, setErrorLocal] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingGoogle, setLoadingGoogle] = useState(false);

  const [resetOpen, setResetOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");
  const [resetError, setResetError] = useState("");
  const [resetSending, setResetSending] = useState(false);
  const [resetSentTo, setResetSentTo] = useState("");

  const abrirReset = () => {
    setResetEmail(email.trim());
    setResetError("");
    setResetSentTo("");
    setResetOpen(true);
  };

  const cerrarReset = () => {
    if (resetSending) return;
    setResetOpen(false);
  };

  const enviarReset = async (e: FormEvent) => {
    e.preventDefault();
    const emailNormalizado = resetEmail.trim().toLowerCase();

    if (!emailNormalizado) {
      setResetError("Ingresá tu correo electrónico.");
      return;
    }
    if (!EMAIL_REGEX.test(emailNormalizado)) {
      setResetError("El correo electrónico no es válido.");
      return;
    }

    setResetError("");
    setResetSending(true);
    try {
      await sendPasswordResetEmail(auth, emailNormalizado);
      setResetSentTo(emailNormalizado);
    } catch (err) {
      console.error(err);
      setResetError(mensajeErrorReset(err));
    } finally {
      setResetSending(false);
    }
  };

  const loginEmail = async (e: FormEvent) => {
    e.preventDefault();
    setErrorLocal("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error(err);
      setErrorLocal("Email o contraseña incorrectos.");
    } finally {
      setLoading(false);
    }
  };

  const loginGoogle = async () => {
    setErrorLocal("");
    setLoadingGoogle(true);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error(err);
      setErrorLocal(mensajeErrorGoogle(err));
    } finally {
      setLoadingGoogle(false);
    }
  };

  return (
    <Box
      sx={ {
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
      } }
    >
      <Container maxWidth="xs">
        <Card variant="outlined">
          <CardContent sx={ { p: 4 } }>
            <Typography variant="h5" sx={ { fontWeight: 700, mb: 0.5 } }>
              Panel Admin
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={ { mb: 3 } }>
              Ingresá tus credenciales para acceder al panel.
            </Typography>

            {(errorLocal || error) && (
              <Alert severity="error" sx={ { mb: 2 } }>{errorLocal || error}</Alert>
            )}

            <form onSubmit={loginEmail}>
              <Stack spacing={2}>
                <TextField
                  label="Email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  fullWidth
                  autoComplete="email"
                />
                <TextField
                  label="Contraseña"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                  autoComplete="current-password"
                  slotProps={{
                    input: {
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                            onClick={() => setShowPassword((visible) => !visible)}
                            edge="end"
                          >
                            <svg
                              aria-hidden="true"
                              width="20"
                              height="20"
                              viewBox="0 0 24 24"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            >
                              {showPassword ? (
                                <>
                                  <path d="M3 3l18 18" />
                                  <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                                  <path d="M9.9 5.2A10.8 10.8 0 0 1 12 5c5 0 8.5 4.2 9.5 7-.4 1.1-1.2 2.3-2.4 3.4" />
                                  <path d="M6.2 6.2C4.2 7.5 2.9 9.5 2.5 12c.6 1.7 1.9 3.4 4 4.8A9.7 9.7 0 0 0 12 19c1 0 1.9-.1 2.8-.4" />
                                </>
                              ) : (
                                <>
                                  <path d="M2.5 12s3.5-7 9.5-7 9.5 7 9.5 7-3.5 7-9.5 7-9.5-7-9.5-7Z" />
                                  <circle cx="12" cy="12" r="3" />
                                </>
                              )}
                            </svg>
                          </IconButton>
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                <Box sx={ { display: "flex", justifyContent: "flex-end", mt: "4px !important" } }>
                  <Link component="button" type="button" variant="body2" underline="hover" onClick={abrirReset}>
                    ¿Olvidaste tu contraseña?
                  </Link>
                </Box>
                <Button type="submit" variant="contained" fullWidth size="large" disabled={loading}>
                  {loading ? "Ingresando..." : "Iniciar sesión"}
                </Button>
              </Stack>
            </form>

            <Divider sx={ { my: 3 } }>
              <Typography variant="caption" color="text.secondary" sx={ { textTransform: "uppercase", letterSpacing: 1 } }>
                O continuá con
              </Typography>
            </Divider>

            <Button onClick={loginGoogle} variant="outlined" fullWidth size="large" disabled={loadingGoogle}>
              {loadingGoogle ? "Conectando con Google..." : "Iniciar sesión con Google"}
            </Button>
          </CardContent>
        </Card>

        <Typography
          variant="caption"
          color="text.secondary"
          align="center"
          sx={ { display: "block", mt: 3 } }
        >
          Acceso restringido a administradores autorizados.
        </Typography>
      </Container>

      <Dialog open={resetOpen} onClose={cerrarReset} fullWidth maxWidth="xs">
        {resetSentTo ? (
          <>
            <DialogTitle sx={ { fontWeight: 700 } }>Revisá tu correo</DialogTitle>
            <DialogContent>
              <DialogContentText>
                Si existe una cuenta asociada a <strong>{resetSentTo}</strong>, vas a recibir un enlace
                para cambiar la contraseña. Revisá también la carpeta de spam.
              </DialogContentText>
            </DialogContent>
            <DialogActions sx={ { px: 3, pb: 3 } }>
              <Button onClick={cerrarReset} variant="contained" fullWidth>
                Entendido
              </Button>
            </DialogActions>
          </>
        ) : (
          <form onSubmit={enviarReset} noValidate>
            <DialogTitle sx={ { fontWeight: 700 } }>Recuperar contraseña</DialogTitle>
            <DialogContent>
              <DialogContentText sx={ { mb: 2 } }>
                Ingresá el correo asociado a tu cuenta y te enviaremos un enlace para crear una
                contraseña nueva.
              </DialogContentText>
              <TextField
                label="Correo electrónico"
                placeholder="nombre@correo.com"
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                fullWidth
                autoFocus
                autoComplete="email"
                disabled={resetSending}
                error={Boolean(resetError)}
                helperText={resetError || " "}
              />
            </DialogContent>
            <DialogActions sx={ { px: 3, pb: 3 } }>
              <Button onClick={cerrarReset} disabled={resetSending}>
                Cancelar
              </Button>
              <Button type="submit" variant="contained" disabled={resetSending}>
                {resetSending ? "Enviando..." : "Enviar enlace"}
              </Button>
            </DialogActions>
          </form>
        )}
      </Dialog>
    </Box>
  );
}