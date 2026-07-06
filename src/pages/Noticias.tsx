import { Box, Typography } from "@mui/material";

export default function Noticias() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>📰 Noticias</Typography>
      <Typography color="text.secondary">No hay noticias cargadas.</Typography>
    </Box>
  );
}