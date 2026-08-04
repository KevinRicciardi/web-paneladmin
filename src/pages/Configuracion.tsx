import { useState } from "react";
import { Box, Button, Card, CardContent, Divider, Stack, TextField, Typography } from "@mui/material";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import type { Perfil } from "../types";

export default function Configuracion({ perfil }: { perfil: Perfil }) {
  const tenant = perfil.tenant;
  const [cerrando, setCerrando] = useState(false);

  const handleLogout = async () => {
    try {
      setCerrando(true);
      await signOut(auth);
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    } finally {
      setCerrando(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Configuración
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Ajusta los valores clave de tu canal. Estos datos se usan para personalizar la experiencia del usuario.
      </Typography>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Información de Marca
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="Nombre de la Marca"
              value={tenant.nombre}
              fullWidth
              disabled
            />
            <TextField
              label="Slug"
              value={tenant.slug}
              fullWidth
              disabled
            />
            <TextField
              label="URL de transmisión"
              value={tenant.streamUrl ?? "No configurada"}
              fullWidth
              disabled
            />
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Opciones de ayuda
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Si quieres que algún dato sea editable aquí, podemos convertir estos campos en formularios de actualización rápida.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <Button variant="contained">Editar Perfil</Button>
            <Button variant="outlined">Ver documentación</Button>
          </Stack>
        </CardContent>
      </Card>

      <Divider sx={{ my: 3 }} />

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Sesión
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Cierra tu sesión actual del panel de administración.
          </Typography>
          <Button variant="outlined" color="error" onClick={handleLogout} disabled={cerrando}>
            {cerrando ? "Cerrando sesión..." : "Cerrar sesión"}
          </Button>
        </CardContent>
      </Card>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
        Esta sección es ideal para centralizar configuraciones generales de la marca y el stream en un solo lugar.
      </Typography>
    </Box>
  );
}
