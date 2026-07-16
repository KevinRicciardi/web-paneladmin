import { Box, Button, Card, CardContent, Link, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import type { Perfil } from "../types";

export default function Soporte({ perfil }: { perfil: Perfil }) {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Guía de Uso
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Te ayudamos a configurar tu canal paso a paso para que tu marca se vea profesional y tu stream funcione correctamente.
      </Typography>

      <Stack spacing={2}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>
              1. Prepara tu marca
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Comenzá por completar el nombre, logo, banner y paleta de colores en la sección Branding.
            </Typography>
            <Button component={RouterLink} to="/branding" variant="contained" size="small">
              Ir a Branding
            </Button>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>
              2. Configura tu stream
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Verificá la URL de transmisión, seleccioná el modo de stream y cargá la imagen de portada correcta.
            </Typography>
            <Button component={RouterLink} to="/streaming" variant="contained" size="small">
              Ir a Streaming
            </Button>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>
              3. Organiza tu programación
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Agregá bloques de emisión con horarios claros para que tu público conozca la grilla semanal.
            </Typography>
            <Button component={RouterLink} to="/programacion" variant="contained" size="small">
              Ir a Programación
            </Button>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>
              4. Publica noticias
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Creá anuncios, guardá borradores y publicá noticias sobre novedades de tu canal.
            </Typography>
            <Button component={RouterLink} to="/noticias" variant="contained" size="small">
              Ir a Noticias
            </Button>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Soporte y ayuda adicional
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 1 }}>
              Si tenés dudas técnicas o querés reportar un error, escribinos al siguiente mail:
            </Typography>
            <Typography sx={{ mb: 1 }}>
              <Link href="mailto:soporte@streammanager.example">soporte@streammanager.example</Link>
            </Typography>
            <Typography color="text.secondary">
              También podés consultar la documentación interna de tu plataforma en el futuro si se habilita.
            </Typography>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
