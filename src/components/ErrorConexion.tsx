import { Alert, Box, Button, Typography } from "@mui/material";

type Props = {
  onReintentar: () => void;
  onCerrarSesion: () => void;
};

/// Se muestra cuando el servidor no responde o falla al validar la sesión.
/// Antes, cualquier falla (API lenta, caída, 5xx) cerraba la sesión sola y
/// obligaba a volver a loguearse; ahora se conserva y se puede reintentar.
export default function ErrorConexion({ onReintentar, onCerrarSesion }: Props) {
  return (
    <Box sx={{ p: 4, maxWidth: 520, mx: "auto", mt: 10 }}>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 1.5 }}>
        No pudimos conectar con el servidor
      </Typography>
      <Alert severity="warning" sx={{ mb: 2 }}>
        Tu sesión sigue iniciada. Puede ser un problema momentáneo de conexión: probá de nuevo en unos segundos.
      </Alert>
      <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
        <Button variant="contained" onClick={onReintentar}>
          Reintentar
        </Button>
        <Button variant="outlined" onClick={onCerrarSesion}>
          Cerrar sesión
        </Button>
      </Box>
    </Box>
  );
}
