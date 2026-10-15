import { memo, useState } from "react";
import {
  Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, TextField,
  ToggleButton, ToggleButtonGroup, Tooltip, Typography,
} from "@mui/material";
import { generarTema, HEX_REGEX, type ModoTema, type PaletaGenerada } from "../utils/generarTema";

// El color y el modo viven acá adentro (y no en Branding) para que arrastrar
// el selector de color solo redibuje este modal y no toda la página.
const GeneradorTemaDialog = memo(function GeneradorTemaDialog({
  open,
  onClose,
  onAplicar,
  campos,
  colorInputSx,
}: {
  open: boolean;
  onClose: () => void;
  onAplicar: (paleta: PaletaGenerada) => void;
  campos: { key: keyof PaletaGenerada; label: string }[];
  colorInputSx: Record<string, unknown>;
}) {
  const [color, setColor] = useState("#F97316");
  const [modo, setModo] = useState<ModoTema>("oscuro");
  const colorValido = HEX_REGEX.test(color);
  const paleta = colorValido ? generarTema(color, modo) : null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <DialogTitle>Nuevo tema</DialogTitle>
      <DialogContent>
        <Typography variant="body2" color="text.secondary" sx={ { mb: 2.5 } }>
          Elegí el color principal de tu marca y se arma automáticamente una paleta completa con sus tonos.
          Después podés retocar cualquier color y guardarlo como tema.
        </Typography>
        <Box sx={ { display: "flex", alignItems: "center", gap: 1.5, flexWrap: "wrap", mb: 2.5 } }>
          <Box
            component="input"
            type="color"
            value={colorValido ? color : "#000000"}
            onChange={(event: React.ChangeEvent<HTMLInputElement>) => setColor(event.target.value.toUpperCase())}
            sx={colorInputSx}
          />
          <TextField
            value={color}
            size="small"
            onChange={(event) => setColor(event.target.value.trim())}
            error={!colorValido}
            sx={ { width: 120 } }
            slotProps={ { htmlInput: { maxLength: 7, style: { fontFamily: "monospace" } } } }
          />
          <ToggleButtonGroup
            size="small"
            exclusive
            value={modo}
            onChange={(_, nuevoModo: ModoTema | null) => nuevoModo && setModo(nuevoModo)}
          >
            <ToggleButton value="oscuro">Oscuro</ToggleButton>
            <ToggleButton value="claro">Claro</ToggleButton>
          </ToggleButtonGroup>
        </Box>
        {paleta ? (
          <Box sx={ { display: "flex", gap: 0.5, height: 32 } }>
            {campos.map(({ key, label }) => (
              <Tooltip key={key} title={`${label}: ${paleta[key]}`}>
                <Box sx={ { flex: 1, borderRadius: 0.5, bgcolor: paleta[key], border: "1px solid", borderColor: "divider" } } />
              </Tooltip>
            ))}
          </Box>
        ) : (
          <Typography variant="caption" color="error">
            Ingresá un color en formato hexadecimal, por ejemplo #F97316.
          </Typography>
        )}
      </DialogContent>
      <DialogActions sx={ { px: 3, pb: 2.5 } }>
        <Button onClick={onClose}>Cancelar</Button>
        <Button
          variant="contained"
          disabled={!paleta}
          onClick={() => paleta && onAplicar(paleta)}
          startIcon={<span className="material-symbols-outlined">format_paint</span>}
        >
          Aplicar paleta
        </Button>
      </DialogActions>
    </Dialog>
  );
});

export default GeneradorTemaDialog;
