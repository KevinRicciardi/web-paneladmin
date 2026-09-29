import { useState } from "react";
import type { FormEvent } from "react";
import { auth, googleProvider } from "../firebase";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import {
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
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

export default function Login({ error }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [errorLocal, setErrorLocal] = useState("");
  const [loading, setLoading] = useState(false);

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
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err) {
      console.error(err);
      setErrorLocal("No se pudo iniciar sesión con Google.");
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

            {(error || errorLocal) && (
              <Alert severity="error" sx={ { mb: 2 } }>{error || errorLocal}</Alert>
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

            <Button onClick={loginGoogle} variant="outlined" fullWidth size="large">
              Iniciar sesión con Google
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
    </Box>
  );
}