import { Box, Typography } from "@mui/material";

export default function Noticias() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        <span className="material-symbols-outlined" style={ { verticalAlign: 'middle', marginRight: 8 } }>newspaper</span>
        Noticias
      </Typography>
      <Typography color="text.secondary">No hay noticias cargadas.</Typography>
    </Box>
  );
}