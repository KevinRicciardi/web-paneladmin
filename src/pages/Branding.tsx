import { useRef, useState } from "react";
import {
  Alert, Box, Button, Card, CardContent, CircularProgress,
  IconButton, InputAdornment, TextField, Tooltip, Typography,
} from "@mui/material";
import { auth } from "../firebase";
import type { Perfil } from "../types";

const API_URL = "http://localhost:3000";
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string;

type Colores = {
  fondo: string;
  cabecera: string;
  texto: string;
  primario: string;
  secundario: string;
};

// Temas predefinidos: cada uno define la paleta completa
const PRESETS: { nombre: string; colores: Colores }[] = [
  { nombre: "Azul",     colores: { fondo: "#000000", cabecera: "#0A0A0A", texto: "#FFFFFF", primario: "#3B82F6", secundario: "#94A3B8" } },
  { nombre: "Verde",           colores: { fondo: "#07120C", cabecera: "#0C1F14", texto: "#FFFFFF", primario: "#22C55E", secundario: "#86EFAC" } },
  { nombre: "Púrpura",         colores: { fondo: "#0F0A16", cabecera: "#1A0F26", texto: "#FFFFFF", primario: "#A855F7", secundario: "#D8B4FE" } },
  { nombre: "Blanco y Negro",  colores: { fondo: "#000000", cabecera: "#0A0A0A", texto: "#FFFFFF", primario: "#FFFFFF", secundario: "#A3A3A3" } },
  { nombre: "Negro y Dorado",  colores: { fondo: "#0A0A0A", cabecera: "#000000", texto: "#F5E6C8", primario: "#D4AF37", secundario: "#8B7500" } },
  { nombre: "Rojo",            colores: { fondo: "#0A0A0A", cabecera: "#140000", texto: "#FFFFFF", primario: "#EF4444", secundario: "#FCA5A5" } },
  { nombre: "Claro",           colores: { fondo: "#FFFFFF", cabecera: "#F3F4F6", texto: "#111827", primario: "#3B82F6", secundario: "#6B7280" } },
];

const CAMPOS: { key: keyof Colores; label: string }[] = [
  { key: "fondo",      label: "Color de Fondo" },
  { key: "cabecera",   label: "Color de Cabecera" },
  { key: "texto",      label: "Color de Texto" },
  { key: "primario",   label: "Color Primario" },
  { key: "secundario", label: "Color Secundario" },
];

// Devuelve negro o blanco según qué contraste mejor con el color de fondo
function contraste(hex: string): string {
  let h = (hex || "").replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6) return "#FFFFFF";
  const r = parseInt(h.substr(0, 2), 16);
  const g = parseInt(h.substr(2, 2), 16);
  const b = parseInt(h.substr(4, 2), 16);
  const L = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return L > 0.6 ? "#000000" : "#FFFFFF";
}

async function subirACloudinary(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  const res = await fetch(
    "https://api.cloudinary.com/v1_1/" + CLOUD_NAME + "/image/upload",
    { method: "POST", body: formData }
  );
  if (!res.ok) throw new Error("Error al subir imagen");
  const data = await res.json();
  return data.secure_url as string;
}

function CardHeader({ icon, children }: { icon: string; children: React.ReactNode }) {
  return (
    <Typography
      sx={ {
        display: "flex", alignItems: "center", gap: 1, mb: 2,
        fontSize: 12, fontWeight: 600, letterSpacing: 1.5,
        textTransform: "uppercase", color: "text.secondary", fontFamily: "monospace",
      } }
    >
      <span style={ { fontSize: 16 } }>{icon}</span>
      {children}
    </Typography>
  );
}

export default function Branding({ perfil }: { perfil: Perfil }) {
  const t = perfil.tenant;
  const inicial = {
    nombre: t?.nombre ?? "",
    logoUrl: t?.logoUrl ?? "",
    bannerUrl: t?.bannerUrl ?? "",
    colores: {
      fondo: t?.colorFondo ?? "#000000",
      cabecera: t?.colorCabecera ?? "#000000",
      texto: t?.colorTexto ?? "#FFFFFF",
      primario: t?.colorPrimario ?? "#3B82F6",
      secundario: t?.colorSecundario ?? "#94A3B8",
    } as Colores,
  };

  const [nombre, setNombre] = useState(inicial.nombre);
  const [logoUrl, setLogoUrl] = useState(inicial.logoUrl);
  const [bannerUrl, setBannerUrl] = useState(inicial.bannerUrl);
  const [colores, setColores] = useState<Colores>(inicial.colores);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [copiado, setCopiado] = useState<string | null>(null);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  const onPrimario = contraste(colores.primario);
  const onSecundario = contraste(colores.secundario);

  const setColor = (key: keyof Colores, val: string) => {
    setColores((prev) => ({ ...prev, [key]: val }));
    setSuccess(false);
  };
  const aplicarPreset = (c: Colores) => { setColores(c); setSuccess(false); };

  const handleUpload = async (file: File, tipo: "logo" | "banner") => {
    tipo === "logo" ? setUploadingLogo(true) : setUploadingBanner(true);
    setError("");
    try {
      const url = await subirACloudinary(file);
      tipo === "logo" ? setLogoUrl(url) : setBannerUrl(url);
      setSuccess(false);
    } catch {
      setError("No se pudo subir la imagen. Revisá el preset unsigned de Cloudinary.");
    } finally {
      tipo === "logo" ? setUploadingLogo(false) : setUploadingBanner(false);
    }
  };

  const handleDrop = (e: React.DragEvent, tipo: "logo" | "banner") => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file, tipo);
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, tipo: "logo" | "banner") => {
    const file = e.target.files?.[0];
    if (file) handleUpload(file, tipo);
  };
  const copiar = (valor: string, key: string) => {
    navigator.clipboard.writeText(valor);
    setCopiado(key);
    setTimeout(() => setCopiado(null), 1500);
  };
  const handleDescartar = () => {
    setNombre(inicial.nombre);
    setLogoUrl(inicial.logoUrl);
    setBannerUrl(inicial.bannerUrl);
    setColores(inicial.colores);
    setSuccess(false);
    setError("");
  };
  const handleGuardar = async () => {
    setLoading(true);
    setSuccess(false);
    setError("");
    try {
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${API_URL}/tenants/mi-tenant`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nombre, logoUrl, bannerUrl,
          colorFondo: colores.fondo,
          colorCabecera: colores.cabecera,
          colorTexto: colores.texto,
          colorPrimario: colores.primario,
          colorSecundario: colores.secundario,
        }),
      });
      if (!res.ok) throw new Error("Error");
      setSuccess(true);
    } catch {
      setError("No se pudo guardar. Intentá de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  // input color visible en línea (evita que el picker se abra "arriba")
  const colorInputSx = {
    width: 46, height: 40, minWidth: 46, p: 0.5, m: 0,
    border: "1px solid", borderColor: "grey.300", borderRadius: 1,
    bgcolor: "background.paper", cursor: "pointer",
    "&::-webkit-color-swatch-wrapper": { padding: 0 },
    "&::-webkit-color-swatch": { border: "none", borderRadius: "4px" },
  } as const;

  const presetActivo = (c: Colores) =>
    (Object.keys(c) as (keyof Colores)[]).every((k) => c[k].toUpperCase() === colores[k].toUpperCase());

  return (
    <Box>
      <Typography variant="h4" gutterBottom>Configuración de Marca</Typography>
      <Typography color="text.secondary" sx={ { mb: 4, maxWidth: 640 } }>
        Personalizá la identidad visual de tu aplicación cliente. Los cambios realizados aquí se reflejarán en todas las instancias de transmisión gestionadas.
      </Typography>

      <Box sx={ { display: "grid", gridTemplateColumns: { xs: "1fr", md: "5fr 7fr" }, gap: 4, alignItems: "start" } }>

        {/* ── Columna izquierda ── */}
        <Box sx={ { display: "flex", flexDirection: "column", gap: 3 } }>

          {/* Nombre */}
          <Card variant="outlined">
            <CardContent>
              <CardHeader icon="🏷️">Nombre de la Marca</CardHeader>
              <TextField value={nombre} fullWidth placeholder="Ej: StreamManager"
                onChange={(e) => { setNombre(e.target.value); setSuccess(false); }} />
            </CardContent>
          </Card>

          {/* Logo */}
          <Card variant="outlined">
            <CardContent>
              <CardHeader icon="🖼️">Logo de la Marca</CardHeader>
              <input ref={logoInputRef} type="file" accept="image/png,image/svg+xml,image/jpeg" hidden
                onChange={(e) => handleFileChange(e, "logo")} />
              <Box
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, "logo")}
                onClick={() => !uploadingLogo && logoInputRef.current?.click()}
                sx={ {
                  border: "2px dashed", borderColor: logoUrl ? "primary.main" : "grey.300",
                  borderRadius: 2, p: 4, textAlign: "center", cursor: "pointer",
                  bgcolor: logoUrl ? "primary.50" : "grey.50",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: 1, transition: "all 0.2s",
                  "&:hover": { bgcolor: "action.hover", borderColor: "primary.main" },
                } }
              >
                {uploadingLogo ? <CircularProgress size={40} /> : logoUrl ? (
                  <Box component="img" src={logoUrl} sx={ { maxHeight: 110, maxWidth: "100%", objectFit: "contain", borderRadius: 1 } } />
                ) : (
                  <>
                    <Box sx={ { width: 64, height: 64, borderRadius: "50%", bgcolor: "grey.200", display: "flex", alignItems: "center", justifyContent: "center", mb: 1, fontSize: 30 } }>📤</Box>
                    <Typography variant="body1">Arrastrá y soltá tu logo aquí</Typography>
                    <Typography variant="body2" color="text.secondary">PNG, SVG o JPG (máx. 2MB)</Typography>
                    <Button variant="outlined" size="small" sx={ { mt: 1 } }
                      onClick={(e) => { e.stopPropagation(); logoInputRef.current?.click(); } }>Buscar Archivos</Button>
                  </>
                )}
              </Box>
              {logoUrl && (
                <Box sx={ { textAlign: "right", mt: 1 } }>
                  <Button size="small" color="error" onClick={() => { setLogoUrl(""); setSuccess(false); }}>Quitar logo</Button>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Temas predefinidos */}
          <Card variant="outlined">
            <CardContent>
              <CardHeader icon="✨">Temas Predefinidos</CardHeader>
              <Box sx={ { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 1.5 } }>
                {PRESETS.map((p) => {
                  const activo = presetActivo(p.colores);
                  return (
                    <Box key={p.nombre} onClick={() => aplicarPreset(p.colores)}
                      sx={ {
                        cursor: "pointer", border: "2px solid",
                        borderColor: activo ? "primary.main" : "grey.200",
                        borderRadius: 2, p: 1, display: "flex", flexDirection: "column", gap: 0.75,
                        transition: "all 0.15s",
                        "&:hover": { borderColor: "primary.light", transform: "translateY(-2px)" },
                      } }
                    >
                      <Box sx={ { display: "flex", gap: 0.5, height: 24 } }>
                        {[p.colores.primario, p.colores.secundario, p.colores.cabecera, p.colores.fondo].map((c, i) => (
                          <Box key={i} sx={ { flex: 1, borderRadius: 0.5, bgcolor: c, border: "1px solid", borderColor: "grey.200" } } />
                        ))}
                      </Box>
                      <Typography sx={ { fontSize: 11, fontWeight: 600, textAlign: "center" } }>{p.nombre}</Typography>
                    </Box>
                  );
                })}
              </Box>
            </CardContent>
          </Card>

          {/* Personalizar colores */}
          <Card variant="outlined">
            <CardContent>
              <CardHeader icon="🎨">Personalizar Colores</CardHeader>
              {CAMPOS.map(({ key, label }) => (
                <Box key={key} sx={ { mb: 2, "&:last-child": { mb: 0 } } }>
                  <Typography variant="body2" color="text.secondary" gutterBottom>{label}</Typography>
                  <Box sx={ { display: "flex", alignItems: "center", gap: 1.5 } }>
                    <Box component="input" type="color" value={colores[key]}
                      onChange={(e) => setColor(key, e.target.value)} sx={colorInputSx} />
                    <TextField
                      value={colores[key]} size="small" fullWidth
                      onChange={(e) => setColor(key, e.target.value)}
                      inputProps={ { maxLength: 7, style: { fontFamily: "monospace" } } }
                      InputProps={ {
                        endAdornment: (
                          <InputAdornment position="end">
                            <Tooltip title={copiado === key ? "¡Copiado!" : "Copiar"}>
                              <IconButton size="small" onClick={() => copiar(colores[key], key)}>
                                {copiado === key ? "✓" : "📋"}
                              </IconButton>
                            </Tooltip>
                          </InputAdornment>
                        ),
                      } }
                    />
                  </Box>
                </Box>
              ))}
            </CardContent>
          </Card>

          {/* Banner */}
          <Card variant="outlined">
            <CardContent>
              <CardHeader icon="📐">Banner de Cabecera</CardHeader>
              <input ref={bannerInputRef} type="file" accept="image/*" hidden
                onChange={(e) => handleFileChange(e, "banner")} />
              <Box
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, "banner")}
                onClick={() => !uploadingBanner && bannerInputRef.current?.click()}
                sx={ {
                  border: "2px dashed", borderColor: bannerUrl ? "primary.main" : "grey.300",
                  borderRadius: 2, cursor: "pointer", minHeight: 96, overflow: "hidden",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: 1, bgcolor: bannerUrl ? "transparent" : "grey.50", transition: "all 0.2s",
                  "&:hover": { borderColor: "primary.main" },
                } }
              >
                {uploadingBanner ? <CircularProgress size={28} sx={ { my: 2 } } /> : bannerUrl ? (
                  <Box component="img" src={bannerUrl} sx={ { width: "100%", height: 96, objectFit: "cover" } } />
                ) : (
                  <Box sx={ { py: 2, textAlign: "center" } }>
                    <Typography variant="body2" color="text.secondary" gutterBottom>Tamaño recomendado: 1920x320px</Typography>
                    <Button variant="outlined" size="small"
                      onClick={(e) => { e.stopPropagation(); bannerInputRef.current?.click(); } }>⬆️ Seleccionar Imagen</Button>
                  </Box>
                )}
              </Box>
              {bannerUrl && (
                <Box sx={ { textAlign: "right", mt: 1 } }>
                  <Button size="small" color="error" onClick={() => { setBannerUrl(""); setSuccess(false); }}>Quitar banner</Button>
                </Box>
              )}
            </CardContent>
          </Card>

          {success && <Alert severity="success">¡Configuración guardada! 🎉</Alert>}
          {error && <Alert severity="error">{error}</Alert>}

          <Box sx={ { display: "flex", justifyContent: "flex-end", gap: 1.5, pt: 1, borderTop: "1px solid", borderColor: "divider" } }>
            <Button variant="outlined" onClick={handleDescartar} disabled={loading || uploadingLogo || uploadingBanner}>Descartar Cambios</Button>
            <Button variant="contained" onClick={handleGuardar} disabled={loading || uploadingLogo || uploadingBanner}
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <span>💾</span>}>
              {loading ? "Guardando..." : "Guardar Configuración"}
            </Button>
          </Box>
        </Box>

        {/* ── Columna derecha: Preview ── */}
        <Box sx={ { position: { md: "sticky" }, top: 24 } }>
          <Card variant="outlined" sx={ { overflow: "hidden" } }>
            <Box sx={ { px: 2, py: 1.25, borderBottom: "1px solid", borderColor: "divider", display: "flex", alignItems: "center", justifyContent: "space-between", bgcolor: "grey.50" } }>
              <Typography sx={ { display: "flex", alignItems: "center", gap: 1, fontSize: 12, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "text.secondary", fontFamily: "monospace" } }>
                👁️ Vista Previa en Vivo
              </Typography>
              <Box sx={ { display: "flex", gap: 0.75 } }>
                {[0, 1, 2].map((i) => <Box key={i} sx={ { width: 10, height: 10, borderRadius: "50%", bgcolor: "grey.300" } } />)}
              </Box>
            </Box>

            {/* App cliente simulada — usa los colores personalizados */}
            <Box sx={ { bgcolor: colores.fondo, color: colores.texto } }>
              {/* Header */}
              <Box sx={ { display: "flex", alignItems: "center", justifyContent: "space-between", px: 2, py: 1.5, bgcolor: colores.cabecera, borderBottom: "1px solid rgba(128,128,128,0.25)" } }>
                <Box sx={ { display: "flex", alignItems: "center", gap: 1 } }>
                  {logoUrl
                    ? <Box component="img" src={logoUrl} sx={ { width: 24, height: 24, objectFit: "contain" } } />
                    : <Typography sx={ { fontSize: 18 } }>▶️</Typography>}
                  <Typography sx={ { fontSize: 13, fontWeight: 800, letterSpacing: -0.5, textTransform: "uppercase", color: colores.texto } }>
                    {nombre || "STREAMLY"}
                  </Typography>
                </Box>
                <Box sx={ { display: "flex", alignItems: "center", gap: 1 } }>
                  <Box sx={ { bgcolor: colores.primario, color: onPrimario, fontSize: 10, fontWeight: 700, textTransform: "uppercase", px: 1, py: 0.4 } }>Seguir</Box>
                  <Box sx={ { width: 24, height: 24, borderRadius: "50%", border: "1px solid rgba(128,128,128,0.4)", bgcolor: "rgba(128,128,128,0.2)" } } />
                </Box>
              </Box>

              <Box sx={ { p: 2, display: "flex", flexDirection: "column", gap: 2.5 } }>
                {/* EN VIVO AHORA */}
                <Box>
                  <Typography sx={ { fontSize: 10, fontWeight: 900, opacity: 0.5, textTransform: "uppercase", letterSpacing: 2, mb: 1, color: colores.texto } }>En Vivo Ahora</Typography>
                  <Box sx={ {
                    position: "relative", width: "100%", aspectRatio: "16 / 9",
                    border: "1px solid rgba(128,128,128,0.25)",
                    bgcolor: bannerUrl ? "transparent" : "rgba(128,128,128,0.15)",
                    backgroundImage: bannerUrl ? "url(" + bannerUrl + ")" : "none",
                    backgroundSize: "cover", backgroundPosition: "center",
                    display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden",
                  } }>
                    <Box sx={ { position: "absolute", top: 8, left: 8, display: "flex", alignItems: "center", gap: 0.5, bgcolor: colores.primario, px: 0.75, py: 0.25 } }>
                      <Box sx={ { width: 4, height: 4, borderRadius: "50%", bgcolor: onPrimario } } />
                      <Typography sx={ { fontSize: 8, fontWeight: 900, color: onPrimario } }>EN VIVO</Typography>
                    </Box>
                    <Typography sx={ { fontSize: 40, opacity: 0.6 } }>▶️</Typography>
                  </Box>
                </Box>

                {/* Panel canal */}
                <Box sx={ { bgcolor: "rgba(128,128,128,0.12)", border: "1px solid rgba(128,128,128,0.22)", p: 2 } }>
                  <Box sx={ { display: "flex", alignItems: "center", gap: 1.5, mb: 1.5 } }>
                    <Box sx={ { width: 36, height: 36, border: "1px solid rgba(128,128,128,0.3)", overflow: "hidden", flexShrink: 0, bgcolor: colores.primario, display: "flex", alignItems: "center", justifyContent: "center" } }>
                      {logoUrl
                        ? <Box component="img" src={logoUrl} sx={ { width: "100%", height: "100%", objectFit: "cover" } } />
                        : <Typography sx={ { fontSize: 14 } }>🎬</Typography>}
                    </Box>
                    <Box sx={ { flexGrow: 1, minWidth: 0 } }>
                      <Typography sx={ { fontSize: 13, fontWeight: 700, color: colores.texto } } noWrap>{nombre || "CyberStream Pro"}</Typography>
                      <Typography sx={ { fontSize: 10, opacity: 0.5, color: colores.texto } }>45.2k Seguidores</Typography>
                    </Box>
                    <Box sx={ { bgcolor: colores.primario, color: onPrimario, fontSize: 10, fontWeight: 700, textTransform: "uppercase", px: 1, py: 0.4, flexShrink: 0 } }>Seguir</Box>
                  </Box>
                  <Typography sx={ { fontSize: 12, opacity: 0.7, lineHeight: 1.6, color: colores.texto } }>
                    Transmitiendo lo último en tecnología de alta fidelidad y pruebas de rendimiento.
                  </Typography>
                </Box>

                {/* Agenda */}
                <Box sx={ { bgcolor: "rgba(128,128,128,0.12)", border: "1px solid rgba(128,128,128,0.22)", p: 2 } }>
                  <Typography sx={ { fontSize: 10, fontWeight: 900, opacity: 0.5, textTransform: "uppercase", letterSpacing: 2, mb: 1.5, pb: 1, borderBottom: "1px solid rgba(128,128,128,0.22)", color: colores.texto } }>Agenda Semanal</Typography>
                  <Box sx={ { display: "flex", alignItems: "center", gap: 1.5 } }>
                    <Box sx={ { width: 40, height: 40, bgcolor: colores.secundario, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 } }>
                      <Typography sx={ { fontSize: 8, fontWeight: 900, color: onSecundario } }>HOY</Typography>
                      <Typography sx={ { fontSize: 14, fontWeight: 900, color: onSecundario } }>16</Typography>
                    </Box>
                    <Box>
                      <Typography sx={ { fontSize: 12, fontWeight: 700, color: colores.texto } }>Review: RTX 5090</Typography>
                      <Typography sx={ { fontSize: 10, opacity: 0.5, color: colores.texto } }>Análisis detallado en vivo.</Typography>
                    </Box>
                  </Box>
                </Box>
              </Box>

              {/* Bottom nav */}
              <Box sx={ { display: "flex", justifyContent: "space-around", py: 1.5, bgcolor: colores.cabecera, borderTop: "1px solid rgba(128,128,128,0.25)" } }>
                {["🏠", "📰", "📅", "👤"].map((icon, i) => (
                  <Typography key={i} sx={ { fontSize: 18, opacity: i === 0 ? 1 : 0.35 } }>{icon}</Typography>
                ))}
              </Box>
            </Box>
          </Card>
        </Box>

      </Box>
    </Box>
  );
}