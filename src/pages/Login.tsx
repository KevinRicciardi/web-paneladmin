import { useState } from "react";
import type { FormEvent } from "react";
import { auth, googleProvider } from "../firebase";
import { signInWithEmailAndPassword, signInWithPopup } from "firebase/auth";
import {
  Box,
  Button,
  Container,
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

  const loginEmail = async (e: FormEvent) => {
    e.preventDefault();
    setErrorLocal("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      console.error(err);
      setErrorLocal("Email o contraseña incorrectos.");
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
    <Container maxWidth="xs">
      <Box sx={ { mt: 10, display: "flex", flexDirection: "column", gap: 2 } }>
        <Typography variant="h4" align="center">
          Login Admin
        </Typography>

        {(error || errorLocal) && (
          <Alert severity="error">{error || errorLocal}</Alert>
        )}

        <form onSubmit={loginEmail}>
          <Stack spacing={2}>
            <TextField
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              fullWidth
            />
            <TextField
              label="Contraseña"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              fullWidth
            />
            <Button type="submit" variant="contained" fullWidth>
              Login Email
            </Button>
          </Stack>
        </form>

        <Button onClick={loginGoogle} variant="outlined" fullWidth>
          Login con Google
        </Button>
      </Box>
    </Container>
  );
}