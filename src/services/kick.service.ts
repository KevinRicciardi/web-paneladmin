/**
 * Utilidades para el stream de Kick: nombre del canal y formato de los
 * datos del vivo.
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
