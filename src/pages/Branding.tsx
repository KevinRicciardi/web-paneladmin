import { memo, useRef, useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFacebookF,
  faInstagram,
  faLinkedinIn,
  faTiktok,
  faXTwitter,
  faYoutube,
} from "@fortawesome/free-brands-svg-icons";
import {
  Alert, Box, Button, Card, CardContent, CircularProgress, Dialog, DialogActions, DialogContent,
  DialogTitle, IconButton, InputAdornment, TextField, Tooltip, Typography, Select, MenuItem,
  alpha,
} from "@mui/material";
import { getCachedAuthHeaders } from "../services/authenticatedFetch";
import ImageCropDialog, { type CropSettings } from "../components/ImageCropDialog";
import { subirACloudinary } from "../utils/cloudinary";
import type { News, Perfil, Programa } from "../types";
import { listarProgramacionPorSlug } from "../services/schedule.service";
import { listarNoticiasPublicadasPorSlug } from "../services/news.service";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

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
  borde: string;
};

type TemaBranding = {
  nombre: string;
  colores: Colores;
  fontFamily?: string;
};

// Cada preset combina una paleta con la tipografía que mejor la acompaña.
const PRESETS: TemaBranding[] = [
  { nombre: "Azul", fontFamily: "Inter", colores: { fondo: "#000000", cabecera: "#0A0A0A", texto: "#FFFFFF", textoCabecera: "#FFFFFF", primario: "#3B82F6", secundario: "#F59E0B", botones: "#3B82F6", cardFondo: "#111111", iconos: "#94A3B8", borde: "#FFFFFF" } },
  { nombre: "Verde", fontFamily: "Montserrat", colores: { fondo: "#07120C", cabecera: "#0C1F14", texto: "#FFFFFF", textoCabecera: "#FFFFFF", primario: "#22C55E", secundario: "#D9F99D", botones: "#22C55E", cardFondo: "#0F1F17", iconos: "#86EFAC", borde: "#FFFFFF" } },
  { nombre: "Púrpura", fontFamily: "Poppins", colores: { fondo: "#0F0A16", cabecera: "#1A0F26", texto: "#FFFFFF", textoCabecera: "#FFFFFF", primario: "#A855F7", secundario: "#FBC7FF", botones: "#A855F7", cardFondo: "#1A1024", iconos: "#D8B4FE", borde: "#FFFFFF" } },
  { nombre: "Blanco y Negro", fontFamily: "Roboto", colores: { fondo: "#000000", cabecera: "#0A0A0A", texto: "#FFFFFF", textoCabecera: "#FFFFFF", primario: "#FFFFFF", secundario: "#A3A3A3", botones: "#FFFFFF", cardFondo: "#1A1A1A", iconos: "#A3A3A3", borde: "#FFFFFF" } },
  { nombre: "Negro y Dorado", fontFamily: "Playfair Display", colores: { fondo: "#0A0A0A", cabecera: "#000000", texto: "#F5E6C8", textoCabecera: "#F5E6C8", primario: "#D4AF37", secundario: "#FCD34D", botones: "#D4AF37", cardFondo: "#1A1A14", iconos: "#8B7500", borde: "#FFFFFF" } },
  { nombre: "Rojo", fontFamily: "Oswald", colores: { fondo: "#0A0A0A", cabecera: "#140000", texto: "#FFFFFF", textoCabecera: "#FFFFFF", primario: "#EF4444", secundario: "#FECACA", botones: "#EF4444", cardFondo: "#1A0F0F", iconos: "#FCA5A5", borde: "#FFFFFF" } },
  { nombre: "Claro", fontFamily: "Lato", colores: { fondo: "#FFFFFF", cabecera: "#F3F4F6", texto: "#111827", textoCabecera: "#111827", primario: "#3B82F6", secundario: "#60A5FA", botones: "#3B82F6", cardFondo: "#F9FAFB", iconos: "#6B7280", borde: "#000000" } },
];

const CAMPOS: { key: keyof Colores; label: string; description?: string }[] = [
  { key: "fondo",      label: "Color de Fondo" },
  { key: "cabecera",   label: "Color de Cabecera" },
  { key: "texto",      label: "Color de Texto (general)" },
  { key: "textoCabecera", label: "Color de Texto (cabecera)" },
  { key: "primario",   label: "Color de énfasis", description: "Se usa para destacar la navegación, las selecciones y los estados de carga." },
  { key: "secundario", label: "Color de EN VIVO", description: "Se usa en el indicador EN VIVO de Inicio y Programación." },
  { key: "botones",    label: "Color de Botones" },
  { key: "cardFondo",  label: "Color de Fondo de Cards" },
  { key: "iconos",     label: "Color de Iconos" },
  { key: "borde",      label: "Color de Bordes" },
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

const PREVIEW_SOCIAL_ICONS = {
  instagramUrl: faInstagram,
  youtubeUrl: faYoutube,
  tiktokUrl: faTiktok,
  facebookUrl: faFacebookF,
  twitterUrl: faXTwitter,
  linkedinUrl: faLinkedinIn,
};

const PREVIEW_SOCIAL_COLORS: Record<SocialMediaKey, string> = {
  instagramUrl: "#E4405F",
  youtubeUrl: "#FF0000",
  tiktokUrl: "#FFFFFF",
  facebookUrl: "#1877F2",
  twitterUrl: "#FFFFFF",
  linkedinUrl: "#0A66C2",
};

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
    const redesPrincipales = SOCIAL_MEDIA_FIELDS.map(({ key }) => key);
    const ordenCompleto = [
      ...validas,
      ...redesPrincipales.filter((key) => !validas.includes(key)),
    ];
    return incluirSitioWeb && !ordenCompleto.includes("websiteUrl")
      ? [...ordenCompleto, "websiteUrl"]
      : ordenCompleto;
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

function sinSetear(hex?: string): boolean {
  const h = (hex || "").replace("#", "").trim().toUpperCase();
  return !h || h === "000000" || h === "FF000000";
}

function contraste(hex: string): string {
  let h = (hex || "").replace("#", "");
  if (h.length === 3) h = h.split("").map((c) => c + c).join("");
  if (h.length !== 6) return "#FFFFFF";
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6 ? "#000000" : "#FFFFFF";
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
      borde: t?.colorBorde ?? contraste(t?.colorCardFondo ?? "#111111"),
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
        borde: input.borde ?? base.borde,
      } as Colores;
    }

  const [nombre, setNombre] = useState(inicial.nombre);
  const [logoUrl, setLogoUrl] = useState(inicial.logoUrl);
  const [bannerUrls, setBannerUrls] = useState<string[]>(() => normalizarBanners(inicial.bannerUrl));
  const [bannerActivoIndex, setBannerActivoIndex] = useState(0);
  const [previewBannerIndex, setPreviewBannerIndex] = useState(0);
  const bannerSwipeStartXRef = useRef<number | null>(null);
  const [previewScreen, setPreviewScreen] = useState<"home" | "news" | "schedule">("home");
  const [previewScheduleDay, setPreviewScheduleDay] = useState("HOY");
  const [previewExpanded, setPreviewExpanded] = useState(false);
  const [previewPrograms, setPreviewPrograms] = useState<Programa[]>([]);
  const [previewNews, setPreviewNews] = useState<Pick<News, "id" | "title" | "excerpt" | "coverImageUrl" | "publishedAt" | "createdAt" | "updatedAt">[]>([]);
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
  const [temasPersonalizados, setTemasPersonalizados] = useState<TemaBranding[]>([]);
  const [temaAEliminar, setTemaAEliminar] = useState<TemaBranding | null>(null);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [cropDialogSource, setCropDialogSource] = useState<string | null>(null);
  const [cropDialogInitialSettings, setCropDialogInitialSettings] = useState<CropSettings | null>(null);
  const [cropDialogType, setCropDialogType] = useState<"logo" | "banner">("logo");
  const [cropDialogFileName, setCropDialogFileName] = useState("imagen");
  const [editingBannerIndex, setEditingBannerIndex] = useState<number | null>(null);
  const [originalLogoSource, setOriginalLogoSource] = useState<string | null>(null);
  const [originalBannerSources, setOriginalBannerSources] = useState<Record<string, string>>({});
  const [bannerCropSettings, setBannerCropSettings] = useState<Record<string, CropSettings>>({});
  const cropConfirmedRef = useRef(false);
  const guardandoTemaRef = useRef(false);
  const temasPersonalizadosRef = useRef<TemaBranding[]>([]);
  const persistenciaTemasRef = useRef(Promise.resolve());
  
  // Nuevos estados para Branding
  const [websiteUrl, setWebsiteUrl] = useState(t?.websiteUrl ?? "");
  const [selectedSocialMedias, setSelectedSocialMedias] = useState<BrandingLinkKey[]>(() => {
    const contenidoPersonalizado = cargarContenidoPersonalizado(t?.otherContentJson);
    const orden = normalizarOrdenRedes(t?.socialMediasJson, Boolean(t?.websiteUrl));
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

  const guardarTemasEnBase = async (temas: TemaBranding[]) => {
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
        const parsed = JSON.parse(raw) as { nombre: string; colores: Partial<Colores>; fontFamily?: string }[];
        const normalized = parsed.map((t) => ({
          nombre: t.nombre,
          colores: ensureColores(t.colores),
          fontFamily: t.fontFamily,
        }));
        temasPersonalizadosRef.current = normalized;
        setTemasPersonalizados(normalized);
      } catch (e) {
        console.error("Error cargando temas personalizados", e);
      }
    };

    cargarTemas();
  }, [perfil]);

  useEffect(() => {
    const slug = perfil.tenant.slug;
    if (!slug) {
      setPreviewPrograms([]);
      return;
    }

    let active = true;
    listarProgramacionPorSlug(slug)
      .then((programas) => {
        if (active) setPreviewPrograms(programas);
      })
      .catch(() => {
        if (active) setPreviewPrograms([]);
      });

    return () => {
      active = false;
    };
  }, [perfil.tenant.slug]);

  useEffect(() => {
    const slug = perfil.tenant.slug;
    if (!slug) {
      setPreviewNews([]);
      return;
    }

    let active = true;
    listarNoticiasPublicadasPorSlug(slug)
      .then((noticias) => {
        if (active) setPreviewNews(noticias);
      })
      .catch(() => {
        if (active) setPreviewNews([]);
      });

    return () => {
      active = false;
    };
  }, [perfil.tenant.slug]);

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
  const onCabecera = headerTextColor;
  const textoTenue = alpha(colores.texto, 0.55);

  const fondo = sinSetear(colores.fondo) ? oscurecer(colores.primario, 0.86) : colores.fondo;
  const borde = alpha(colores.borde, 0.12);
  const cabeceraPreview = sinSetear(colores.cabecera)
    ? oscurecer(colores.primario, 0.92)
    : colores.cabecera;
  const fechaProgramacionPreview = new Date();
  fechaProgramacionPreview.setDate(
    fechaProgramacionPreview.getDate() +
      (previewScheduleDay === "AYER" ? -1 : previewScheduleDay === "MAÑANA" ? 1 : 0),
  );
  const fechaProgramacionPreviewInput = [
    fechaProgramacionPreview.getFullYear(),
    `${fechaProgramacionPreview.getMonth() + 1}`.padStart(2, "0"),
    `${fechaProgramacionPreview.getDate()}`.padStart(2, "0"),
  ].join("-");
  const codigoDiaPreview = (["DOM", "LUN", "MAR", "MIE", "JUE", "VIE", "SAB"] as const)[
    fechaProgramacionPreview.getDay()
  ];
  const programasPreview = previewPrograms.filter((programa) => {
    if (!programa.activo) return false;

    const fechaInicio = programa.fechaInicio?.slice(0, 10);
    if (fechaInicio) {
      const fechaFin = programa.fechaFin?.slice(0, 10) || fechaInicio;
      return fechaProgramacionPreviewInput >= fechaInicio && fechaProgramacionPreviewInput <= fechaFin;
    }

    const diasPersonalizados = programa.diasPersonalizados ?? [];
    if (diasPersonalizados.length > 0) {
      return diasPersonalizados.includes(codigoDiaPreview);
    }

    switch (programa.dias) {
      case "TODOS":
        return true;
      case "LUN_VIE":
        return ["LUN", "MAR", "MIE", "JUE", "VIE"].includes(codigoDiaPreview);
      case "SABADOS":
        return codigoDiaPreview === "SAB";
      case "DOMINGOS":
        return codigoDiaPreview === "DOM";
      default:
        return false;
    }
  });
  useEffect(() => {
    if (bannerUrls.length <= 1) {
      setPreviewBannerIndex(0);
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setPreviewBannerIndex((current) => (current + 1) % bannerUrls.length);
    }, 7_000);

    return () => window.clearTimeout(timeoutId);
  }, [bannerUrls, previewBannerIndex]);

  useEffect(() => {
    if (!previewExpanded) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousDocumentOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousDocumentOverflow;
    };
  }, [previewExpanded]);

  const handlePreviewBannerPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    bannerSwipeStartXRef.current = event.clientX;
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const handlePreviewBannerPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const startX = bannerSwipeStartXRef.current;
    bannerSwipeStartXRef.current = null;
    if (startX === null || bannerUrls.length <= 1) return;

    const deltaX = event.clientX - startX;
    if (Math.abs(deltaX) < 40) return;

    setPreviewBannerIndex((current) => (
      current + (deltaX < 0 ? 1 : -1) + bannerUrls.length
    ) % bannerUrls.length);
  };

  // (Funciones auxiliares de preview eliminadas porque no se usan actualmente)

  const setColor = (key: keyof Colores, val: string) => {
    setColores((prev) => ({ ...prev, [key]: val }));
    setSuccess(false);
  };
  const aplicarPreset = (tema: Pick<TemaBranding, "colores" | "fontFamily">) => {
    setColores(ensureColores(tema.colores));
    if (tema.fontFamily) setFontFamily(tema.fontFamily);
    setSuccess(false);
  };

  const handleUpload = async (
    file: File,
    tipo: "logo" | "banner",
    replaceIndex?: number,
    originalSource?: string,
    cropSettings?: CropSettings,
  ) => {
    tipo === "logo" ? setUploadingLogo(true) : setUploadingBanner(true);
    setError("");
    try {
      const url = await subirACloudinary(file);
      if (tipo === "logo") {
        setLogoUrl(url);
      } else {
        const sourceToKeep = originalSource ?? (replaceIndex === undefined ? url : undefined);
        if (sourceToKeep) {
          setOriginalBannerSources((prev) => ({ ...prev, [url]: sourceToKeep }));
        }
        if (cropSettings) {
          setBannerCropSettings((prev) => ({ ...prev, [url]: cropSettings }));
        }
        setBannerUrls((prev) => {
          const next = [...prev];
          if (typeof replaceIndex === "number" && replaceIndex >= 0 && replaceIndex < next.length) {
            next[replaceIndex] = url;
            setBannerActivoIndex(replaceIndex);
            setPreviewBannerIndex(replaceIndex);
            return next;
          }
          next.push(url);
          setBannerActivoIndex(next.length - 1);
          setPreviewBannerIndex(next.length - 1);
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
      setPreviewBannerIndex((current) => {
        if (current >= next.length) return Math.max(0, next.length - 1);
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
    if (tipo === "logo") setOriginalLogoSource(url);
    setCropDialogSource(url);
    setCropDialogInitialSettings(null);
    setCropDialogType(tipo);
    setCropDialogFileName(file.name || `${tipo}.jpg`);
    setCropModalOpen(true);
  };

  const abrirEditorExistente = (tipo: "logo" | "banner") => {
    const url = tipo === "logo" ? logoUrl : (bannerUrls[bannerActivoIndex] ?? bannerUrls[0] ?? "");
    if (!url) return;
    const originalSource = tipo === "logo" ? originalLogoSource || url : originalBannerSources[url] || url;
    setCropDialogInitialSettings(tipo === "banner" ? bannerCropSettings[url] ?? null : null);
    if (tipo === "banner" && !originalBannerSources[url]) {
      setOriginalBannerSources((prev) => ({ ...prev, [url]: url }));
    }
    setCropDialogSource(originalSource);
    setCropDialogType(tipo);
    setCropDialogFileName(`${tipo}.jpg`);
    if (tipo === "banner") setEditingBannerIndex(bannerActivoIndex);
    else setEditingBannerIndex(null);
    setCropModalOpen(true);
  };

  const cancelarRecorte = () => {
    setCropModalOpen(false);
    const isOriginalBannerSource = cropDialogSource && Object.values(originalBannerSources).includes(cropDialogSource);
    if (!cropConfirmedRef.current && cropDialogSource?.startsWith("blob:") && cropDialogSource !== originalLogoSource && !isOriginalBannerSource) {
      URL.revokeObjectURL(cropDialogSource);
    }
    cropConfirmedRef.current = false;
    setCropDialogSource(null);
    setCropDialogInitialSettings(null);
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
    const nuevoTema = { nombre: nombreNuevoTema.trim(), colores: ensureColores(colores), fontFamily };
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
          colorBorde: colores.borde,
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
            colorBorde: colores.borde,
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

  const presetActivo = (tema: Pick<TemaBranding, "colores" | "fontFamily">) =>
    (Object.keys(tema.colores) as (keyof Colores)[]).every((key) => (
      tema.colores[key].toUpperCase() === colores[key].toUpperCase()
    )) && (!tema.fontFamily || tema.fontFamily === fontFamily);

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

  const previewSocialLinks = selectedSocialMedias.flatMap((key) => {
    const customItem = key.startsWith("custom:")
      ? otherContentList.find((item) => item.id === key)
      : undefined;
    const url = key === "websiteUrl"
      ? websiteUrl
      : customItem
        ? customItem.enlace
        : socialMediaValues[key as SocialMediaKey];
    if (!url?.trim()) return [];

    const socialKey = key as SocialMediaKey;
    return [{
      key,
      label: brandingLinkLabel(key),
      mark: key === "websiteUrl" ? "language" : customItem?.nombre.trim().charAt(0).toUpperCase() || "link",
      icon: key.startsWith("custom:") || key === "websiteUrl" ? null : PREVIEW_SOCIAL_ICONS[socialKey],
      iconColor: key.startsWith("custom:") || key === "websiteUrl"
        ? colores.botones
        : key === "twitterUrl" || key === "tiktokUrl" || key === "linkedinUrl"
          ? contraste(colores.cardFondo)
        : PREVIEW_SOCIAL_COLORS[socialKey],
      isSymbol: key === "websiteUrl",
    }];
  });

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
                  const activo = presetActivo(p);
                  return (
                    <Box key={p.nombre} onClick={() => aplicarPreset(p)}
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
                      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 0.5 }}>
                        <Box sx={{ minWidth: 0, textAlign: "center" }}>
                          <Typography sx={{ fontSize: 11, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {p.nombre}
                          </Typography>
                          <Typography sx={{ fontFamily: p.fontFamily, fontSize: 9, color: "text.secondary", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {p.fontFamily}
                          </Typography>
                        </Box>
                        <Typography aria-label={`Tipografía ${p.fontFamily}`} sx={{ flexShrink: 0, fontFamily: p.fontFamily, fontSize: 17, lineHeight: 1 }}>
                          Aa
                        </Typography>
                      </Box>
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
                    const activo = presetActivo(p);
                    return (
                      <Box key={`custom-theme-${idx}`} onClick={() => aplicarPreset(p)}
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
                          <Box sx={{ minWidth: 0, flexGrow: 1, textAlign: "center" }}>
                            <Typography sx={{ fontSize: 11, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.nombre}</Typography>
                            <Typography sx={{ fontSize: 9, color: "text.secondary", fontFamily: p.fontFamily, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.fontFamily ?? "Tipografía actual"}</Typography>
                          </Box>
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
              {CAMPOS.map(({ key, label, description }) => (
                <Box key={key} sx={ { mb: 2, "&:last-child": { mb: 0 } } }>
                  <Typography variant="body2" color="text.secondary" gutterBottom>{label}</Typography>
                  {description && (
                    <Typography variant="caption" color="text.secondary" sx={{ display: "block", mb: 0.75 }}>
                      {description}
                    </Typography>
                  )}
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
                Se aceptan varios banners. En la app se pueden deslizar y cambian automáticamente. También se admiten GIF animados.
              </Typography>
              <input ref={bannerInputRef} type="file" accept="image/*" hidden
                onChange={(e) => handleFileChange(e, "banner")} />

              <Box sx={{ display: "flex", justifyContent: "flex-end", mb: 2 }}>
                <Button variant="outlined" size="small" onClick={() => bannerInputRef.current?.click()}>
                  + Agregar banner
                </Button>
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
                            const originalSource = originalBannerSources[bannerUrl] || bannerUrl;
                            if (!originalBannerSources[bannerUrl]) {
                              setOriginalBannerSources((prev) => ({ ...prev, [bannerUrl]: bannerUrl }));
                            }
                            setCropDialogSource(originalSource);
                            setCropDialogInitialSettings(bannerCropSettings[bannerUrl] ?? null);
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
        <Box
          role={previewExpanded ? "dialog" : undefined}
          aria-modal={previewExpanded || undefined}
          aria-label={previewExpanded ? "Vista previa ampliada" : undefined}
          tabIndex={previewExpanded ? -1 : undefined}
          onClick={previewExpanded ? () => setPreviewExpanded(false) : undefined}
          onKeyDown={(event) => {
            if (previewExpanded && event.key === "Escape") setPreviewExpanded(false);
          }}
          sx={previewExpanded ? {
            position: "fixed",
            inset: 0,
            zIndex: 1300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            p: 2,
            overflowY: "auto",
            overscrollBehavior: "contain",
            boxSizing: "border-box",
            bgcolor: "rgba(0, 0, 0, 0.78)",
          } : { position: { md: "sticky" }, top: 24 }}
        >
          <Box
            onClick={(event) => event.stopPropagation()}
            sx={{
              width: previewExpanded ? "min(520px, calc(100vw - 32px))" : 440,
              maxWidth: "100%",
              mx: "auto",
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 1 }}>
              <Typography variant="subtitle2">Vista previa</Typography>
              <Tooltip title={previewExpanded ? "Cerrar vista ampliada" : "Ampliar vista previa"}>
                <IconButton
                  size="small"
                  aria-label={previewExpanded ? "Cerrar vista ampliada" : "Ampliar vista previa"}
                  onClick={(event) => {
                    event.stopPropagation();
                    setPreviewExpanded((expanded) => !expanded);
                  }}
                >
                  <span className="material-symbols-outlined">
                    {previewExpanded ? "close" : "open_in_full"}
                  </span>
                </IconButton>
              </Tooltip>
            </Box>
          <Card variant="outlined" sx={ { overflow: "hidden", border: "none", boxShadow: "none", bgcolor: "transparent" } }>
            <Box
              sx={{
                width: previewExpanded ? "100%" : 440,
                maxWidth: "none",
                height: previewExpanded ? "min(956px, calc(100dvh - 96px))" : 956,
                minWidth: previewExpanded ? 0 : 440,
                minHeight: previewExpanded ? 0 : 956,
                flex: "none",
                mx: "auto",
                bgcolor: fondo,
                color: colores.texto,
                border: "1px solid",
                borderColor: borde,
                borderRadius: "18px",
                overflow: "hidden",
                display: "flex",
                flexDirection: "column",
                boxShadow: "0 18px 48px rgba(0,0,0,0.24)",
                fontFamily: fontFamily === "system-ui" ? "system-ui, 'Segoe UI', Roboto, sans-serif" : `${fontFamily}, system-ui, 'Segoe UI', Roboto, sans-serif`,
                "&& *": {
                  fontFamily: fontFamily === "system-ui" ? "system-ui, 'Segoe UI', Roboto, sans-serif" : `${fontFamily}, system-ui, 'Segoe UI', Roboto, sans-serif`,
                },
                "&& .material-symbols-outlined": {
                  fontFamily: "Material Symbols Outlined",
                  fontFeatureSettings: "'liga' 1",
                },
              }}
            >
              <Box
                sx={{
                  height: 64,
                  flexShrink: 0,
                  px: 2.5,
                  bgcolor: cabeceraPreview,
                  borderBottom: "1px solid",
                  borderColor: borde,
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <Box
                  sx={{
                    width: 28,
                    height: 28,
                    flexShrink: 0,
                    overflow: "hidden",
                    borderRadius: "6px",
                    bgcolor: colores.botones,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: contraste(colores.botones),
                    fontWeight: 900,
                  }}
                >
                  {logoUrl ? (
                    <Box component="img" src={logoUrl} alt="" sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : nombre.trim().charAt(0).toUpperCase() || "A"}
                </Box>
                <Typography
                  noWrap
                  sx={{ minWidth: 0, flex: 1, fontSize: 18, fontWeight: 700, letterSpacing: 1, color: onCabecera }}
                >
                  {previewScreen === "home" ? nombre || "Mi Canal" : previewScreen === "news" ? "Noticias" : "Programación"}
                </Typography>
                <Box
                  sx={{
                    width: 40,
                    height: 40,
                    flexShrink: 0,
                    borderRadius: "50%",
                    border: `2px solid ${onCabecera}`,
                    bgcolor: colores.botones,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: contraste(colores.botones),
                    fontSize: 13,
                    fontWeight: 900,
                  }}
                >
                  U
                </Box>
              </Box>

              {previewScreen === "schedule" && (
                <Box
                  sx={{
                    height: 64,
                    flexShrink: 0,
                    px: 0.75,
                    bgcolor: fondo,
                    borderBottom: "1px solid",
                    borderColor: borde,
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <IconButton
                    size="small"
                    disabled={previewScheduleDay === "AYER"}
                    onClick={() => setPreviewScheduleDay(previewScheduleDay === "MAÑANA" ? "HOY" : "AYER")}
                    sx={{ color: colores.iconos, flexShrink: 0 }}
                    aria-label="Día anterior"
                  >
                    <span className="material-symbols-outlined">chevron_left</span>
                  </IconButton>
                  <Box sx={{ flex: 1, display: "flex", justifyContent: "center", gap: 0.5 }}>
                    {[
                      { label: "Ayer", value: "AYER" },
                      { label: "Hoy", value: "HOY" },
                      { label: "Mañana", value: "MAÑANA" },
                    ].map((day) => (
                      <Box
                        key={day.value}
                        component="button"
                        type="button"
                        onClick={() => setPreviewScheduleDay(day.value)}
                        sx={{
                          px: 1.15,
                          py: 0.9,
                          border: 0,
                          borderRadius: "999px",
                          bgcolor: previewScheduleDay === day.value ? colores.botones : "transparent",
                          color: previewScheduleDay === day.value ? contraste(colores.botones) : textoTenue,
                          font: "inherit",
                          fontSize: 13,
                          fontWeight: previewScheduleDay === day.value ? 800 : 500,
                          cursor: "pointer",
                        }}
                      >
                        {day.label}
                      </Box>
                    ))}
                  </Box>
                  <IconButton
                    size="small"
                    disabled={previewScheduleDay === "MAÑANA"}
                    onClick={() => setPreviewScheduleDay(previewScheduleDay === "AYER" ? "HOY" : "MAÑANA")}
                    sx={{ color: colores.iconos, flexShrink: 0 }}
                    aria-label="Día siguiente"
                  >
                    <span className="material-symbols-outlined">chevron_right</span>
                  </IconButton>
                </Box>
              )}

              <Box
                sx={{
                  flex: 1,
                  minHeight: 0,
                  overflowY: "auto",
                  overscrollBehavior: "contain",
                  scrollbarWidth: "none",
                  "&::-webkit-scrollbar": { display: "none" },
                }}
              >
                {previewScreen === "home" ? (
                <Box sx={{ px: 2.5, pt: 0, pb: 5 }}>
                  <Box
                    sx={{
                      width: "calc(100% + 40px)",
                      mx: "-20px",
                      aspectRatio: "16 / 9",
                      bgcolor: "#000000",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Box sx={{ width: 46, height: 46, borderRadius: "50%", bgcolor: "rgba(0,0,0,0.72)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <span className="material-symbols-outlined" style={{ color: "#FFFFFF", fontSize: 28 }}>play_arrow</span>
                    </Box>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mt: 2, mb: 2.5 }}>
                    <Typography sx={{ color: textoTenue, fontSize: 15, fontWeight: 600 }}>
                      Stream
                    </Typography>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 0.6 }}>
                      <Box sx={{ width: 7, height: 7, borderRadius: "50%", bgcolor: colores.secundario }} />
                      <Typography sx={{ color: colores.secundario, fontSize: 10, fontWeight: 900 }}>
                        EN VIVO
                      </Typography>
                    </Box>
                  </Box>

                  <Box sx={{ mt: 2, bgcolor: colores.cardFondo, border: "1px solid", borderColor: borde, borderRadius: "14px", overflow: "hidden" }}>
                    <Box sx={{ px: 1.75, py: 1.25, borderBottom: "1px solid", borderColor: borde, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <Typography sx={{ fontSize: 15, fontWeight: 800 }}>Chat</Typography>
                      <span className="material-symbols-outlined" style={{ color: colores.iconos, fontSize: 18 }}>more_horiz</span>
                    </Box>
                    <Box sx={{ height: 74, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      <Typography sx={{ color: textoTenue, fontSize: 12 }}>Esperando mensajes...</Typography>
                    </Box>
                    <Box sx={{ px: 1.25, pb: 1.25, display: "flex", alignItems: "center", gap: 1 }}>
                      <Box sx={{ flex: 1, px: 1.5, py: 1, border: "1px solid", borderColor: borde, borderRadius: 999, color: textoTenue, fontSize: 12 }}>
                        Enviar mensaje
                      </Box>
                      <span className="material-symbols-outlined" style={{ color: colores.botones, fontSize: 20 }}>send</span>
                    </Box>
                  </Box>

                  {bannerUrls.length > 0 && (
                    <Box sx={{ mt: 3 }}>
                      <Typography sx={{ color: textoTenue, fontSize: 12, fontWeight: 600, letterSpacing: 1.5, mb: 1 }}>
                        PUBLICIDAD
                      </Typography>
                      <Box
                        onPointerDown={handlePreviewBannerPointerDown}
                        onPointerUp={handlePreviewBannerPointerUp}
                        onPointerCancel={() => { bannerSwipeStartXRef.current = null; }}
                        sx={{
                          width: "100%",
                          height: 100,
                          overflow: "hidden",
                          borderRadius: "12px",
                          touchAction: "pan-y",
                          cursor: bannerUrls.length > 1 ? "grab" : "default",
                        }}
                      >
                        <Box
                          sx={{
                            display: "flex",
                            width: "100%",
                            height: "100%",
                            transform: `translateX(-${previewBannerIndex * 100}%)`,
                            transition: "transform 450ms ease",
                          }}
                        >
                          {bannerUrls.map((bannerUrl, index) => (
                            <Box
                              key={`${bannerUrl}-${index}`}
                              component="img"
                              src={bannerUrl}
                              alt={`Banner ${index + 1}`}
                              draggable={false}
                              sx={{ flex: "0 0 100%", width: "100%", height: "100%", objectFit: "cover", userSelect: "none" }}
                            />
                          ))}
                        </Box>
                      </Box>
                      {bannerUrls.length > 1 && (
                        <Box sx={{ display: "flex", justifyContent: "center", gap: 0.75, mt: 1 }}>
                          {bannerUrls.map((bannerUrl, index) => (
                            <Box
                              key={`${bannerUrl}-dot-${index}`}
                              component="button"
                              type="button"
                              aria-label={`Mostrar banner ${index + 1}`}
                              onClick={() => setPreviewBannerIndex(index)}
                              sx={{
                                width: 8,
                                height: 8,
                                minWidth: 8,
                                p: 0,
                                border: 0,
                                borderRadius: "50%",
                                bgcolor: index === previewBannerIndex ? colores.primario : alpha(colores.primario, 0.3),
                                cursor: "pointer",
                              }}
                            />
                          ))}
                        </Box>
                      )}
                    </Box>
                  )}

                  {previewSocialLinks.length > 0 && (
                    <Box sx={{ mt: 3.5 }}>
                      <Typography sx={{ color: textoTenue, fontSize: 12, fontWeight: 600, letterSpacing: 1.5, mb: 1.25 }}>
                        SEGUÍ EL CANAL
                      </Typography>
                      <Box
                        sx={{
                          p: 1.75,
                          bgcolor: colores.cardFondo,
                          border: "1px solid",
                          borderColor: borde,
                          borderRadius: "14px",
                          overflowX: "auto",
                          scrollbarWidth: "none",
                          "&::-webkit-scrollbar": { display: "none" },
                        }}
                      >
                        <Box sx={{ display: "flex", width: "max-content", gap: 1.25 }}>
                          {previewSocialLinks.map((link) => (
                            <Box
                              key={link.key}
                              title={link.label}
                              aria-label={link.label}
                              sx={{
                                width: 44,
                                height: 44,
                                flexShrink: 0,
                                borderRadius: "12px",
                                border: "1px solid",
                                borderColor: borde,
                                bgcolor: colores.cardFondo,
                                color: link.iconColor,
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: 13,
                                fontWeight: 900,
                              }}
                            >
                              {link.icon ? (
                                <FontAwesomeIcon icon={link.icon} />
                              ) : link.isSymbol ? (
                                <span className="material-symbols-outlined" style={{ fontSize: 19 }}>{link.mark}</span>
                              ) : link.mark}
                            </Box>
                          ))}
                        </Box>
                      </Box>
                    </Box>
                  )}

                  <Box sx={{ mt: 3.5 }}>
                    <Typography sx={{ color: textoTenue, fontSize: 12, fontWeight: 600, letterSpacing: 1.5, mb: 1.25 }}>
                      STREAMS PASADOS
                    </Typography>
                    <Box sx={{ p: 1.75, bgcolor: colores.cardFondo, border: "1px solid", borderColor: borde, borderRadius: "14px" }}>
                      <Box sx={{ width: 48, height: 48, mb: 1.5, bgcolor: alpha(colores.iconos, 0.12), borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span className="material-symbols-outlined" style={{ color: colores.iconos, fontSize: 24 }}>play_arrow</span>
                      </Box>
                      <Typography sx={{ color: textoTenue, fontSize: 13 }}>
                        No hay streams anteriores disponibles.
                      </Typography>
                    </Box>
                  </Box>
                </Box>
                ) : previewScreen === "news" ? (
                  <Box sx={{ px: 2.25, pt: 2.25, pb: 5 }}>
                    {previewNews.length === 0 ? (
                      <Typography sx={{ color: textoTenue, py: 2, fontSize: 13 }}>
                        Todavía no hay noticias publicadas.
                      </Typography>
                    ) : previewNews.map((noticia) => (
                      <Box
                        key={noticia.id}
                        sx={{ pb: 2.25, mb: 2.25, borderBottom: "1px solid", borderColor: borde }}
                      >
                        <Box
                          sx={{
                            height: 170,
                            mb: 1.25,
                            overflow: "hidden",
                            borderRadius: "10px",
                            bgcolor: colores.cardFondo,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                          }}
                        >
                          {noticia.coverImageUrl ? (
                            <Box
                              component="img"
                              src={noticia.coverImageUrl}
                              alt={noticia.title}
                              sx={{ width: "100%", height: "100%", objectFit: "cover" }}
                            />
                          ) : (
                            <span className="material-symbols-outlined" style={{ color: colores.iconos, fontSize: 36 }}>image</span>
                          )}
                        </Box>
                        <Typography sx={{ color: textoTenue, fontSize: 12, mb: 0.75 }}>
                          {noticia.publishedAt ? new Date(noticia.publishedAt).toLocaleDateString("es-AR") : "Publicada"}
                        </Typography>
                        <Typography sx={{ color: colores.texto, fontSize: 18, lineHeight: 1.22, fontWeight: 900 }}>
                          {noticia.title}
                        </Typography>
                      </Box>
                    ))}
                  </Box>
                ) : (
                  <Box sx={{ px: 2.25, pt: 2.25, pb: 4 }}>
                    {programasPreview.length === 0 ? (
                      <Box sx={{ display: "flex", minHeight: 230, flexDirection: "column", alignItems: "center", justifyContent: "center", px: 2 }}>
                        <span className="material-symbols-outlined" style={{ color: alpha(colores.iconos, 0.35), fontSize: 46 }}>calendar_month</span>
                        <Typography sx={{ color: textoTenue, mt: 1.5, fontSize: 14, textAlign: "center" }}>
                          No hay programación para este día.
                        </Typography>
                      </Box>
                    ) : programasPreview.map((programa, index) => (
                      <Box key={programa.id} sx={{ display: "flex", gap: 1.25, minHeight: 100 }}>
                        <Typography sx={{ width: 50, pt: 0.75, color: textoTenue, fontSize: 13, textAlign: "right", flexShrink: 0 }}>
                          {programa.horaInicio}
                        </Typography>
                        <Box sx={{ width: 26, display: "flex", flexDirection: "column", alignItems: "center", flexShrink: 0 }}>
                          <Box sx={{ width: 12, height: 12, mt: 1, border: "2px solid", borderColor: fondo, borderRadius: "50%", bgcolor: colores.iconos }} />
                          {index < programasPreview.length - 1 && <Box sx={{ flex: 1, width: "1px", mt: 0.5, bgcolor: borde }} />}
                        </Box>
                        <Box sx={{ flex: 1, minWidth: 0, mb: 2.25, p: 1.5, bgcolor: colores.cardFondo, border: "1px solid", borderColor: borde, borderRadius: "10px", opacity: previewScheduleDay === "HOY" ? 1 : 0.45 }}>
                          <Box sx={{ display: "flex", gap: 1.5, alignItems: "center" }}>
                            {programa.imagenUrl && (
                              <Box sx={{ width: 52, height: 52, flex: "0 0 52px", overflow: "hidden", borderRadius: "8px", bgcolor: alpha(colores.iconos, 0.12) }}>
                                <Box component="img" src={programa.imagenUrl} alt={programa.titulo} sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                              </Box>
                            )}
                            <Box sx={{ minWidth: 0, flex: 1 }}>
                              <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, mb: 0.75 }}>
                                <Typography sx={{ px: 0.75, py: 0.35, bgcolor: fondo, border: "1px solid", borderColor: borde, borderRadius: "4px", color: textoTenue, fontSize: 9, fontWeight: 800, letterSpacing: 0.5 }}>
                                  {programa.descripcion?.trim().split(/\s+/)[0]?.toUpperCase() || "PROGRAMA"}
                                </Typography>
                                {previewScheduleDay === "HOY" && (
                                  <span className="material-symbols-outlined" style={{ color: colores.iconos, fontSize: 17 }}>play_arrow</span>
                                )}
                              </Box>
                              <Typography sx={{ color: colores.texto, fontSize: 14, lineHeight: 1.18, fontWeight: 800 }}>
                                {programa.titulo}
                              </Typography>
                            </Box>
                            {previewScheduleDay !== "HOY" && (
                              <span className="material-symbols-outlined" style={{ color: colores.iconos, fontSize: 20 }}>lock_outline</span>
                            )}
                          </Box>
                        </Box>
                      </Box>
                    ))}
                  </Box>
                )}
              </Box>

              <Box sx={{ height: 64, flexShrink: 0, bgcolor: cabeceraPreview, borderTop: "1px solid", borderColor: borde, display: "flex" }}>
                {[
                  { icon: "home", label: "Inicio", screen: "home" as const },
                  { icon: "article", label: "Noticias", screen: "news" as const },
                  { icon: "calendar_month", label: "Programación", screen: "schedule" as const },
                ].map((item) => (
                  <Box key={item.label} onClick={() => setPreviewScreen(item.screen)} sx={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 0.25, cursor: "pointer" }}>
                    <span className="material-symbols-outlined" style={{ color: previewScreen === item.screen ? colores.primario : colores.iconos, fontSize: 22 }}>{item.icon}</span>
                    <Typography sx={{ color: previewScreen === item.screen ? colores.primario : colores.iconos, fontSize: 11, fontWeight: previewScreen === item.screen ? 700 : 500 }}>
                      {item.label}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </Box>

          </Card>
        </Box>
      </Box>
      </Box>

      <ImageCropDialog
        open={cropModalOpen}
        imageUrl={cropDialogSource}
        type={cropDialogType}
        fileName={cropDialogFileName}
        initialSettings={cropDialogInitialSettings}
        onClose={cancelarRecorte}
        onConfirm={(file, settings) => {
          cropConfirmedRef.current = true;
          const originalSource = cropDialogSource ?? undefined;
          setCropDialogSource(null);
          setCropModalOpen(false);
          const replaceIndex = cropDialogType === "banner" ? editingBannerIndex ?? undefined : undefined;
          void handleUpload(file, cropDialogType, replaceIndex, originalSource, settings);
          setCropDialogInitialSettings(null);
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