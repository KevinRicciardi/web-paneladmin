import { useRef, useState } from "react";
import {
  Alert, Box, Button, Card, CardContent, CircularProgress,
  IconButton, InputAdornment, TextField, Tooltip, Typography,
  alpha,
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

function sinSetear(hex?: string): boolean {
  const h = (hex || "").replace("#", "").trim().toUpperCase();
  return !h || h === "000000" || h === "FF000000";
}

function oscurecer(hex: string, factor: number): string {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length === 6) h = `FF${h}`;
  if (h.length !== 8) return hex;

  const value = parseInt(h, 16);
  const r = (value >> 16) & 0xff;
  const g = (value >> 8) & 0xff;
  const b = value & 0xff;

  const nr = Math.round(r * (1 - factor));
  const ng = Math.round(g * (1 - factor));
  const nb = Math.round(b * (1 - factor));

  return `#${nr.toString(16).padStart(2, "0")}${ng.toString(16).padStart(2, "0")}${nb.toString(16).padStart(2, "0")}`;
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
      <span className="material-symbols-outlined" style={ { fontSize: 16 } }>{icon}</span>
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

  const TF: any = TextField;

  const onPrimario = contraste(colores.primario);
  const textoTenue = alpha(colores.texto, 0.55);
  const textoSuave = alpha(colores.texto, 0.75);
  const card = alpha(colores.texto, 0.05);
  const borde = alpha(colores.texto, 0.12);

  const fondo = sinSetear(colores.fondo) ? oscurecer(colores.primario, 0.86) : colores.fondo;
  const cabecera = sinSetear(colores.cabecera) ? oscurecer(colores.primario, 0.92) : colores.cabecera;

  const sectionLabel = (texto: string) => (
    <Typography sx={ { fontSize: 12, letterSpacing: 1.5, fontWeight: 600, textTransform: "uppercase", color: textoTenue, mb: 1 } }>
      {texto}
    </Typography>
  );

  const sectionCard = {
    p: 2, borderRadius: 2, bgcolor: card, border: `1px solid ${borde}`,
  } as const;

  const navItem = (texto: string, activo = false, onClick?: () => void) => (
    <Box
      onClick={onClick}
      sx={ {
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
        gap: 0.5, px: 1, py: 0.5, cursor: onClick ? "pointer" : "default",
      } }
    >
      <Typography sx={ { color: activo ? colores.texto : textoSuave, fontWeight: activo ? 700 : 500 } }>{texto}</Typography>
      {activo && <Box sx={ { width: 20, height: 2, borderRadius: 1, bgcolor: colores.primario } } />}
    </Box>
  );

  const brandAvatar = (size: number) => (
    <Box sx={ { width: size, height: size, borderRadius: "50%", bgcolor: card, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" } }>
      {logoUrl ? (
        <Box component="img" src={logoUrl} sx={ { width: "100%", height: "100%", objectFit: "cover" } } />
      ) : (
        <span className="material-symbols-outlined" style={ { color: textoTenue, fontSize: size * 0.5 } }>play_circle</span>
      )}
    </Box>
  );

  const userAvatar = (
    <Box sx={ { width: 34, height: 34, borderRadius: "50%", bgcolor: card, display: "flex", alignItems: "center", justifyContent: "center" } }>
      <span className="material-symbols-outlined" style={ { color: textoSuave, fontSize: 18 } }>person</span>
    </Box>
  );

  const botonPrimario = (texto: string) => (
    <Button fullWidth variant="contained" sx={ { backgroundColor: colores.primario, color: onPrimario, fontWeight: 700, textTransform: "none", borderRadius: 1, py: 1.75 } }>
      {texto}
    </Button>
  );

  const fecha = (dia: string, num: string, hoy: boolean) => (
    <Box sx={ { width: 46, py: 1, bgcolor: hoy ? colores.primario : alpha(colores.texto, 0.06), borderRadius: 2, textAlign: "center" } }>
      <Typography sx={ { color: hoy ? alpha(onPrimario, 0.7) : textoTenue, fontSize: 9, fontWeight: 700 } }>{dia}</Typography>
      <Typography sx={ { color: hoy ? onPrimario : colores.texto, fontSize: 16, fontWeight: 700 } }>{num}</Typography>
    </Box>
  );

  const agendaItem = (dia: string, num: string, hoy: boolean, titulo: string, sub: string) => (
    <Box sx={ { pb: 1.75 } }>
      <Box sx={ { display: "flex", gap: 1.5 } }>
        {fecha(dia, num, hoy)}
        <Box sx={ { flex: 1 } }>
          <Typography sx={ { color: hoy ? colores.texto : textoSuave, fontWeight: 700 } }>{titulo}</Typography>
          {!!sub && <Typography sx={ { color: textoTenue, fontSize: 12 } }>{sub}</Typography>}
        </Box>
      </Box>
    </Box>
  );

  const noticiaItem = (tag: string, titulo: string) => (
    <Box sx={ { pb: 1.75 } }>
      <Box sx={ { display: "inline-flex", px: 1, py: 0.5, borderRadius: 0.75, bgcolor: alpha(colores.texto, 0.1) } }>
        <Typography sx={ { fontSize: 10, fontWeight: 800, color: colores.texto } }>{tag.toUpperCase()}</Typography>
      </Box>
      <Typography sx={ { color: colores.texto, fontWeight: 700, mt: 1 } }>{titulo}</Typography>
    </Box>
  );

  const mencionItem = (nombrePersona: string, textoItem: string) => (
    <Box sx={ { pb: 1.5, display: "flex", gap: 2, alignItems: "flex-start" } }>
      <Box sx={ { width: 28, height: 28, borderRadius: "50%", bgcolor: card, display: "flex", alignItems: "center", justifyContent: "center" } }>
        <span className="material-symbols-outlined" style={ { color: textoTenue, fontSize: 16 } }>person</span>
      </Box>
      <Box>
        <Typography sx={ { color: colores.texto, fontWeight: 700, fontSize: 13 } }>{nombrePersona}</Typography>
        <Typography sx={ { color: textoTenue, fontSize: 12 } }>{textoItem}</Typography>
      </Box>
    </Box>
  );

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
    border: "1px solid", borderColor: borde, borderRadius: 1,
    bgcolor: alpha(colores.texto, 0.08), cursor: "pointer",
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
              <CardHeader icon="label">Nombre de la Marca</CardHeader>
              <TextField value={nombre} fullWidth placeholder="Ej: StreamManager"
                onChange={(e) => { setNombre(e.target.value); setSuccess(false); }} />
            </CardContent>
          </Card>

          {/* Logo */}
          <Card variant="outlined">
            <CardContent>
              <CardHeader icon="image">Logo de la Marca</CardHeader>
              <input ref={logoInputRef} type="file" accept="image/png,image/svg+xml,image/jpeg" hidden
                onChange={(e) => handleFileChange(e, "logo")} />
              <Box
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, "logo")}
                onClick={() => !uploadingLogo && logoInputRef.current?.click()}
                sx={ {
                  border: "2px dashed", borderColor: logoUrl ? colores.primario : borde,
                  borderRadius: 2, p: 4, textAlign: "center", cursor: "pointer",
                  bgcolor: logoUrl ? alpha(colores.primario, 0.12) : alpha(colores.texto, 0.03),
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: 1, transition: "all 0.2s",
                  "&:hover": { bgcolor: alpha(colores.texto, 0.05), borderColor: colores.primario },
                } }
              >
                {uploadingLogo ? <CircularProgress size={40} /> : logoUrl ? (
                  <Box component="img" src={logoUrl} sx={ { maxHeight: 110, maxWidth: "100%", objectFit: "contain", borderRadius: 1 } } />
                ) : (
                  <>
                    <Box sx={ { width: 64, height: 64, borderRadius: "50%", bgcolor: alpha(colores.texto, 0.04), display: "flex", alignItems: "center", justifyContent: "center", mb: 1, fontSize: 30 } }>
                      <span className="material-symbols-outlined">file_upload</span>
                    </Box>
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
              <CardHeader icon="palette">Temas Predefinidos</CardHeader>
              <Box sx={ { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 1.5 } }>
                {PRESETS.map((p) => {
                  const activo = presetActivo(p.colores);
                  return (
                    <Box key={p.nombre} onClick={() => aplicarPreset(p.colores)}
                      sx={ {
                        cursor: "pointer", border: "2px solid",
                        borderColor: activo ? "primary.main" : alpha(colores.texto, 0.08),
                        borderRadius: 2, p: 1, display: "flex", flexDirection: "column", gap: 0.75,
                        transition: "all 0.15s",
                        bgcolor: alpha(colores.texto, 0.02),
                        "&:hover": { borderColor: colores.primario, transform: "translateY(-2px)" },
                      } }
                    >
                      <Box sx={ { display: "flex", gap: 0.5, height: 24 } }>
                        {[p.colores.primario, p.colores.secundario, p.colores.cabecera, p.colores.fondo].map((c, i) => (
                          <Box key={i} sx={ { flex: 1, borderRadius: 0.5, bgcolor: c, border: "1px solid", borderColor: borde } } />
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
              <CardHeader icon="palette">Personalizar Colores</CardHeader>
              {CAMPOS.map(({ key, label }) => (
                <Box key={key} sx={ { mb: 2, "&:last-child": { mb: 0 } } }>
                  <Typography variant="body2" color="text.secondary" gutterBottom>{label}</Typography>
                  <Box sx={ { display: "flex", alignItems: "center", gap: 1.5 } }>
                    <Box component="input" type="color" value={colores[key]}
                      onChange={(e) => setColor(key, e.target.value)} sx={colorInputSx} />
                    <TF
                      value={colores[key]} size="small" fullWidth
                      onChange={(e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => setColor(key, e.target.value)}
                      InputProps={ {
                        inputProps: { maxLength: 7, style: { fontFamily: "monospace" } },
                        endAdornment: (
                          <InputAdornment position="end">
                            <Tooltip title={copiado === key ? "¡Copiado!" : "Copiar"}>
                              <IconButton size="small" onClick={() => copiar(colores[key], key)}>
                                {copiado === key ? "✓" : <span className="material-symbols-outlined">content_copy</span>}
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
              <CardHeader icon="photo_size_select_large">Banner de Cabecera</CardHeader>
              <input ref={bannerInputRef} type="file" accept="image/*" hidden
                onChange={(e) => handleFileChange(e, "banner")} />
              <Box
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleDrop(e, "banner")}
                onClick={() => !uploadingBanner && bannerInputRef.current?.click()}
                sx={ {
                  border: "2px dashed", borderColor: bannerUrl ? "primary.main" : borde,
                  borderRadius: 2, cursor: "pointer", minHeight: 96, overflow: "hidden",
                  display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                  gap: 1, bgcolor: bannerUrl ? "transparent" : alpha(colores.texto, 0.03), transition: "all 0.2s",
                  "&:hover": { bgcolor: alpha(colores.texto, 0.05), borderColor: "primary.main" },
                } }
              >
                {uploadingBanner ? <CircularProgress size={28} sx={ { my: 2 } } /> : bannerUrl ? (
                  <Box component="img" src={bannerUrl} sx={ { width: "100%", height: 96, objectFit: "cover" } } />
                ) : (
                  <Box sx={ { py: 2, textAlign: "center" } }>
                    <Typography variant="body2" color="text.secondary" gutterBottom>Tamaño recomendado: 1920x320px</Typography>
                    <Button variant="outlined" size="small"
                      onClick={(e) => { e.stopPropagation(); bannerInputRef.current?.click(); } } startIcon={<span className="material-symbols-outlined">file_upload</span>}>
                      Seleccionar Imagen
                    </Button>
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

          {success && <Alert severity="success">¡Configuración guardada!</Alert>}
          {error && <Alert severity="error">{error}</Alert>}

          <Box sx={ { display: "flex", justifyContent: "flex-end", gap: 1.5, pt: 1, borderTop: "1px solid", borderColor: "divider" } }>
            <Button variant="outlined" onClick={handleDescartar} disabled={loading || uploadingLogo || uploadingBanner}>Descartar Cambios</Button>
            <Button variant="contained" onClick={handleGuardar} disabled={loading || uploadingLogo || uploadingBanner}
              startIcon={loading ? <CircularProgress size={18} color="inherit" /> : <span className="material-symbols-outlined">save</span>}>
              {loading ? "Guardando..." : "Guardar Configuración"}
            </Button>
          </Box>
        </Box>

        {/* ── Columna derecha: Preview ── */}
        <Box sx={ { position: { md: "sticky" }, top: 24 } }>
          <Card variant="outlined" sx={ { overflow: "hidden" } }>
            <Box sx={ { px: 2, py: 1.25, borderBottom: "1px solid", borderColor: borde, display: "flex", alignItems: "center", justifyContent: "space-between", bgcolor: alpha(colores.texto, 0.04) } }>
              <Typography sx={ { display: "flex", alignItems: "center", gap: 1, fontSize: 12, fontWeight: 600, letterSpacing: 1.5, textTransform: "uppercase", color: "text.secondary", fontFamily: "JetBrains Mono, monospace" } }>
                <span className="material-symbols-outlined" style={ { verticalAlign: 'middle', marginRight: 8 } }>visibility</span>
                Vista Previa de Inicio
              </Typography>
              <Box sx={ { display: "flex", gap: 0.75, alignItems: 'center' } }>
                {[0, 1, 2].map((i) => (
                  <Box key={i} sx={ { width: 8, height: 8, borderRadius: "50%", bgcolor: alpha(colores.texto, 0.14), border: "1px solid", borderColor: borde, opacity: i === 0 ? 1 : 0.55 } } />
                ))}
              </Box>
            </Box>

            <Box sx={ { bgcolor: fondo, color: colores.texto } }>
              <Box sx={ { bgcolor: cabecera, borderBottom: `1px solid ${borde}`, px: 2, py: 1.5, display: "flex", alignItems: "center", gap: 1 } }>
                {logoUrl ? (
                  <Box component="img" src={logoUrl} sx={ { width: 28, height: 28, borderRadius: 1, objectFit: "cover" } } />
                ) : (
                  <Box sx={ { width: 28, height: 28, borderRadius: 1, bgcolor: colores.primario, display: "flex", alignItems: "center", justifyContent: "center" } }>
                    <span className="material-symbols-outlined" style={ { color: onPrimario, fontSize: 18 } }>play_arrow</span>
                  </Box>
                )}
                <Typography sx={ { fontSize: 18, fontWeight: 700, letterSpacing: 1, color: colores.texto } } noWrap>
                  {nombre}
                </Typography>
                <Box sx={ { flexGrow: 1 } } />
                <Box sx={ { display: { xs: "none", md: "flex" }, alignItems: "center", gap: 2 } }>
                  {navItem("Inicio", true)}
                  {navItem("Noticias", false)}
                  {navItem("Agenda", false)}
                </Box>
                <Box sx={ { display: "flex", alignItems: "center", gap: 1, ml: 2 } }>
                  <span className="material-symbols-outlined" style={ { color: textoSuave, fontSize: 20 } }>search</span>
                  {userAvatar}
                </Box>
              </Box>

              <Box sx={ { p: 2, display: "flex", flexDirection: "column", gap: 3 } }>
                <Box>
                  {sectionLabel("Stream")}
                  <Box sx={ sectionCard }>
                    <Box sx={ { width: "100%", aspectRatio: "16 / 9", bgcolor: bannerUrl ? "transparent" : alpha(colores.texto, 0.08), backgroundImage: bannerUrl ? `url(${bannerUrl})` : "none", backgroundSize: "cover", backgroundPosition: "center", position: "relative", display: "flex", alignItems: "center", justifyContent: "center" } }>
                      <Box sx={ { position: "absolute", top: 12, left: 12, display: "flex", alignItems: "center", gap: 0.5, bgcolor: colores.primario, px: 1, py: 0.4, borderRadius: 1 } }>
                        <Box sx={ { width: 6, height: 6, borderRadius: "50%", bgcolor: onPrimario } } />
                        <Typography sx={ { fontSize: 9, fontWeight: 900, color: onPrimario } }>EN VIVO</Typography>
                      </Box>
                      <Box sx={ { width: 80, height: 80, borderRadius: "50%", bgcolor: "rgba(0,0,0,0.45)", display: "flex", alignItems: "center", justifyContent: "center" } }>
                        <Box sx={ { width: 40, height: 40, borderRadius: "50%", bgcolor: colores.primario, display: "flex", alignItems: "center", justifyContent: "center" } }>
                          <span className="material-symbols-outlined" style={ { color: onPrimario, fontSize: 26 } }>play_arrow</span>
                        </Box>
                      </Box>
                    </Box>
                    <Box sx={ { pt: 2 } }>
                      <Typography sx={ { fontSize: 20, fontWeight: 700, color: colores.texto } }>{nombre}</Typography>
                    </Box>
                  </Box>
                </Box>

                <Box>
                  {sectionLabel("Publicidad")}
                  <Box sx={ { borderRadius: 2, overflow: "hidden", border: `1px solid ${borde}` } }>
                    {bannerUrl ? (
                      <Box component="img" src={bannerUrl} sx={ { width: "100%", height: 90, objectFit: "cover" } } />
                    ) : (
                      <Box sx={ { width: "100%", height: 90, bgcolor: card, display: "flex", alignItems: "center", justifyContent: "center" } }>
                        <Typography sx={ { color: textoSuave } }>Publicidad</Typography>
                      </Box>
                    )}
                  </Box>
                </Box>

                <Box>
                  {sectionLabel("Streams pasados")}
                  <Box sx={ sectionCard }>
                    <Box sx={ { display: "flex", gap: 1, alignItems: "center", mb: 1 } }>
                      <Box sx={ { width: 54, height: 54, borderRadius: 2, bgcolor: alpha(colores.texto, 0.08), display: "flex", alignItems: "center", justifyContent: "center" } }>
                        <span className="material-symbols-outlined" style={ { color: textoSuave, fontSize: 24 } }>play_arrow</span>
                      </Box>
                      <Typography sx={ { color: textoSuave } }>
                        No hay streams anteriores disponibles.
                      </Typography>
                    </Box>
                    {botonPrimario("Ver más")}
                  </Box>
                </Box>

                <Box sx={ { display: "grid", gridTemplateColumns: { xs: "1fr", md: "2fr 1fr" }, gap: 2 } }>
                  <Box sx={ { display: "grid", gap: 2 } }>
                    <Box sx={ sectionCard }>
                      <Box sx={ { display: "flex", alignItems: "center", gap: 1.5, mb: 2 } }>
                        {brandAvatar(44)}
                        <Box sx={ { flex: 1, minWidth: 0 } }>
                          <Typography sx={ { color: colores.texto, fontWeight: 700 } } noWrap>{nombre}</Typography>
                        </Box>
                        {botonPrimario("Seguir")}
                      </Box>
                    </Box>
                    <Box sx={ sectionCard }>
                      <Typography sx={ { fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: 1.5, color: textoTenue, mb: 1.5 } }>
                        Agenda semanal
                      </Typography>
                      {agendaItem('HOY', '--', true, 'Sin programación disponible', '')}
                    </Box>
                  </Box>

                  <Box sx={ { display: "grid", gap: 2 } }>
                    <Box sx={ sectionCard }>
                      <Typography sx={ { fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: 1.5, color: textoTenue, mb: 1.5 } }>
                        Últimas noticias
                      </Typography>
                      {noticiaItem("Info", "No hay noticias publicadas.")}
                    </Box>
                    <Box sx={ sectionCard }>
                      <Typography sx={ { fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: 1.5, color: textoTenue, mb: 1.5 } }>
                        Menciones recientes
                      </Typography>
                      {mencionItem("Sistema", "No hay menciones disponibles.")}
                    </Box>
                  </Box>
                </Box>
              </Box>
            </Box>
          </Card>
        </Box>
      </Box>
    </Box>
  );
}