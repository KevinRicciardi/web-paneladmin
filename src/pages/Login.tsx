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
} from "@mui/material";

interface LoginProps {
  error?: string;
}

export default function Login({ error }: LoginProps) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  fullWidth
                  autoComplete="current-password"
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