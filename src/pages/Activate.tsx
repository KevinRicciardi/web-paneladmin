import { useEffect, useState } from "react";
import type { FormEvent } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  confirmPasswordReset,
  signInWithEmailAndPassword,
  verifyPasswordResetCode,
} from "firebase/auth";
import { auth } from "../firebase";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Container,
  Stack,
  TextField,
  Typography,
} from "@mui/material";

type Estado = "verificando" | "valido" | "invalido" | "guardando" | "listo";

export default function Activate() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const oobCode = searchParams.get("oobCode");

  const [estado, setEstado] = useState<Estado>("verificando");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [password, setPassword] = useState("");
  const [confirmarPassword, setConfirmarPassword] = useState("");

  useEffect(() => {
    if (!oobCode) {
      setEstado("invalido");
      setError("Este enlace no es válido.");
      return;
    }

    verifyPasswordResetCode(auth, oobCode)
      .then((correo) => {
        setEmail(correo);
        setEstado("valido");
      })
      .catch(() => {
        setEstado("invalido");
        setError(
          "Este enlace ya no es válido. Si ya definiste tu contraseña, iniciá sesión normalmente — probablemente ya esté todo listo. Si no llegaste a hacerlo, pedile a quien te invitó que te reenvíe la invitación.",
        );
      });
  }, [oobCode]);

  const definirContraseña = async (e: FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    if (password !== confirmarPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setError("");
    setEstado("guardando");

    try {
      await confirmPasswordReset(auth, oobCode!, password);
      await signInWithEmailAndPassword(auth, email, password);
      setEstado("listo");
      window.setTimeout(() => navigate("/"), 1200);
    } catch (err) {
      console.error(err);
      setError("No se pudo activar la cuenta. Intentá de nuevo o pedí que te reenvíen la invitación.");
      setEstado("valido");
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        bgcolor: "background.default",
      }}
    >
      <Container maxWidth="xs">
        <Card variant="outlined">
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
              Activar cuenta
            </Typography>

            {estado === "verificando" && (
              <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                <CircularProgress />
              </Box>
            )}

            {estado === "invalido" && (
              <Stack spacing={2} sx={{ mt: 2 }}>
                <Alert severity="warning">{error}</Alert>
                <Button variant="contained" onClick={() => navigate("/")}>
                  Ir a iniciar sesión
                </Button>
              </Stack>
            )}

            {estado === "listo" && (
              <Stack spacing={2} sx={{ mt: 2 }}>
                <Alert severity="success">Cuenta activada correctamente. Ingresando...</Alert>
                <Box sx={{ display: "flex", justifyContent: "center" }}>
                  <CircularProgress size={24} />
                </Box>
              </Stack>
            )}

            {(estado === "valido" || estado === "guardando") && (
              <>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                  Definí tu contraseña para <strong>{email}</strong>.
                </Typography>

                {error && (
                  <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                  </Alert>
                )}

                <form onSubmit={definirContraseña}>
                  <Stack spacing={2}>
                    <TextField
                      label="Contraseña"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      fullWidth
                      autoFocus
                      autoComplete="new-password"
                    />
                    <TextField
                      label="Confirmar contraseña"
                      type="password"
                      value={confirmarPassword}
                      onChange={(e) => setConfirmarPassword(e.target.value)}
                      fullWidth
                      autoComplete="new-password"
                    />
                    <Button
                      type="submit"
                      variant="contained"
                      fullWidth
                      size="large"
                      disabled={estado === "guardando"}
                    >
                      {estado === "guardando" ? "Activando..." : "Activar cuenta"}
                    </Button>
                  </Stack>
                </form>
              </>
            )}
          </CardContent>
        </Card>
      </Container>
    </Box>
  );
}
