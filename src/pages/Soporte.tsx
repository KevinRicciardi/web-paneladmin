import { Box, Button, Card, CardContent, Link, Stack, Typography } from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import type { Perfil } from "../types";

export default function Soporte({ perfil: _perfil }: { perfil: Perfil }) {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Centro de ayuda
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Aquí encontrarás orientación práctica para mantener tu panel actualizado, ordenado y listo para operar.
      </Typography>

      <Stack spacing={2}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>
              1. Define la identidad de tu marca
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Antes de salir al aire, lo primero es ponerle tu toque personal. Acá podés subir la foto de perfil, poner el logo de tu marca, cambiar la imagen de portada y elegir los colores que te van a identificar. Es la cara visible que van a ver todos cuando entren.
            </Typography>
            <Button component={RouterLink} to="/branding" variant="contained" size="small">
              Ver Branding
            </Button>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>
              2. Gestiona tu transmisión
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Para que tu programa de video (como OBS) se conecte con esta página, necesitás la clave de acceso. En este apartado vas a encontrar los datos para copiar y pegar en tu programa, elegir cómo vas a emitir y dejar la pantalla lista para cuando aprietes el botón de salir en vivo.
            </Typography>
            <Button component={RouterLink} to="/streaming" variant="contained" size="small">
              Ir a Streaming
            </Button>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>
              3. Organiza tu Programación de contenido
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              A nadie le gusta entrar a un canal y no saber cuándo hay contenido. Acá podés armar un calendario bien claro con los días y los horarios en los que vas a transmitir durante la semana, así tus seguidores ya saben exactamente qué día conectarse para verte.
            </Typography>
            <Button component={RouterLink} to="/programacion" variant="contained" size="small">
              Ir a Programación
            </Button>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>
              4. Publica novedades con frecuencia
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Usá este espacio para escribirle directamente a la gente que te sigue. Podés contarles sobre el próximo evento que vas a hacer, avisar si cambiás un horario o dejar un mensaje fijado para los que recién te conocen. Es tu cartelera de anuncios.
            </Typography>
            <Button component={RouterLink} to="/noticias" variant="contained" size="small">
              Ir a Noticias
            </Button>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Ayuda personalizada
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 1 }}>
              Si necesitas asistencia, puedes escribirnos a nuestro canal de soporte para resolver dudas o problemas.
            </Typography>
            <Typography sx={{ mb: 1 }}>
              <Link
                href="https://mail.google.com/mail/u/0/?view=cm&to=ayuda@webpanel.com"
                target="_blank"
                rel="noopener noreferrer"
                underline="hover"
                color="info.main"
                sx={{ fontWeight: 600 }}
              >
                ayuda@webpanel.com
              </Link>
            </Typography>
            <Typography color="text.secondary">
              También puedes revisar la configuración de tu cuenta y las secciones del panel para encontrar respuestas rápidas.
            </Typography>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
