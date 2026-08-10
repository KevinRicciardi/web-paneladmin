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
    
    // kick.com/canal
    if (parsed.hostname.includes('kick.com') && parsed.pathname !== '/') {
      const path = parsed.pathname.split('/')[1];
      if (path && path !== 'api') return path;
    }
    
    // player.kick.com/canal
    if (parsed.hostname === 'player.kick.com' && parsed.pathname !== '/') {
      const path = parsed.pathname.split('/')[1];
      if (path) return path;
    }
  } catch {
    // URL inválida
  }
  return null;
}

/**
 * Obtiene datos del stream de Kick
 * Se conecta a la API pública de Kick a través de un proxy CORS
 */
export async function getKickStreamData(channelName: string): Promise<KickStreamData | null> {
  if (!channelName) return null;

  try {
    const kickUrl = `https://kick.com/api/v1/channels/${channelName}`;
    console.log("Fetching from Kick URL:", kickUrl);
    
    // Intentar fetch directo primero
    let response: Response;
    try {
      response = await fetch(kickUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        mode: 'cors',
      });
    } catch (corsError) {
      // Si falla por CORS, usar proxy
      console.warn("Direct CORS fetch failed, trying proxy:", corsError);
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(kickUrl)}`;
      response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
    }

    if (!response.ok) {
      console.warn(`Kick API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    console.log("Kick API response:", data);
    
    const livestream = data.livestream;
    console.log("Livestream object:", livestream);
    console.log("Livestream keys:", livestream ? Object.keys(livestream) : "null/undefined");
    
    // Si no hay livestream o no está en vivo
    if (!livestream || !livestream.is_live) {
      console.log("Stream is not live or no livestream data");
      return {
        isLive: false,
        viewerCount: 0,
        duration: 0,
        title: data.name || '',
        thumbnail: data.profile_pic || '',
      };
    }

    // Stream activo - calcular duración
    let durationSec = 0;
    
    // Intentar obtener duration de start_time (cuando duration es 0 o no disponible)
    if (livestream.start_time) {
      try {
        console.log("Raw start_time value:", livestream.start_time, "Type:", typeof livestream.start_time);
        let startTime: Date;
        
        // start_time viene como string "YYYY-MM-DD HH:MM:SS" - convertir a ISO formato asumiendo UTC
        if (typeof livestream.start_time === 'string') {
          // Convertir "2026-08-10 10:45:16" a "2026-08-10T10:45:16Z"
          const isoString = livestream.start_time.replace(' ', 'T') + 'Z';
          startTime = new Date(isoString);
          console.log("Converted to ISO:", isoString, "Parsed Date:", startTime.toISOString());
        } else if (typeof livestream.start_time === 'number') {
          startTime = new Date(livestream.start_time * (livestream.start_time > 10000000000 ? 1 : 1000));
          console.log("Parsed as number, resulting Date:", startTime.toISOString());
        } else {
          throw new Error('Invalid start_time type');
        }
        
        if (!isNaN(startTime.getTime())) {
          const now = new Date();
          const durationMs = now.getTime() - startTime.getTime();
          durationSec = Math.max(0, Math.floor(durationMs / 1000));
          console.log(`Calculated duration from start_time: ${durationSec}s (started: ${startTime.toISOString()}, now: ${now.toISOString()})`);
        }
      } catch (e) {
        console.warn("Could not parse start_time:", livestream.start_time, e);
        durationSec = 0;
      }
    } else {
      console.warn("No start_time found in livestream data");
      durationSec = 0;
    }

    const result = {
      isLive: true,
      viewerCount: livestream.viewer_count || 0,
      duration: durationSec,
      title: livestream.session_title || '',
      thumbnail: livestream.thumbnail || data.profile_pic || '',
    };
    
    console.log("Returning Kick data:", result);
    return result;
    
  } catch (error) {
    console.error('Error fetching Kick stream data:', error);
    return null;
  }
}

export async function getKickAudioUrl(channelName: string): Promise<string | null> {
  if (!channelName) return null;

  try {
    const kickUrl = `https://kick.com/api/v1/channels/${channelName}`;
    let response: Response;

    try {
      response = await fetch(kickUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
        mode: 'cors',
      });
    } catch {
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(kickUrl)}`;
      response = await fetch(proxyUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
        },
      });
    }

    if (!response.ok) {
      return null;
    }

    const data = await response.json() as any;
    const livestream = data?.livestream;

    const candidates = [
      livestream?.playback_url,
      livestream?.hls_url,
      livestream?.source?.url,
      livestream?.source?.playback_url,
      livestream?.source?.stream_url,
      data?.playback_url,
      data?.playbackUrl,
      data?.stream_url,
    ];

    const audioUrl = candidates.find(
      (value) => typeof value === 'string' && value.length > 0,
    ) as string | undefined;

    if (audioUrl) {
      return audioUrl;
    }

    return null;
  } catch (error) {
    console.error('Error fetching Kick audio URL:', error);
    return null;
  }
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
