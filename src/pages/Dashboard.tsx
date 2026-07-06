import { Box, Button, Card, CardActions, CardContent, Chip, Typography } from "@mui/material";
import type { Perfil } from "../types";

const metricas = [
  { label: "👁 Espectadores", value: "—" },
  { label: "📺 Vistas", value: "—" },
  { label: "⏱ Tiempo emisión", value: "—" },
  { label: "🔴 Estado", value: "Offline" },
];

export default function Dashboard({ perfil }: { perfil: Perfil }) {
  const nombreCliente = perfil.tenant?.nombre ?? perfil.tenant?.slug ?? "Cliente";

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Hola, {nombreCliente} 👋</Typography>
      <Typography color="text.secondary" sx={ { mb: 3 } }>
        Este es el centro de control de tu plataforma.
      </Typography>

      <Box
        sx={ {
          display: "grid",
          gridTemplateColumns: { xs: "1fr 1fr", md: "repeat(4, 1fr)" },
          gap: 2,
          mb: 3,
        } }
      >
        {metricas.map((m) => (
          <Card key={m.label}>
            <CardContent>
              <Typography variant="body2" color="text.secondary">{m.label}</Typography>
              <Typography variant="h5">{m.value}</Typography>
            </CardContent>
          </Card>
        ))}
      </Box>

      <Box sx={ { display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 2 } }>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>🎨 Branding</Typography>
            <Chip label="⚠️ Incompleto" color="warning" />
          </CardContent>
          <CardActions>
            <Button size="small">Editar branding →</Button>
          </CardActions>
        </Card>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>📺 Streaming</Typography>
            <Chip label="⚫ Sin configurar" />
          </CardContent>
          <CardActions>
            <Button size="small">Configurar stream →</Button>
          </CardActions>
        </Card>
      </Box>
    </Box>
  );
}