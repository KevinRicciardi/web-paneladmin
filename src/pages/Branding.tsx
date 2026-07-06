import { useRef, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Divider,
  TextField,
  Typography,
} from "@mui/material";
import { auth } from "../firebase";
import type { Perfil } from "../types";

const API_URL = "http://localhost:3000";
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

async function subirACloudinary(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  const res = await fetch(
    `{{https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload}}`,
    { method: "POST", body: formData }
  );
  if (!res.ok) throw new Error("Error al subir la imagen");
  const data = await res.json();
  return data.secure_url as string;
}

export default function Branding({ perfil }: { perfil: Perfil }) {
  const [nombre, setNombre] = useState(perfil.tenant?.nombre ?? "");
  const [colorPrimario, setColorPrimario] = useState(
    perfil.tenant?.colorPrimario ?? "#1976d2"
  );
  const [colorSecundario, setColorSecundario] = useState(
    perfil.tenant?.colorSecundario ?? "#ffffff"
  );
  const [logoUrl, setLogoUrl] = useState(perfil.tenant?.logoUrl ?? "");
  const [bannerUrl, setBannerUrl] = useState(perfil.tenant?.bannerUrl ?? "");

  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (
    file: File | undefined,
    tipo: "logo" | "banner"
  ) => {
    if (!file) return;
    setError("");
    setSuccess(false);
    const setUploading = tipo === "logo" ? setUploadingLogo : setUploadingBanner;
    const setUrl = tipo === "logo" ? setLogoUrl : setBannerUrl;
    setUploading(true);
    try {
      const url = await subirACloudinary(file);
      setUrl(url);
    } catch {
      setError(`No se pudo subir el ${tipo}. Revisá la config de Cloudinary.`);
    } finally {
      setUploading(false);
    }
  };

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
        body: JSON.stringify({
          nombre,
          colorPrimario,
          colorSecundario,
          logoUrl,
          bannerUrl,
        }),
      });
      if (!res.ok) throw new Error("Error al guardar");
      setSuccess(true);
    } catch {
      setError("No se pudo guardar. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        🎨 Configuración de Marca
      </Typography>
      <Typography color="text.secondary" sx={ { mb: 3 } }>
        Personalizá la identidad visual de tu plataforma. Los cambios se reflejan
        en la app de tus usuarios.
      </Typography>

      <Box sx={ { display: "grid", gridTemplateColumns: { xs: "1fr", md: "1fr 1fr" }, gap: 3 } }>

        {/* Formulario */}
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>⚙️ Configuración</Typography>

            <TextField
              label="Nombre de la plataforma"
              value={nombre}
              onChange={(e) => { setNombre(e.target.value); setSuccess(false); }}
              fullWidth
              sx={ { mb: 3 } }
            />

            <Divider sx={ { mb: 3 } } />

            {/* LOGO */}
            <Typography variant="body2" color="text.secondary" sx={ { mb: 1 } }>
              Logo de la marca
            </Typography>
            <Box sx={ { display: "flex", alignItems: "center", gap: 2, mb: 3 } }>
              <Box
                sx={ {
                  width: 72,
                  height: 72,
                  borderRadius: 1,
                  border: "1px dashed #ccc",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  overflow: "hidden",
                  bgcolor: "action.hover",
                } }
              >
                {logoUrl ? (
                  <Box component="img" src={logoUrl} alt="logo" sx={ { width: "100%", height: "100%", objectFit: "contain" } } />
                ) : (
                  <Typography variant="caption" color="text.secondary">Sin logo</Typography>
                )}
              </Box>
              <Box>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={(e) => handleUpload(e.target.files?.[0], "logo")}
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingLogo}
                  startIcon={uploadingLogo ? <CircularProgress size={16} /> : undefined}
                >
                  {uploadingLogo ? "Subiendo..." : logoUrl ? "Cambiar" : "Subir logo"}
                </Button>
                {logoUrl && (
                  <Button size="small" color="error" onClick={() => setLogoUrl("")} sx={ { ml: 1 } }>
                    Quitar
                  </Button>
                )}
              </Box>
            </Box>

            {/* BANNER */}
            <Typography variant="body2" color="text.secondary" sx={ { mb: 1 } }>
              Banner de cabecera (recomendado 1920x320px)
            </Typography>
            <Box sx={ { mb: 3 } }>
              {bannerUrl && (
                <Box
                  component="img"
                  src={bannerUrl}
                  alt="banner"
                  sx={ { width: "100%", height: 90, objectFit: "cover", borderRadius: 1, mb: 1, display: "block" } }
                />
              )}
              <input
                ref={bannerInputRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => handleUpload(e.target.files?.[0], "banner")}
              />
              <Button
                variant="outlined"
                size="small"
                onClick={() => bannerInputRef.current?.click()}
                disabled={uploadingBanner}
                startIcon={uploadingBanner ? <CircularProgress size={16} /> : undefined}
              >
                {uploadingBanner ? "Subiendo..." : bannerUrl ? "Cambiar banner" : "Subir banner"}
              </Button>
              {bannerUrl && (
                <Button size="small" color="error" onClick={() => setBannerUrl("")} sx={ { ml: 1 } }>
                  Quitar
                </Button>
              )}
            </Box>

            <Divider sx={ { mb: 3 } } />

            {/* COLORES */}
            <Typography variant="body2" color="text.secondary" sx={ { mb: 1 } }>
              Color primario
            </Typography>
            <Box sx={ { display: "flex", alignItems: "center", gap: 2, mb: 3 } }>
              <Box
                component="input"
                type="color"
                value={colorPrimario}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setColorPrimario(e.target.value); setSuccess(false); }}
                sx={ { width: 56, height: 44, border: "1px solid #ccc", borderRadius: 1, cursor: "pointer", p: 0.5 } }
              />
              <Typography variant="body2" sx={ { fontFamily: "monospace" } }>{colorPrimario}</Typography>
            </Box>

            <Typography variant="body2" color="text.secondary" sx={ { mb: 1 } }>
              Color secundario
            </Typography>
            <Box sx={ { display: "flex", alignItems: "center", gap: 2, mb: 3 } }>
              <Box
                component="input"
                type="color"
                value={colorSecundario}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => { setColorSecundario(e.target.value); setSuccess(false); }}
                sx={ { width: 56, height: 44, border: "1px solid #ccc", borderRadius: 1, cursor: "pointer", p: 0.5 } }
              />
              <Typography variant="body2" sx={ { fontFamily: "monospace" } }>{colorSecundario}</Typography>
            </Box>

            {success && <Alert severity="success" sx={ { mb: 2 } }>¡Branding guardado! 🎉</Alert>}
            {error && <Alert severity="error" sx={ { mb: 2 } }>{error}</Alert>}

            <Button
              variant="contained"
              onClick={handleGuardar}
              disabled={loading || !nombre.trim()}
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : undefined}
            >
              {loading ? "Guardando..." : "Guardar cambios"}
            </Button>
          </CardContent>
        </Card>

        {/* PREVIEW */}
        <Box>
          <Typography variant="h6" gutterBottom>👁 Vista previa en vivo</Typography>
          <Card sx={ { overflow: "hidden" } }>
            {/* Banner */}
            {bannerUrl && (
              <Box component="img" src={bannerUrl} alt="banner" sx={ { width: "100%", height: 100, objectFit: "cover", display: "block" } } />
            )}
            {/* Header */}
            <Box sx={ { bgcolor: colorPrimario, px: 3, py: 2, display: "flex", alignItems: "center", gap: 2 } }>
              {logoUrl && (
                <Box component="img" src={logoUrl} alt="logo" sx={ { width: 36, height: 36, objectFit: "contain", borderRadius: 1, bgcolor: "#fff" } } />
              )}
              <Typography variant="h6" sx={ { color: colorSecundario, fontWeight: "bold" } }>
                {nombre || "Nombre de tu plataforma"}
              </Typography>
            </Box>
            {/* Cuerpo */}
            <CardContent sx={ { bgcolor: "#f5f5f5" } }>
              <Box sx={ { bgcolor: colorPrimario, color: colorSecundario, borderRadius: 1, p: 1.5, textAlign: "center", mb: 2, fontWeight: "bold" } }>
                ▶ Ver stream
              </Box>
              <Typography variant="body2" color="text.secondary" textAlign="center">
                Así verán tu app los usuarios
              </Typography>
            </CardContent>
          </Card>
        </Box>

      </Box>
    </Box>
  );
}