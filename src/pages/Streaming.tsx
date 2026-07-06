import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  TextField,
  Typography,
} from "@mui/material";
import { auth } from "../firebase";
import type { Perfil } from "../types";

const API_URL = "http://localhost:3000";

function getEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (u.hostname.includes("youtube.com") || u.hostname === "youtu.be") {
      let videoId = u.searchParams.get("v");
      if (!videoId && u.hostname === "youtu.be") videoId = u.pathname.slice(1);
      if (!videoId && url.includes("/live/")) videoId = u.pathname.split("/live/")[1];
      return videoId ? `{{https://www.youtube.com/embed/${videoId}}}` : null;
    }
    if (u.hostname === "kick.com" || u.hostname === "www.kick.com") {
      const canal = u.pathname.replace("/", "").split("/")[0];
      return canal ? `{{https://player.kick.com/${canal}}}` : null;
    }
    return null;
  } catch {
    return null;
  }
}

function detectarPlataforma(url: string): string {
  if (url.includes("kick.com")) return "Kick";
  if (url.includes("youtube.com") || url.includes("youtu.be")) return "YouTube";
  return "Desconocida";
}

export default function Streaming({ perfil }: { perfil: Perfil }) {
  const original = perfil.tenant?.streamUrl ?? "";
  const [streamUrl, setStreamUrl] = useState(original);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const embedUrl = streamUrl ? getEmbedUrl(streamUrl) : null;
  const hayCambios = streamUrl !== original;
  const plataforma = streamUrl ? detectarPlataforma(streamUrl) : null;

  // Estado de señal
  const estado = !streamUrl
    ? { label: "Sin configurar", color: "default" as const }
    : embedUrl
      ? { label: "Señal lista", color: "success" as const }
      : { label: "URL inválida", color: "warning" as const };

  const handleGuardar = async () => {
    setLoading(true);
    setSuccess(false);
    setError("");
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${API_URL}/tenants/mi-tenant`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ streamUrl }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      setSuccess(true);
    } catch {
      setError("No se pudo guardar. Revisá la URL e intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  const handleDescartar = () => {
    setStreamUrl(original);
    setSuccess(false);
    setError("");
  };

  return (
    <Box>
      {/* Encabezado */}
      <Box sx={ { display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 2, mb: 3 } }>
        <Box>
          <Typography variant="h4" gutterBottom>
            📺 Configuración de Streaming
          </Typography>
          <Typography color="text.secondary">
            Gestioná el destino de la señal en vivo de tu plataforma.
          </Typography>
        </Box>
        <Chip
          label={`Estado de señal: ${estado.label}`}
          color={estado.color}
          variant={estado.color === "default" ? "outlined" : "filled"}
          sx={ { fontWeight: "bold" } }
        />
      </Box>

      <Box sx={ { display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 } }>

        {/* Destino Principal */}
        <Card>
          <CardContent>
            <Box sx={ { display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 } }>
              <Typography variant="h6">🎯 Destino Principal</Typography>
              {plataforma && (
                <Chip label={plataforma} size="small" color="primary" variant="outlined" />
              )}
            </Box>

            <Divider sx={ { mb: 3 } } />

            <Typography variant="body2" color="text.secondary" sx={ { mb: 1 } }>
              URL del canal
            </Typography>
            <TextField
              placeholder="https://kick.com/tu-canal"
              value={streamUrl}
              onChange={(e) => { setStreamUrl(e.target.value); setSuccess(false); }}
              fullWidth
              sx={ { mb: 1 } }
            />
            <Typography variant="caption" color="text.secondary">
              Pegá el link de tu canal de Kick (o YouTube Live). Se mostrará en la app de tus usuarios.
            </Typography>

            {success && <Alert severity="success" sx={ { mt: 2 } }>¡Configuración guardada! 🎉</Alert>}
            {error && <Alert severity="error" sx={ { mt: 2 } }>{error}</Alert>}

            <Box sx={ { display: "flex", gap: 2, mt: 3 } }>
              <Button
                variant="contained"
                onClick={handleGuardar}
                disabled={loading || !hayCambios || !streamUrl.trim()}
                startIcon={loading ? <CircularProgress size={18} color="inherit" /> : undefined}
              >
                {loading ? "Guardando..." : "Guardar configuración"}
              </Button>
              <Button variant="text" onClick={handleDescartar} disabled={loading || !hayCambios}>
                Descartar cambios
              </Button>
            </Box>
          </CardContent>
        </Card>

        {/* Vista previa del programa */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>👁 Vista previa del programa</Typography>
            <Divider sx={ { mb: 2 } } />

            {embedUrl ? (
              <Box
                component="iframe"
                src={embedUrl}
                sx={ { width: "100%", aspectRatio: "16 / 9", border: "none", borderRadius: 1 } }
                allowFullScreen
              />
            ) : (
              <Box
                sx={ {
                  width: "100%",
                  aspectRatio: "16 / 9",
                  borderRadius: 1,
                  bgcolor: "grey.900",
                  color: "grey.500",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 1,
                } }
              >
                <Typography variant="h2">📡</Typography>
                <Typography variant="body2">
                  {streamUrl ? "URL no reconocida" : "Sin señal detectada"}
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>

      </Box>
    </Box>
  );
}