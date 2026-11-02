import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, Typography } from "@mui/material";

type Props = {
  open: boolean;
  onClose: () => void;
};

const ejemplo = {
  fontFamily: "monospace",
  fontSize: 13,
  bgcolor: "action.hover",
  borderRadius: 1,
  px: 1,
  py: 0.5,
  display: "block",
  wordBreak: "break-all",
  my: 0.5,
} as const;

function Plataforma({ nombre, children }: { nombre: string; children: React.ReactNode }) {
  return (
    <Box sx={{ mb: 2.5 }}>
      <Typography sx={{ fontWeight: 800, mb: 0.5 }}>{nombre}</Typography>
      {children}
    </Box>
  );
}

export default function AyudaLinkStream({ open, onClose }: Props) {
  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle sx={{ fontWeight: 900 }}>¿Qué link tengo que poner?</DialogTitle>
      <DialogContent dividers>
        <Typography color="text.secondary" sx={{ mb: 2.5 }}>
          Pegá el link de tu <b>canal</b>, no el de una transmisión o un video puntual. Así la app siempre
          muestra lo que estás emitiendo en ese momento, aunque cambie la transmisión.
        </Typography>

        <Plataforma nombre="YouTube">
          <Typography variant="body2">Tiene que ser el link de tu canal. Se ve de alguna de estas dos formas:</Typography>
          <Box component="code" sx={ejemplo}>https://www.youtube.com/@tucanal</Box>
          <Box component="code" sx={ejemplo}>https://www.youtube.com/channel/UC...</Box>
          <Typography variant="body2" sx={{ mt: 1 }}>
            <b>Cómo conseguirlo:</b> abrí YouTube, entrá a tu canal (tocá tu foto y elegí «Tu canal») y copiá la
            dirección de la barra del navegador. En el celular, en la pantalla de tu canal buscá la opción de
            compartir o copiar el link.
          </Typography>
          <Typography variant="body2" sx={{ mt: 1 }}>
            <b>No sirve</b> un link como <code>youtube.com/watch?v=...</code>, <code>youtu.be/...</code> o{" "}
            <code>youtube.com/c/...</code>. Los dos primeros son de un video, y el tercero es un formato viejo.
          </Typography>
        </Plataforma>

        <Plataforma nombre="Kick">
          <Box component="code" sx={ejemplo}>https://kick.com/tucanal</Box>
        </Plataforma>

        <Plataforma nombre="Twitch">
          <Box component="code" sx={ejemplo}>https://www.twitch.tv/tucanal</Box>
        </Plataforma>

        <Plataforma nombre="Modo Podcast (solo audio)">
          <Typography variant="body2">
            Solo funciona con un canal de <b>YouTube</b>. Con Kick o Twitch la opción queda deshabilitada.
          </Typography>
        </Plataforma>

        <Plataforma nombre="¿Cómo sé que funcionó?">
          <Typography variant="body2">
            Al pegar el link aparece arriba, a la derecha, la etiqueta de la plataforma (YOUTUBE, KICK o TWITCH).
            Después tocá «Guardar Configuración»: si el link sirve no sale ningún cartel rojo, y si no, el cartel te
            dice qué falta.
          </Typography>
        </Plataforma>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} variant="contained">Entendido</Button>
      </DialogActions>
    </Dialog>
  );
}
