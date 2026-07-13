import { Box, Typography } from "@mui/material";

export default function Programacion() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        <span className="material-symbols-outlined" style={ { verticalAlign: 'middle', marginRight: 8 } }>calendar_month</span>
        Programación
      </Typography>
      <Typography color="text.secondary">Todavía no cargaste programación.</Typography>
    </Box>
  );
}