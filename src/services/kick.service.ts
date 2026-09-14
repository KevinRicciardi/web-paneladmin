/**
 * Servicio para obtener datos en tiempo real del stream de Kick
 * Documentación de API: https://api.kick.com/docs
 */

export interface KickStreamData {
  isLive: boolean;
  viewerCount: number;
  duration: number; // en segundos
  title: string;
  thumbnail: string;
}

/**
 * Obtiene el nombre del canal desde una URL de Kick
 */
export function extractKickChannelName(url: string): string | null {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();

    const validKickHost = hostname === 'kick.com' || hostname === 'www.kick.com' || hostname === 'player.kick.com';
    if (!validKickHost) return null;

    const pathSegments = parsed.pathname.split('/').filter(Boolean);
    if (pathSegments.length === 0) return null;

    // Ignorar rutas comunes de embed/live/api
    const ignored = new Set(['api', 'embed', 'live', 'channels', 'streams']);
    for (const segment of pathSegments) {
      if (!ignored.has(segment.toLowerCase())) {
        return segment;
      }
    }
  } catch {
    // URL inválida
  }
  return null;
}

/**
 * Obtiene datos del stream de Kick desde la API pública de Kick
 */
export async function getKickStreamData(channelName: string, token?: string): Promise<KickStreamData | null> {
  if (!channelName) return null;

  try {
    const audioUrl = await getKickAudioUrl(channelName, token);
    return { isLive: Boolean(audioUrl), viewerCount: 0, duration: 0, title: "", thumbnail: "" };
  } catch (error) {
    console.error("Error fetching Kick stream data:", error);
    return null;
  }
}

const AUDIO_URL_PATTERN = /(\.mp3|\.aac|\.m4a|\.ogg|\.wav|\.flac|\.opus|\.m3u8)(?:[?#].*)?$/i;
const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

function isAudioUrl(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0) return false;
  const trimmed = value.trim();
  if (AUDIO_URL_PATTERN.test(trimmed)) return true;

  try {
    const parsed = new URL(trimmed);
    const pathname = parsed.pathname.toLowerCase();
    return pathname.endsWith('/hls') || pathname.endsWith('/stream') || pathname.endsWith('/playback');
  } catch {
    return false;
  }
}

export async function getKickAudioUrl(channelName: string, token?: string): Promise<string | null> {
  if (!channelName) return null;

  const response = await fetch(
    `${API_URL}/streams/kick-audio?channel=${encodeURIComponent(channelName)}`,
    {
      headers: { Accept: "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      cache: "no-store",
    },
  );
  let data: { audioUrl?: unknown; code?: string; message?: string } = {};
  try { data = await response.json() as typeof data; } catch { /* Respuesta sin JSON. */ }
  if (!response.ok) {
    const error = new Error(data.message || "No se pudo obtener la señal de Kick.");
    (error as Error & { status?: number; code?: string }).status = response.status;
    (error as Error & { status?: number; code?: string }).code = data.code;
    throw error;
  }
  return typeof data.audioUrl === "string" && isAudioUrl(data.audioUrl) ? data.audioUrl : null;
}

/**
 * Formatea la duración en segundos a formato HH:MM:SS (como muestra Kick)
 */
export function formatDuration(seconds: number): string {
  // Validar que es un número válido
  if (!Number.isFinite(seconds) || seconds < 0) {
    return "—";
  }
  
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;
  
  // Siempre mostrar en formato HH:MM:SS como Kick
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(secs)}`;
}

/**
 * Formatea el número de viewers con sufijo (K, M)
 */
export function formatViewers(count: number): string {
  if (count >= 1000000) {
    return (count / 1000000).toFixed(1) + 'M';
  }
  if (count >= 1000) {
    return (count / 1000).toFixed(1) + 'K';
  }
  return count.toString();
}
