import { memo, useRef, useState, useEffect } from "react";
import {
  Alert, Box, Button, Card, CardContent, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, InputAdornment, TextField, Tooltip, Typography, Select, MenuItem,
  alpha,
} from "@mui/material";
import { getCachedAuthHeaders } from "../services/authenticatedFetch";
import ImageCropDialog from "../components/ImageCropDialog";
import type { Perfil } from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME as string;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET as string;

// Fuentes disponibles
const FUENTES_DISPONIBLES = [
  { valor: "system-ui", etiqueta: "Sistema (defecto)" },
  { valor: "Roboto", etiqueta: "Roboto" },
  { valor: "Montserrat", etiqueta: "Montserrat" },
  { valor: "Playfair Display", etiqueta: "Playfair Display" },
  { valor: "Inter", etiqueta: "Inter" },
  { valor: "Poppins", etiqueta: "Poppins" },
  { valor: "Raleway", etiqueta: "Raleway" },
  { valor: "Lato", etiqueta: "Lato" },
  { valor: "Open Sans", etiqueta: "Open Sans" },
  { valor: "Oswald", etiqueta: "Oswald" },
];

type Colores = {
  fondo: string;
  cabecera: string;
  texto: string;
  textoCabecera: string;
  primario: string;
  secundario: string;
  botones: string;
  cardFondo: string;
  iconos: string;
};

// Temas predefinidos: cada uno define la paleta completa
const PRESETS: { nombre: string; colores: Colores }[] = [
  { nombre: "Azul",     colores: { fondo: "#000000", cabecera: "#0A0A0A", texto: "#FFFFFF", textoCabecera: "#FFFFFF", primario: "#3B82F6", secundario: "#F59E0B", botones: "#3B82F6", cardFondo: "#111111", iconos: "#94A3B8" } },
  { nombre: "Verde",    colores: { fondo: "#07120C", cabecera: "#0C1F14", texto: "#FFFFFF", textoCabecera: "#FFFFFF", primario: "#22C55E", secundario: "#D9F99D", botones: "#22C55E", cardFondo: "#0F1F17", iconos: "#86EFAC" } },
  { nombre: "Púrpura",  colores: { fondo: "#0F0A16", cabecera: "#1A0F26", texto: "#FFFFFF", textoCabecera: "#FFFFFF", primario: "#A855F7", secundario: "#FBC7FF", botones: "#A855F7", cardFondo: "#1A1024", iconos: "#D8B4FE" } },
  { nombre: "Blanco y Negro", colores: { fondo: "#000000", cabecera: "#0A0A0A", texto: "#FFFFFF", textoCabecera: "#FFFFFF", primario: "#FFFFFF", secundario: "#A3A3A3", botones: "#FFFFFF", cardFondo: "#1A1A1A", iconos: "#A3A3A3" } },
  { nombre: "Negro y Dorado", colores: { fondo: "#0A0A0A", cabecera: "#000000", texto: "#F5E6C8", textoCabecera: "#F5E6C8", primario: "#D4AF37", secundario: "#FCD34D", botones: "#D4AF37", cardFondo: "#1A1A14", iconos: "#8B7500" } },
  { nombre: "Rojo",     colores: { fondo: "#0A0A0A", cabecera: "#140000", texto: "#FFFFFF", textoCabecera: "#FFFFFF", primario: "#EF4444", secundario: "#FECACA", botones: "#EF4444", cardFondo: "#1A0F0F", iconos: "#FCA5A5" } },
  { nombre: "Claro",    colores: { fondo: "#FFFFFF", cabecera: "#F3F4F6", texto: "#111827", textoCabecera: "#111827", primario: "#3B82F6", secundario: "#60A5FA", botones: "#3B82F6", cardFondo: "#F9FAFB", iconos: "#6B7280" } },
];

const CAMPOS: { key: keyof Colores; label: string }[] = [
  { key: "fondo",      label: "Color de Fondo" },
  { key: "cabecera",   label: "Color de Cabecera" },
  { key: "texto",      label: "Color de Texto (general)" },
  { key: "textoCabecera", label: "Color de Texto (cabecera)" },
  { key: "primario",   label: "Color Primario" },
  { key: "secundario", label: "Color Secundario" },
  { key: "botones",    label: "Color de Botones" },
  { key: "cardFondo",  label: "Color de Fondo de Cards" },
  { key: "iconos",     label: "Color de Iconos" },
];

type SocialMediaKey = "instagramUrl" | "youtubeUrl" | "tiktokUrl" | "facebookUrl" | "twitterUrl" | "linkedinUrl";
type CustomLinkKey = `custom:${string}`;
type BrandingLinkKey = SocialMediaKey | "websiteUrl" | CustomLinkKey;
type OtherContentItem = { id: string; nombre: string; enlace: string };

const SOCIAL_MEDIA_FIELDS: { key: SocialMediaKey; label: string }[] = [
  { key: "instagramUrl", label: "Instagram" },
  { key: "youtubeUrl", label: "YouTube" },
  { key: "tiktokUrl", label: "TikTok" },
  { key: "facebookUrl", label: "Facebook" },
  { key: "twitterUrl", label: "X / Twitter" },
  { key: "linkedinUrl", label: "LinkedIn" },
];

function normalizarOrdenRedes(
  valor?: string | null,
  incluirSitioWeb = false,
  redesIniciales: SocialMediaKey[] = SOCIAL_MEDIA_FIELDS.map(({ key }) => key),
): BrandingLinkKey[] {
  const ordenPorDefecto: BrandingLinkKey[] = [
    ...redesIniciales,
    ...(incluirSitioWeb ? ["websiteUrl" as const] : []),
  ];
  if (!valor) return ordenPorDefecto;

  try {
    const parsed = JSON.parse(valor);
    if (!Array.isArray(parsed)) return ordenPorDefecto;

    const validas = [...new Set(parsed)].filter((key): key is BrandingLinkKey =>
      key === "websiteUrl"
      || (typeof key === "string" && key.startsWith("custom:"))
      || SOCIAL_MEDIA_FIELDS.some((field) => field.key === key)
    );
    return incluirSitioWeb && !validas.includes("websiteUrl")
      ? [...validas, "websiteUrl"]
      : validas;
  } catch {
    return ordenPorDefecto;
  }
}

const EditorColor = memo(function EditorColor({
  value,
  onChange,
  onCopy,
  copied,
  colorInputSx,
}: {
  value: string;
  onChange: (value: string) => void;
  onCopy: () => void;
  copied: boolean;
  colorInputSx: Record<string, unknown>;
}) {
  const [valueLocal, setValueLocal] = useState(value);

  useEffect(() => {
    setValueLocal(value);
  }, [value]);

  const confirmar = () => {
    if (valueLocal !== value) onChange(valueLocal);
  };

  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
      <Box
        component="input"
        type="color"
        value={valueLocal}
        onChange={(event: React.ChangeEvent<HTMLInputElement>) => setValueLocal(event.target.value)}
        onBlur={confirmar}
        sx={colorInputSx}
      />
      <TextField
        value={valueLocal}
        size="small"
        fullWidth
        onChange={(event) => setValueLocal(event.target.value)}
        onBlur={confirmar}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            confirmar();
          }
        }}
        slotProps={{
          htmlInput: { maxLength: 7, style: { fontFamily: "monospace" } },
          input: {
            endAdornment: (
              <InputAdornment position="end">
                <Tooltip title={copied ? "¡Copiado!" : "Copiar"}>
                  <IconButton size="small" onClick={onCopy}>
                    {copied ? "✓" : <span className="material-symbols-outlined">content_copy</span>}
                  </IconButton>
                </Tooltip>
              </InputAdornment>
            ),
          },
        }}
      />
    </Box>
  );
});

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

function normalizeHex(hex: string): string {
  let h = (hex || "").replace(/[^0-9a-fA-F]/g, "").toLowerCase();
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  return h.padStart(6, "0");
}

function mismosColores(a: string, b: string): boolean {
  return normalizeHex(a) === normalizeHex(b);
}

// Devuelve un color de texto 'seguro' sobre un fondo.
// Si `text` coincide exactamente con `bg`, usamos `fallback` (si también coincide con bg, usamos contraste de bg).
function safeTextColor(bg: string, text: string, fallback: string): string {
  if (mismosColores(bg, text)) {
    if (mismosColores(bg, fallback)) return contraste(bg);
    return fallback;
  }
  return contraste(bg);
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

function normalizarBanners(valor?: string | null): string[] {
  if (!valor) return [];

  const valorTrimmed = valor.trim();
  if (!valorTrimmed) return [];

  try {
    const parsed = JSON.parse(valorTrimmed);
    if (Array.isArray(parsed)) {
      return parsed.filter((item): item is string => typeof item === "string" && !!item.trim());
    }
  } catch {
    // Si no es JSON, se asume un valor legacy de un único banner.
  }

  if (valorTrimmed.includes(",")) {
    return valorTrimmed
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [valorTrimmed];
}

function serializarBanners(banners: string[]): string {
  const validos = banners.map((item) => item.trim()).filter(Boolean);
  if (validos.length === 0) return "";
  if (validos.length === 1) return validos[0];
  return JSON.stringify(validos);
}

export default function Branding({ perfil }: { perfil: Perfil }) {
  const t = perfil.tenant;
  const inicial = {
    nombre: t?.nombre ?? "",
    logoUrl: t?.logoUrl ?? "",
    bannerUrl: t?.bannerUrl ?? "",
    instagramUrl: t?.instagramUrl ?? "",
    youtubeUrl: t?.youtubeUrl ?? "",
    tiktokUrl: t?.tiktokUrl ?? "",
    facebookUrl: t?.facebookUrl ?? "",
    twitterUrl: t?.twitterUrl ?? "",
    linkedinUrl: t?.linkedinUrl ?? "",
    fontFamily: t?.fontFamily ?? "system-ui",
    colores: {
      fondo: t?.colorFondo ?? "#000000",
      cabecera: t?.colorCabecera ?? "#000000",
      texto: t?.colorTexto ?? "#FFFFFF",
      textoCabecera: (t as any)?.colorTextoCabecera ?? t?.colorTexto ?? "#FFFFFF",
      primario: t?.colorPrimario ?? "#3B82F6",
      secundario: t?.colorSecundario ?? "#F59E0B",
      botones: (t as any)?.colorBotones ?? t?.colorPrimario ?? "#3B82F6",
      cardFondo: (t as any)?.colorCardFondo ?? "#111111",
      iconos: t?.colorIconos ?? "#94A3B8",
    } as Colores,
  };

    function ensureColores(input?: Partial<Colores>): Colores {
      const base = inicial.colores;
      if (!input) return { ...base };
      return {
        fondo: input.fondo ?? base.fondo,
        cabecera: input.cabecera ?? base.cabecera,
        texto: input.texto ?? base.texto,
        textoCabecera: input.textoCabecera ?? base.textoCabecera,
        primario: input.primario ?? base.primario,
        secundario: input.secundario ?? base.secundario,
        botones: input.botones ?? base.botones,
        cardFondo: input.cardFondo ?? base.cardFondo,
        iconos: input.iconos ?? base.iconos,
      } as Colores;
    }

  const [nombre, setNombre] = useState(inicial.nombre);
  const [logoUrl, setLogoUrl] = useState(inicial.logoUrl);
  const [bannerUrls, setBannerUrls] = useState<string[]>(() => normalizarBanners(inicial.bannerUrl));
  const [bannerActivoIndex, setBannerActivoIndex] = useState(0);
  const [bannerAutoRotate, setBannerAutoRotate] = useState(true);
  const [bannerIntervalSeconds, setBannerIntervalSeconds] = useState(5);
  const [instagramUrl, setInstagramUrl] = useState(inicial.instagramUrl);
  const [youtubeUrl, setYoutubeUrl] = useState(inicial.youtubeUrl);
  const [tiktokUrl, setTiktokUrl] = useState(inicial.tiktokUrl);
  const [facebookUrl, setFacebookUrl] = useState(inicial.facebookUrl);
  const [twitterUrl, setTwitterUrl] = useState(inicial.twitterUrl);
  const [linkedinUrl, setLinkedinUrl] = useState(inicial.linkedinUrl);
  const [fontFamily, setFontFamily] = useState(inicial.fontFamily);  const [colores, setColores] = useState<Colores>(inicial.colores);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");
  const [copiado, setCopiado] = useState<string | null>(null);
  const [ultimoGuardado, setUltimoGuardado] = useState(inicial);
  const [showGuardarTema, setShowGuardarTema] = useState(false);
  const [nombreNuevoTema, setNombreNuevoTema] = useState("");
  const [guardandoTema, setGuardandoTema] = useState(false);
  const [temasPersonalizados, setTemasPersonalizados] = useState<{ nombre: string; colores: Colores }[]>([]);
  const [temaAEliminar, setTemaAEliminar] = useState<{ nombre: string; colores: Colores } | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropDialogSource, setCropDialogSource] = useState<string | null>(null);
  const [cropDialogType, setCropDialogType] = useState<"logo" | "banner">("logo");
  const [cropDialogFileName, setCropDialogFileName] = useState("imagen");
  const [editingBannerIndex, setEditingBannerIndex] = useState<number | null>(null);
  const [originalLogoSource, setOriginalLogoSource] = useState<string | null>(null);
  const [originalBannerSource, setOriginalBannerSource] = useState<string | null>(null);
  const guardandoTemaRef = useRef(false);
  const temasPersonalizadosRef = useRef<{ nombre: string; colores: Colores }[]>([]);
  const persistenciaTemasRef = useRef(Promise.resolve());
  
  // Nuevos estados para Branding
  const [websiteUrl, setWebsiteUrl] = useState(t?.websiteUrl ?? "");
  const [selectedSocialMedias, setSelectedSocialMedias] = useState<BrandingLinkKey[]>(() => {
    const redesConUrl = SOCIAL_MEDIA_FIELDS
      .filter(({ key }) => Boolean(t?.[key]))
      .map(({ key }) => key);
    const contenidoPersonalizado = cargarContenidoPersonalizado(t?.otherContentJson);
    const orden = normalizarOrdenRedes(t?.socialMediasJson, Boolean(t?.websiteUrl), redesConUrl);
    const personalizadosEnOrden = contenidoPersonalizado
      .map((item) => item.id as CustomLinkKey)
      .filter((key) => !orden.includes(key));
    return [...orden, ...personalizadosEnOrden];
  });
  const [socialMediaArrastrada, setSocialMediaArrastrada] = useState<BrandingLinkKey | null>(null);
  const [socialMediaDestino, setSocialMediaDestino] = useState<BrandingLinkKey | null>(null);
  const [socialMediaPosicion, setSocialMediaPosicion] = useState({ x: 0, y: 0 });
  const socialMediaPreviewRef = useRef<HTMLDivElement | null>(null);
  const [otherContentList, setOtherContentList] = useState<OtherContentItem[]>(() => cargarContenidoPersonalizado(t?.otherContentJson));
  const [nuevoContenidoNombre, setNuevoContenidoNombre] = useState("");
  const [nuevoContenidoEnlace, setNuevoContenidoEnlace] = useState("");

  const guardarTemasEnBase = async (temas: { nombre: string; colores: Colores }[]) => {
    const payload = JSON.stringify(temas);
    const guardar = async () => {
      try {
      const token = (await getCachedAuthHeaders()).Authorization.slice("Bearer ".length);
      if (!token) throw new Error("No hay una sesión autenticada.");
      if (!token) return;

      const res = await fetch(`${API_URL}/tenants/mi-tenant`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ temasPersonalizados: payload }),
      });

      if (!res.ok) {
        throw new Error("No se pudo guardar el tema en la base de datos");
      }
      } catch {
        setError("No se pudo guardar el tema en la base de datos");
      }
    };

    const siguienteGuardado = persistenciaTemasRef.current.then(guardar, guardar);
    persistenciaTemasRef.current = siguienteGuardado;
    await siguienteGuardado;
  };

  const logoInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setUltimoGuardado(inicial);

    const cargarTemas = async () => {
      const tenantTemas = (perfil.tenant as any)?.temasPersonalizados;
      const raw = tenantTemas;

      if (!raw) return;

      try {
        const parsed = JSON.parse(raw) as { nombre: string; colores: Partial<Colores> }[];
        const normalized = parsed.map((t) => ({ nombre: t.nombre, colores: ensureColores(t.colores) }));
        temasPersonalizadosRef.current = normalized;
        setTemasPersonalizados(normalized);
      } catch (e) {
        console.error("Error cargando temas personalizados", e);
      }
    };

    cargarTemas();
  }, [perfil]);

  useEffect(() => {
    if (success) {
      const timer = setTimeout(() => setSuccess(false), 3000);
      return () => clearTimeout(timer);
    }
  }, [success]);

  useEffect(() => {
    if (!socialMediaArrastrada) return;

    const actualizarPosicion = (event: DragEvent) => {
      if (socialMediaPreviewRef.current) {
        socialMediaPreviewRef.current.style.left = `${event.clientX + 14}px`;
        socialMediaPreviewRef.current.style.top = `${event.clientY + 14}px`;
      }
    };

    window.addEventListener("dragover", actualizarPosicion);
    return () => window.removeEventListener("dragover", actualizarPosicion);
  }, [socialMediaArrastrada]);

  // onPrimario calculado si se necesita contraste sobre color primario
  const headerTextColor = colores.textoCabecera?.trim() ? colores.textoCabecera : colores.texto;
  // Usamos el color exactamente como lo configura el tenant, sin aplicar lógica de contraste
  const onCabecera = headerTextColor;
  const statusTextColor = headerTextColor;
  const textoTenue = alpha(colores.texto, 0.55);
  const textoSuave = alpha(colores.texto, 0.75);
  const borde = alpha(colores.texto, 0.12);

  const fondo = sinSetear(colores.fondo) ? oscurecer(colores.primario, 0.86) : colores.fondo;

  const streamActivo = perfil.tenant?.streamActivo ?? false;
  const estadoStream = streamActivo ? "EN VIVO" : "OFFLINE";

  // Avatar de marca (función disponible pero no usada en esta versión)

  const platformLabel = (url: string | null | undefined) => {
    if (!url) return null;
    if (url.includes("kick.com")) return "KICK";
    if (url.includes("youtube.com") || url.includes("youtu.be")) return "YOUTUBE";
    if (url.includes("twitch.tv")) return "TWITCH";
    return "STREAM";
  };

  const previewPlatform = platformLabel(perfil.tenant?.streamUrl);
  const bannerPreviewUrl = bannerUrls[bannerActivoIndex] ?? bannerUrls[0] ?? "";

  useEffect(() => {
    if (!bannerAutoRotate || bannerUrls.length <= 1) return;

    const intervalId = window.setInterval(() => {
      setBannerActivoIndex((prev) => (prev + 1) % bannerUrls.length);
    }, Math.max(2, bannerIntervalSeconds) * 1000);

    return () => window.clearInterval(intervalId);
  }, [bannerAutoRotate, bannerIntervalSeconds, bannerUrls.length]);

  // (Funciones auxiliares de preview eliminadas porque no se usan actualmente)

  const setColor = (key: keyof Colores, val: string) => {
    setColores((prev) => ({ ...prev, [key]: val }));
    setSuccess(false);
  };
  const aplicarPreset = (c: Partial<Colores>) => { setColores(ensureColores(c)); setSuccess(false); };

  const handleUpload = async (file: File, tipo: "logo" | "banner", replaceIndex?: number) => {
    tipo === "logo" ? setUploadingLogo(true) : setUploadingBanner(true);
    setError("");
    try {
      const url = await subirACloudinary(file);
      if (tipo === "logo") {
        setLogoUrl(url);
      } else {
        setBannerUrls((prev) => {
          const next = [...prev];
          if (typeof replaceIndex === "number" && replaceIndex >= 0 && replaceIndex < next.length) {
            next[replaceIndex] = url;
            setBannerActivoIndex(replaceIndex);
            return next;
          }
          next.push(url);
          setBannerActivoIndex(next.length - 1);
          return next;
        });
      }
      setSuccess(false);
    } catch {
      setError("No se pudo subir la imagen. Revisá el preset unsigned de Cloudinary.");
    } finally {
      tipo === "logo" ? setUploadingLogo(false) : setUploadingBanner(false);
    }
  };

  const manejarEliminarBanner = (index: number) => {
    setBannerUrls((prev) => {
      if (prev.length <= 1) {
        setBannerActivoIndex(0);
        return [];
      }

      const next = prev.filter((_, i) => i !== index);
      setBannerActivoIndex((current) => {
        if (current >= next.length) return next.length - 1;
        if (current > index) return current - 1;
        return current;
      });
      return next;
    });
    setSuccess(false);
  };

  const abrirEditorDeRecorte = (file: File, tipo: "logo" | "banner") => {
    if (tipo === "banner" && file.type === "image/gif") {
      void handleUpload(file, tipo);
      return;
    }

    const url = URL.createObjectURL(file);
    if (tipo === "logo" && originalLogoSource?.startsWith("blob:")) URL.revokeObjectURL(originalLogoSource);
    if (tipo === "banner" && originalBannerSource?.startsWith("blob:")) URL.revokeObjectURL(originalBannerSource);
    tipo === "logo" ? setOriginalLogoSource(url) : setOriginalBannerSource(url);
    setCropDialogSource(url);
    setCropDialogType(tipo);
    setCropDialogFileName(file.name || `${tipo}.jpg`);
    setCropModalOpen(true);
  };

  const abrirEditorExistente = (tipo: "logo" | "banner") => {
    const url = tipo === "logo" ? logoUrl : (bannerUrls[bannerActivoIndex] ?? bannerUrls[0] ?? "");
    if (!url) return;
    setCropDialogSource(tipo === "logo" ? originalLogoSource || url : originalBannerSource || url);
    setCropDialogType(tipo);
    setCropDialogFileName(`${tipo}.jpg`);
    if (tipo === "banner") setEditingBannerIndex(bannerActivoIndex);
    else setEditingBannerIndex(null);
    setCropModalOpen(true);
  };

  const cancelarRecorte = () => {
    setCropModalOpen(false);
    if (cropDialogSource?.startsWith("blob:") && cropDialogSource !== originalLogoSource && cropDialogSource !== originalBannerSource) URL.revokeObjectURL(cropDialogSource);
    setCropDialogSource(null);
    setEditingBannerIndex(null);
  };

  const handleDrop = (e: React.DragEvent, tipo: "logo" | "banner") => {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) abrirEditorDeRecorte(file, tipo);
  };
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>, tipo: "logo" | "banner") => {
    const file = e.target.files?.[0];
    if (file) abrirEditorDeRecorte(file, tipo);
    e.target.value = "";
  };
  const copiar = (valor: string, key: string) => {
    navigator.clipboard.writeText(valor);
    setCopiado(key);
    setTimeout(() => setCopiado(null), 1500);
  };
  const handleDescartar = () => {
    setNombre(ultimoGuardado.nombre);
    setLogoUrl(ultimoGuardado.logoUrl);
    setBannerUrls(normalizarBanners(ultimoGuardado.bannerUrl));
    setBannerActivoIndex(0);
    setInstagramUrl(ultimoGuardado.instagramUrl);
    setYoutubeUrl(ultimoGuardado.youtubeUrl);
    setTiktokUrl(ultimoGuardado.tiktokUrl);
    setFacebookUrl(ultimoGuardado.facebookUrl);
    setTwitterUrl(ultimoGuardado.twitterUrl);
    setLinkedinUrl(ultimoGuardado.linkedinUrl);
    setFontFamily(ultimoGuardado.fontFamily);
    setColores(ultimoGuardado.colores);
    setWebsiteUrl((ultimoGuardado as any).websiteUrl ?? "");
    setSelectedSocialMedias(normalizarOrdenRedes(
      (ultimoGuardado as any).socialMediasJson,
      Boolean((ultimoGuardado as any).websiteUrl)
    ));
    setOtherContentList(cargarContenidoPersonalizado((ultimoGuardado as any).otherContentJson));
    setSuccess(false);
    setError("");
  };
  const handleGuardarTemaPersonalizado = async () => {
    if (guardandoTemaRef.current) return;
    if (!nombreNuevoTema.trim()) {
      setError("El nombre del tema no puede estar vacío");
      return;
    }

    guardandoTemaRef.current = true;
    setGuardandoTema(true);
    const nuevoTema = { nombre: nombreNuevoTema.trim(), colores: ensureColores(colores) };
    const temasActualizados = [...temasPersonalizadosRef.current, nuevoTema];
    temasPersonalizadosRef.current = temasActualizados;
    setTemasPersonalizados(temasActualizados);
    try {
      await guardarTemasEnBase(temasActualizados);
      setSuccess(true);
      setShowGuardarTema(false);
      setNombreNuevoTema("");
    } finally {
      guardandoTemaRef.current = false;
      setGuardandoTema(false);
    }
  };

  const handleEliminarTemaPersonalizado = async () => {
    const tema = temaAEliminar;
    if (!tema) return;

    setTemaAEliminar(null);
    const temasActualizados = temasPersonalizadosRef.current.filter((temaGuardado) => temaGuardado !== tema);
    temasPersonalizadosRef.current = temasActualizados;
    setTemasPersonalizados(temasActualizados);
    await guardarTemasEnBase(temasActualizados);
    setSuccess(true);
  };

  const handleGuardar = async () => {
    setLoading(true);
    setSuccess(false);
    setError("");
    try {
      const token = (await getCachedAuthHeaders()).Authorization.slice("Bearer ".length);
      if (!token) throw new Error("No hay una sesión autenticada.");
      const bannerParaGuardar = serializarBanners(bannerUrls);

      const res = await fetch(`${API_URL}/tenants/mi-tenant`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          nombre,
          logoUrl,
          bannerUrl: bannerParaGuardar,
          fontFamily,
          instagramUrl,
          youtubeUrl,
          tiktokUrl,
          facebookUrl,
          twitterUrl,
          linkedinUrl,
          colorFondo: colores.fondo,
          colorCabecera: colores.cabecera,
          colorTexto: colores.texto,
          colorTextoCabecera: colores.textoCabecera,
          colorPrimario: colores.primario,
          colorSecundario: colores.secundario,
          colorBotones: colores.botones,
          colorCardFondo: colores.cardFondo,
          colorIconos: colores.iconos,
          websiteUrl,
          socialMediasJson: JSON.stringify(selectedSocialMedias),
          otherContentJson: JSON.stringify(otherContentList),
          temasPersonalizados: JSON.stringify(temasPersonalizadosRef.current),
        }),
      });
      if (!res.ok) {
        let message = `Error ${res.status} al guardar la configuración.`;
        try {
          const data = await res.json();
          if (typeof data?.message === "string" && data.message.trim()) {
            message = data.message;
          }
        } catch {
          // La API puede responder sin un cuerpo JSON.
        }
        throw new Error(message);
      }
      setSuccess(true);
      setUltimoGuardado({
        nombre,
        logoUrl,
        bannerUrl: bannerParaGuardar,
        instagramUrl,
        youtubeUrl,
        tiktokUrl,
        facebookUrl,
        twitterUrl,
        linkedinUrl,
        fontFamily,
        colores,
        websiteUrl,
        socialMediasJson: JSON.stringify(selectedSocialMedias),
        otherContentJson: JSON.stringify(otherContentList),
      } as any);
      try {
        window.dispatchEvent(new CustomEvent("tenantUpdated", {
          detail: {
            nombre,
            logoUrl,
            bannerUrl: bannerParaGuardar,
            fontFamily,
            instagramUrl,
            youtubeUrl,
            tiktokUrl,
            facebookUrl,
            twitterUrl,
            linkedinUrl,
            colorFondo: colores.fondo,
            colorCabecera: colores.cabecera,
            colorTexto: colores.texto,
            colorTextoCabecera: colores.textoCabecera,
            colorPrimario: colores.primario,
            colorSecundario: colores.secundario,
            temasPersonalizados: JSON.stringify(temasPersonalizadosRef.current),
            colorBotones: colores.botones,
            colorCardFondo: colores.cardFondo,
            colorIconos: colores.iconos,
            websiteUrl,
            socialMediasJson: JSON.stringify(selectedSocialMedias),
            otherContentJson: JSON.stringify(otherContentList),
          },
        }));
      } catch {
        // Ignoramos si el evento no se puede despachar
      }
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : "No se pudo guardar. Intentá de nuevo.");
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

  const socialMediaValues: Record<SocialMediaKey, string> = {
    instagramUrl,
    youtubeUrl,
    tiktokUrl,
    facebookUrl,
    twitterUrl,
    linkedinUrl,
  };

  const socialMediaSetters: Record<SocialMediaKey, (value: string) => void> = {
    instagramUrl: setInstagramUrl,
    youtubeUrl: setYoutubeUrl,
    tiktokUrl: setTiktokUrl,
    facebookUrl: setFacebookUrl,
    twitterUrl: setTwitterUrl,
    linkedinUrl: setLinkedinUrl,
  };

  const moverRedSocial = (origen: BrandingLinkKey, destino: BrandingLinkKey) => {
    if (origen === destino) return;

    const origenIndex = selectedSocialMedias.indexOf(origen);
    const destinoIndex = selectedSocialMedias.indexOf(destino);
    if (origenIndex < 0 || destinoIndex < 0) return;

    const nuevoOrden = [...selectedSocialMedias];
    [nuevoOrden[origenIndex], nuevoOrden[destinoIndex]] = [
      nuevoOrden[destinoIndex],
      nuevoOrden[origenIndex],
    ];
    setSelectedSocialMedias(nuevoOrden);
    setSuccess(false);
  };

  const quitarRedSocial = (key: BrandingLinkKey) => {
    setSelectedSocialMedias((actual) => actual.filter((item) => item !== key));
    if (key === "websiteUrl") {
      setWebsiteUrl("");
    } else if (key.startsWith("custom:")) {
      setOtherContentList((actual) => actual.filter((item) => item.id !== key));
    } else {
      socialMediaSetters[key as SocialMediaKey]("");
    }
    setSuccess(false);
  };

  const brandingLinkLabel = (key: BrandingLinkKey) =>
    key === "websiteUrl"
      ? "Página Web"
      : key.startsWith("custom:")
        ? otherContentList.find((item) => item.id === key)?.nombre || "Enlace personalizado"
      : SOCIAL_MEDIA_FIELDS.find((field) => field.key === key)?.label ?? key;

  const actualizarContenidoPersonalizado = (id: string, campo: "nombre" | "enlace", valor: string) => {
    setOtherContentList((actual) => actual.map((item) => (
      item.id === id ? { ...item, [campo]: valor } : item
    )));
    setSuccess(false);
  };

  const agregarContenidoPersonalizado = () => {
    const nombre = nuevoContenidoNombre.trim();
    const enlace = nuevoContenidoEnlace.trim();
    if (!nombre || !enlace) return;

    const id: CustomLinkKey = `custom:${Date.now()}`;
    setOtherContentList((actual) => [...actual, { id, nombre, enlace }]);
    setSelectedSocialMedias((actual) => [...actual, id]);
    setNuevoContenidoNombre("");
    setNuevoContenidoEnlace("");
    setSuccess(false);
  };

  return (
    <Box>
      {socialMediaArrastrada && (
        <Box
          ref={socialMediaPreviewRef}
          sx={{
            position: "fixed",
            left: socialMediaPosicion.x + 14,
            top: socialMediaPosicion.y + 14,
            zIndex: 2000,
            pointerEvents: "none",
            px: 2,
            py: 1,
            bgcolor: colores.cardFondo,
            color: colores.texto,
            border: "2px solid",
            borderColor: "#FFFFFF",
            borderRadius: 1.5,
            boxShadow: `0 6px 16px ${alpha("#000000", 0.45)}`,
            fontSize: 14,
            fontWeight: 700,
            whiteSpace: "nowrap",
            transform: "rotate(-3deg)",
          }}
        >
          {brandingLinkLabel(socialMediaArrastrada)}
        </Box>
      )}
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

          {/* Redes sociales */}
          <Card variant="outlined">
            <CardContent>
              <CardHeader icon="share">Redes Sociales</CardHeader>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 1.5 }}>
                Arrastrá los campos para elegir el orden en que aparecerán en tu aplicación.
              </Typography>
              <Box sx={{ display: "grid", gap: 2 }}>
                {selectedSocialMedias.map((key) => {
                  const socialMedia = SOCIAL_MEDIA_FIELDS.find((field) => field.key === key);
                  const customItem = key.startsWith("custom:")
                    ? otherContentList.find((item) => item.id === key)
                    : null;
                  const value = key === "websiteUrl"
                    ? websiteUrl
                    : customItem
                      ? customItem.enlace
                      : socialMediaValues[key as SocialMediaKey];

                  return (
                  <Box
                    key={key}
                    draggable
                    onDragStart={(event) => {
                      const imagenArrastre = document.createElement("div");
                      imagenArrastre.style.position = "absolute";
                      imagenArrastre.style.top = "-1000px";
                      imagenArrastre.style.width = "1px";
                      imagenArrastre.style.height = "1px";
                      document.body.appendChild(imagenArrastre);
                      event.dataTransfer.setDragImage(imagenArrastre, 0, 0);
                      window.setTimeout(() => imagenArrastre.remove(), 0);
                      setSocialMediaPosicion({ x: event.clientX, y: event.clientY });
                      setSocialMediaArrastrada(key);
                    }}
                    onDragOver={(event) => {
                      event.preventDefault();
                      setSocialMediaDestino(key);
                    }}
                    onDrop={(event) => {
                      event.preventDefault();
                      if (socialMediaArrastrada) {
                        moverRedSocial(socialMediaArrastrada, key);
                      }
                      setSocialMediaArrastrada(null);
                      setSocialMediaDestino(null);
                    }}
                    onDragEnd={() => {
                      setSocialMediaArrastrada(null);
                      setSocialMediaDestino(null);
                    }}
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 1,
                      cursor: "grab",
                      bgcolor: socialMediaDestino === key ? alpha("#FFFFFF", 0.06) : "transparent",
                      color: "inherit",
                      borderRadius: 1,
                      outline: socialMediaArrastrada === key
                        ? "1px solid #FFFFFF"
                        : socialMediaDestino === key
                          ? `1px solid ${alpha("#FFFFFF", 0.45)}`
                          : "1px solid transparent",
                      transition: "background-color 0.2s ease",
                      boxShadow: socialMediaArrastrada === key ? `0 4px 12px ${alpha("#FFFFFF", 0.16)}` : "none",
                      "&:active": { cursor: "grabbing" },
                    }}
                  >
                    <span
                      className="material-symbols-outlined"
                      aria-hidden="true"
                      style={{ color: colores.texto, opacity: 0.5, cursor: "grab" }}
                    >
                      drag_indicator
                    </span>
                    <TextField
                      fullWidth
                      label={customItem ? customItem.nombre : brandingLinkLabel(key)}
                      value={value}
                      placeholder={key === "websiteUrl" || customItem ? "https://ejemplo.com" : `https://${socialMedia?.label.toLowerCase().replace(/\s+\//g, "").replace(/\s+/g, "")}.com/tu-cuenta`}
                      onChange={(event) => {
                        if (key === "websiteUrl") {
                          setWebsiteUrl(event.target.value);
                        } else if (customItem) {
                          actualizarContenidoPersonalizado(customItem.id, "enlace", event.target.value);
                        } else {
                          socialMediaSetters[key as SocialMediaKey](event.target.value);
                        }
                        setSuccess(false);
                      }}
                      size="small"
                    />
                    <IconButton
                      size="small"
                      color="error"
                      aria-label={`Eliminar ${brandingLinkLabel(key)}`}
                      onClick={() => quitarRedSocial(key)}
                    >
                      <span className="material-symbols-outlined">delete</span>
                    </IconButton>
                  </Box>
                  );
                })}
              </Box>
            </CardContent>
          </Card>

          {/* Página Web */}
          <Card variant="outlined">
            <CardContent>
              <CardHeader icon="public">Página Web</CardHeader>
              <TextField
                fullWidth
                label="URL del Sitio Web"
                value={websiteUrl}
                placeholder="https://ejemplo.com"
                onChange={(e) => {
                  setWebsiteUrl(e.target.value);
                  setSuccess(false);
                }}
                size="small"
              />
              <Button
                variant="outlined"
                fullWidth
                sx={{ mt: 1.5 }}
                disabled={!websiteUrl.trim() || selectedSocialMedias.includes("websiteUrl")}
                onClick={() => {
                  setSelectedSocialMedias((actual) => [...actual, "websiteUrl"]);
                  setSuccess(false);
                }}
                startIcon={<span className="material-symbols-outlined">add</span>}
              >
                Agregar
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 1 }}>
                Enlace a tu sitio web oficial
              </Typography>
            </CardContent>
          </Card>

          {/* Contenido Personalizado */}
          <Card variant="outlined">
            <CardContent>
              <CardHeader icon="add_box">Contenido Personalizado</CardHeader>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
                Agrega múltiples enlaces o información adicional (ej: WhatsApp, Tienda online, etc.)
              </Typography>

              <Box sx={{ display: "grid", gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" }, gap: 1, mb: 2 }}>
                <TextField
                  size="small"
                  label="Nombre"
                  placeholder="WhatsApp, Tienda online, etc."
                  value={nuevoContenidoNombre}
                  onChange={(event) => setNuevoContenidoNombre(event.target.value)}
                />
                <TextField
                  size="small"
                  label="Enlace"
                  placeholder="https://ejemplo.com"
                  value={nuevoContenidoEnlace}
                  onChange={(event) => setNuevoContenidoEnlace(event.target.value)}
                />
              </Box>
              <Button
                variant="outlined"
                size="small"
                fullWidth
                disabled={!nuevoContenidoNombre.trim() || !nuevoContenidoEnlace.trim()}
                onClick={agregarContenidoPersonalizado}
                startIcon={<span className="material-symbols-outlined">add</span>}
              >
                Agregar
              </Button>
            </CardContent>
          </Card>

          {/* Logo */}
          <Card variant="outlined">
            <CardContent>
              <CardHeader icon="image">Logo de la Marca · Tamaño recomendado: 512x512px o más</CardHeader>
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
                <Box sx={ { display: "flex", justifyContent: "flex-end", gap: 1, mt: 1 } }>
                  <Button size="small" variant="outlined" onClick={() => abrirEditorExistente("logo")}>Editar</Button>
                  <Button size="small" color="error" onClick={() => { setLogoUrl(""); setSuccess(false); }}>Quitar logo</Button>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* Fuente */}
          <Card variant="outlined">
            <CardContent>
              <CardHeader icon="font_download">Tipografía</CardHeader>
              <Select
                fullWidth
                value={fontFamily}
                onChange={(e) => { setFontFamily(e.target.value); setSuccess(false); }}
                sx={ { fontFamily: fontFamily } }
              >
                {FUENTES_DISPONIBLES.map((f) => (
                  <MenuItem key={f.valor} value={f.valor} sx={ { fontFamily: f.valor } }>
                    {f.etiqueta}
                  </MenuItem>
                ))}
              </Select>
              <Typography variant="caption" color="text.secondary" sx={ { display: "block", mt: 1 } }>
                Esta fuente se aplicará a toda la interfaz del usuario.
              </Typography>
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
                        {[p.colores.primario, p.colores.botones, p.colores.cardFondo, p.colores.iconos].map((c, i) => (
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

          {/* Temas personalizados */}
          {temasPersonalizados.length > 0 && (
            <Card variant="outlined">
              <CardContent>
                <CardHeader icon="favorite">Temas Personalizados</CardHeader>
                <Box sx={ { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(120px, 1fr))", gap: 1.5 } }>
                  {temasPersonalizados.map((p, idx) => {
                    const activo = presetActivo(p.colores);
                    return (
                      <Box key={`custom-theme-${idx}`} onClick={() => aplicarPreset(p.colores)}
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
                          {[p.colores.primario, p.colores.botones, p.colores.cardFondo, p.colores.iconos].map((c, i) => (
                            <Box key={i} sx={ { flex: 1, borderRadius: 0.5, bgcolor: c, border: "1px solid", borderColor: borde } } />
                          ))}
                        </Box>
                        <Box sx={ { display: "flex", alignItems: "center", gap: 0.5 } }>
                          <Typography sx={ { minWidth: 0, flexGrow: 1, fontSize: 11, fontWeight: 600, textAlign: "center", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }>{p.nombre}</Typography>
                          <Tooltip title="Eliminar tema">
                            <IconButton
                              size="small"
                              aria-label={`Eliminar tema ${p.nombre}`}
                              onClick={(event) => {
                                event.stopPropagation();
                                setTemaAEliminar(p);
                              }}
                              sx={ { p: 0.25, color: "error.main" } }
                            >
                              <span className="material-symbols-outlined" style={ { fontSize: 16 } }>delete</span>
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>
                    );
                  })}
                </Box>
              </CardContent>
            </Card>
          )}

          {/* Personalizar colores */}
          <Card variant="outlined">
            <CardContent>
              <CardHeader icon="palette">Personalizar Colores</CardHeader>
              {CAMPOS.map(({ key, label }) => (
                <Box key={key} sx={ { mb: 2, "&:last-child": { mb: 0 } } }>
                  <Typography variant="body2" color="text.secondary" gutterBottom>{label}</Typography>
                  <EditorColor
                    value={colores[key]}
                    onChange={(value) => setColor(key, value)}
                    onCopy={() => copiar(colores[key], key)}
                    copied={copiado === key}
                    colorInputSx={colorInputSx}
                  />
                </Box>
              ))}
              <Box sx={ { display: "flex", justifyContent: "flex-end", pt: 1, mt: 1, borderTop: "1px solid", borderColor: "divider" } }>
                <Button
                  variant="outlined"
                  onClick={() => setShowGuardarTema(true)}
                  disabled={loading || uploadingLogo || uploadingBanner}
                  startIcon={<span className="material-symbols-outlined">favorite</span>}
                >
                  Guardar como Tema
                </Button>
              </Box>
            </CardContent>
          </Card>

          {/* Banner */}
          <Card variant="outlined">
            <CardContent>
              <CardHeader icon="photo_size_select_large">Banners de Cabecera · Tamaño recomendado: 1920x320px</CardHeader>
              <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 2 }}>
                Se aceptan varios banners. Pueden rotar automáticamente o mantenerse fijos. Los GIF/animaciones también pueden cargarse si el formato lo permite.
              </Typography>
              <input ref={bannerInputRef} type="file" accept="image/*" hidden
                onChange={(e) => handleFileChange(e, "banner")} />

              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, mb: 2, flexWrap: "wrap" }}>
                <Button variant="outlined" size="small" onClick={() => bannerInputRef.current?.click()}>
                  + Agregar banner
                </Button>
                {bannerUrls.length > 1 && (
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Button
                      size="small"
                      variant={bannerAutoRotate ? "contained" : "outlined"}
                      onClick={() => setBannerAutoRotate((prev) => !prev)}
                    >
                      Rotación {bannerAutoRotate ? "ON" : "OFF"}
                    </Button>
                    <TextField
                      size="small"
                      type="number"
                      label="Segundos"
                      value={bannerIntervalSeconds}
                      onChange={(e) => setBannerIntervalSeconds(Math.max(2, Number(e.target.value) || 2))}
                      sx={{ width: 110 }}
                    />
                  </Box>
                )}
              </Box>

              {bannerUrls.length === 0 ? (
                <Box
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, "banner")}
                  onClick={() => !uploadingBanner && bannerInputRef.current?.click()}
                  sx={ {
                    border: "2px dashed", borderColor: borde,
                    borderRadius: 2, cursor: "pointer", minHeight: 96, overflow: "hidden",
                    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
                    gap: 1, bgcolor: alpha(colores.texto, 0.03), transition: "all 0.2s",
                    "&:hover": { bgcolor: alpha(colores.texto, 0.05), borderColor: "primary.main" },
                  } }
                >
                  <Box sx={ { py: 2, textAlign: "center" } }>
                    <Typography variant="caption" color="text.secondary" sx={ { display: "block", mb: 1 } }>
                      Ideal para banner de cabecera: formato panorámico y resolución alta.
                    </Typography>
                    <Button variant="outlined" size="small" onClick={(e) => { e.stopPropagation(); bannerInputRef.current?.click(); } } startIcon={<span className="material-symbols-outlined">file_upload</span>}>
                      Seleccionar Imagen
                    </Button>
                  </Box>
                </Box>
              ) : (
                <Box sx={{ display: "grid", gap: 1.5 }}>
                  {bannerUrls.map((bannerUrl, index) => (
                    <Box key={`${bannerUrl}-${index}`} sx={{ position: "relative", borderRadius: 2, overflow: "hidden", border: index === bannerActivoIndex ? "2px solid" : "1px solid", borderColor: index === bannerActivoIndex ? "primary.main" : borde }}>
                      <Box component="img" src={bannerUrl} sx={{ width: "100%", height: 96, objectFit: "cover", display: "block" }} />
                      <Box sx={{ position: "absolute", top: 8, right: 8, display: "flex", gap: 0.5 }}>
                        <Button
                          size="small"
                          variant={index === bannerActivoIndex ? "contained" : "outlined"}
                          sx={{ minWidth: 0, px: 1, fontSize: 10 }}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setBannerActivoIndex(index);
                            setEditingBannerIndex(index);
                            setCropDialogSource(bannerUrl);
                            setCropDialogType("banner");
                            setCropDialogFileName(`banner-${index + 1}.jpg`);
                            setCropModalOpen(true);
                          }}
                        >
                          Editar
                        </Button>
                        <Button size="small" variant="outlined" color="error" sx={{ minWidth: 0, px: 1, fontSize: 10 }} onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          manejarEliminarBanner(index);
                        }}>
                          Quitar
                        </Button>
                      </Box>
                    </Box>
                  ))}
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
          <Card variant="outlined" sx={ { overflow: "hidden", border: "none", boxShadow: "none", bgcolor: "transparent" } }>
            <Box
              sx={ {
                bgcolor: fondo,
                color: colores.texto,
                borderRadius: 3,
                minWidth: 320,
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                fontFamily: (fontFamily === 'system-ui' ? "system-ui, 'Segoe UI', Roboto, sans-serif" : `${fontFamily}, system-ui, 'Segoe UI', Roboto, sans-serif`),
                '& *': {
                  fontFamily: (fontFamily === 'system-ui' ? "system-ui, 'Segoe UI', Roboto, sans-serif" : `${fontFamily}, system-ui, 'Segoe UI', Roboto, sans-serif`),
                },
                '& .material-symbols-outlined': {
                  fontFamily: 'Material Symbols Outlined',
                  fontFeatureSettings: "'liga' 1",
                },
              } }
            >
              {/* Header con cabecera */}
              <Box sx={ { bgcolor: colores.cabecera, p: 1.5, display: "flex", alignItems: "center", justifyContent: "space-between" } }>
                <Box sx={ { display: "flex", alignItems: "center", gap: 1 } }>
                  <Box sx={ { width: 32, height: 32, borderRadius: "50%", overflow: "hidden", bgcolor: alpha(onCabecera, 0.2), display: "flex", alignItems: "center", justifyContent: "center" } }>
                    {logoUrl ? (
                      <Box component="img" src={logoUrl} sx={ { width: "100%", height: "100%", objectFit: "cover" } } />
                    ) : (
                      <span className="material-symbols-outlined" style={ { fontSize: 16, color: onCabecera } }>play_circle</span>
                    )}
                  </Box>
                  <Typography sx={ { fontSize: 13, fontWeight: 800, letterSpacing: 1.5, color: onCabecera } }>{nombre || "OEDE"}</Typography>
                </Box>
                <span className="material-symbols-outlined" style={ { fontSize: 20, color: onCabecera } }>person</span>
              </Box>
              {/* Contenido principal */}
              <Box sx={ { p: 2 } }>

              <Box sx={ { borderRadius: 3, overflow: "hidden", position: "relative", minHeight: 220, bgcolor: colores.primario, backgroundSize: "cover", backgroundPosition: "center" } }>
                <Box sx={ { position: "absolute", inset: 0, bgcolor: "rgba(0,0,0,0.28)" } } />
                <Box sx={ { position: "absolute", top: 12, left: 12, display: "inline-flex", alignItems: "center", gap: 0.75, bgcolor: colores.cabecera, px: 1.5, py: 0.75, borderRadius: 2 } }>
                  <Box sx={ { width: 8, height: 8, borderRadius: "50%", bgcolor: streamActivo ? "#10B981" : alpha(colores.textoCabecera ?? colores.texto, 0.72) } } />
                  <Typography sx={ { color: statusTextColor, fontSize: 10, fontWeight: 800, letterSpacing: 1 } }>{estadoStream}</Typography>
                </Box>
                {previewPlatform && (
                  <Box sx={ { position: "absolute", top: 12, right: 12, bgcolor: alpha(colores.texto, 0.16), color: colores.texto, px: 1.5, py: 0.75, borderRadius: 2, fontSize: 10, fontWeight: 700 } }>
                    {previewPlatform}
                  </Box>
                )}
                <Box sx={ { position: "absolute", bottom: 16, left: 16, right: 16, display: "flex", alignItems: "center", justifyContent: "space-between" } }>
                  <Box>
                    <Typography sx={ { color: colores.texto, fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1.5 } }>Stream</Typography>
                    <Typography sx={ { color: colores.texto, fontSize: 18, fontWeight: 900, mt: 0.5 } }>{nombre || "Tu canal"} está offline</Typography>
                  </Box>
                  <Box sx={ { width: 40, height: 40, borderRadius: "50%", bgcolor: alpha(colores.texto, 0.2), display: "flex", alignItems: "center", justifyContent: "center" } }>
                    <span className="material-symbols-outlined" style={ { color: colores.texto, fontSize: 20 } }>play_arrow</span>
                  </Box>
                </Box>
              </Box>

              <Box sx={ { mt: 2, display: "grid", gap: 2 } }>
                <Box sx={ { borderRadius: 3, bgcolor: colores.cardFondo, p: 2 } }>
                  <Typography sx={ { fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: 1.5, color: textoTenue, mb: 1.5 } }>Publicidad</Typography>
                  {bannerPreviewUrl ? (
                    <Box component="img" src={bannerPreviewUrl} sx={ { width: "100%", height: 96, borderRadius: 2, objectFit: "cover" } } />
                  ) : (
                    <Box sx={ { width: "100%", height: 96, borderRadius: 2, bgcolor: alpha(colores.texto, 0.04), display: "flex", alignItems: "center", justifyContent: "center" } }>
                      <Typography sx={ { color: textoSuave } }>Publicidad</Typography>
                    </Box>
                  )}
                </Box>

                <Box sx={ { borderRadius: 3, bgcolor: colores.cardFondo, p: 2 } }>
                  <Typography sx={ { fontSize: 10, fontWeight: 900, textTransform: "uppercase", letterSpacing: 1.5, color: textoTenue, mb: 1.5 } }>Streams pasados</Typography>
                  <Typography sx={ { color: textoSuave, fontSize: 13, mb: 2 } }>No hay streams anteriores disponibles.</Typography>
                  <button style={ { width: "100%", backgroundColor: colores.botones, color: safeTextColor(colores.botones, colores.texto, colores.secundario), border: "none", borderRadius: "8px", padding: "12px 16px", fontWeight: 600, fontSize: 16, cursor: "pointer", transition: "all 0.2s" } } onMouseEnter={(e) => e.currentTarget.style.opacity = "0.8"} onMouseLeave={(e) => e.currentTarget.style.opacity = "1"}>Ver más</button>
                </Box>
              </Box>
              </Box>

              {/* Footer con navegación */}
              <Box sx={ { bgcolor: colores.cabecera, display: "flex", justifyContent: "space-around" } }>
                {[{ icon: 'home', active: true }, { icon: 'grid_view', active: false }, { icon: 'person', active: false }].map((item) => (
                  <Box key={item.icon} sx={ { flex: 1, display: "flex", alignItems: "center", justifyContent: "center", py: 1.5 } }>
                    <span className="material-symbols-outlined" style={ { color: item.active ? colores.primario : colores.iconos, fontSize: 22 } }>{item.icon}</span>
                  </Box>
                ))}
              </Box>
            </Box>

          </Card>
        </Box>
      </Box>

      <ImageCropDialog
        open={cropModalOpen}
        imageUrl={cropDialogSource}
        type={cropDialogType}
        fileName={cropDialogFileName}
        onClose={cancelarRecorte}
        onConfirm={(file) => {
          setCropDialogSource(null);
          setCropModalOpen(false);
          const replaceIndex = cropDialogType === "banner" ? editingBannerIndex ?? undefined : undefined;
          void handleUpload(file, cropDialogType, replaceIndex);
          setEditingBannerIndex(null);
        }}
      />

      {/* Modal para guardar como tema personalizado */}
      <Dialog open={showGuardarTema} onClose={() => setShowGuardarTema(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Guardar como nuevo tema</DialogTitle>
        <DialogContent sx={ { pt: 2 } }>
          <TextField
            fullWidth
            label="Nombre del tema"
            value={nombreNuevoTema}
            onChange={(e) => setNombreNuevoTema(e.target.value)}
            placeholder="Ej: Mi tema azul"
            onKeyPress={(e) => e.key === "Enter" && handleGuardarTemaPersonalizado()}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowGuardarTema(false)} disabled={guardandoTema}>Cancelar</Button>
          <Button
            variant="contained"
            onClick={handleGuardarTemaPersonalizado}
            disabled={guardandoTema}
            startIcon={guardandoTema ? <CircularProgress size={16} color="inherit" /> : undefined}
          >
            {guardandoTema ? "Guardando..." : "Guardar tema"}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={Boolean(temaAEliminar)} onClose={() => setTemaAEliminar(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Eliminar tema personalizado</DialogTitle>
        <DialogContent>
          <Typography>
            ¿Querés eliminar el tema <strong>{temaAEliminar?.nombre}</strong>?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTemaAEliminar(null)}>Cancelar</Button>
          <Button color="error" variant="contained" onClick={() => void handleEliminarTemaPersonalizado()}>
            Eliminar
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

function cargarContenidoPersonalizado(valor?: string | null): OtherContentItem[] {
  try {
    const parsed = JSON.parse(valor ?? "[]");
    if (!Array.isArray(parsed)) return [];
    return parsed.map((item, index) => ({
      id: typeof item?.id === "string" ? item.id : `custom:${index}`,
      nombre: typeof item?.nombre === "string" ? item.nombre : "",
      enlace: typeof item?.enlace === "string" ? item.enlace : "",
    }));
  } catch {
    return [];
  }
}