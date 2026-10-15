// Genera una paleta completa de branding a partir de un solo color de marca.
// Trabaja en HSL: mantiene el tono (hue) del color elegido y varía
// saturación y luminosidad para armar fondos, cards, iconos, etc.

export type ModoTema = "oscuro" | "claro";

export type PaletaGenerada = {
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

export const HEX_REGEX = /^#[0-9a-fA-F]{6}$/;

function hexAHsl(hex: string): { h: number; s: number; l: number } {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  const d = max - min;

  if (d === 0) return { h: 0, s: 0, l: l * 100 };

  const s = d / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === r) h = ((g - b) / d) % 6;
  else if (max === g) h = (b - r) / d + 2;
  else h = (r - g) / d + 4;

  return { h: (h * 60 + 360) % 360, s: s * 100, l: l * 100 };
}

function hsl(h: number, s: number, l: number): string {
  const sn = Math.min(100, Math.max(0, s)) / 100;
  const ln = Math.min(100, Math.max(0, l)) / 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = sn * Math.min(ln, 1 - ln);
  const f = (n: number) => ln - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, "0");
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`.toUpperCase();
}

// Brillo percibido (0 a 1): el amarillo y el azul con la misma luminosidad
// HSL se ven muy distintos, así que para decidir contraste se usa esto.
function brillo(hex: string): number {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

export function generarTema(colorBase: string, modo: ModoTema): PaletaGenerada {
  const { h, s } = hexAHsl(colorBase);
  const b = brillo(colorBase);
  // Un gris no tiene tono: si se le sube la saturación aparece un tinte rojo.
  const sAcento = s < 8 ? 0 : s + 10;

  if (modo === "oscuro") {
    // Sobre fondo oscuro el color de marca no puede ser demasiado oscuro.
    const primario = b < 0.3 ? hsl(h, s, 55) : colorBase.toUpperCase();
    return {
      fondo: hsl(h, s * 0.35, 4),
      cabecera: hsl(h, s * 0.4, 8),
      cardFondo: hsl(h, s * 0.3, 11),
      texto: "#FFFFFF",
      textoCabecera: "#FFFFFF",
      primario,
      botones: primario,
      secundario: hsl(h, sAcento, 82),
      iconos: hsl(h, s * 0.7, 72),
      borde: "#FFFFFF",
    };
  }

  // Sobre fondo claro el color de marca no puede ser demasiado claro.
  const primario = b > 0.6 ? hsl(h, s, 40) : colorBase.toUpperCase();
  return {
    fondo: hsl(h, s * 0.3, 98),
    cabecera: hsl(h, s * 0.35, 92),
    cardFondo: hsl(h, s * 0.3, 95),
    texto: hsl(h, Math.min(s, 25), 12),
    textoCabecera: hsl(h, Math.min(s, 25), 12),
    primario,
    botones: primario,
    secundario: hsl(h, sAcento, 38),
    iconos: hsl(h, s * 0.5, 40),
    borde: "#000000",
  };
}
