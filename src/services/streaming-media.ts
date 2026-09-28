import type { PodcastPlatformType } from "../types";

export function detectStreamingPlatform(url: string): PodcastPlatformType {
  try {
    const hostname = new URL(url).hostname.toLowerCase().replace(/^www\./, "");
    if (hostname === "youtube.com" || hostname === "youtu.be" || hostname.endsWith(".youtube.com")) return "youtube";
    if (hostname === "twitch.tv" || hostname.endsWith(".twitch.tv")) return "twitch";
    if (hostname === "kick.com" || hostname.endsWith(".kick.com")) return "kick";
    return url.trim() ? "other" : "direct";
  } catch {
    return "direct";
  }
}

export function getStreamingEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);
    const platform = detectStreamingPlatform(url);
    if (platform === "youtube") {
      let videoId = parsed.searchParams.get("v");
      if (!videoId && parsed.hostname === "youtu.be") videoId = parsed.pathname.slice(1);
      if (!videoId && parsed.pathname.includes("/live/")) videoId = parsed.pathname.split("/live/")[1];
      if (!videoId && parsed.pathname.includes("/embed/")) videoId = parsed.pathname.split("/embed/")[1];
      return videoId ? `https://www.youtube.com/embed/${videoId.split("/")[0]}` : null;
    }
    if (platform === "kick") {
      const channel = parsed.pathname.split("/").filter(Boolean)[0];
      return channel ? `https://player.kick.com/${channel}` : null;
    }
    if (platform === "twitch") {
      const channel = parsed.pathname.split("/").filter(Boolean)[0];
      if (!channel || ["directory", "videos", "clip"].includes(channel)) return null;
      const parent = typeof window !== "undefined" ? window.location.hostname : "localhost";
      return `https://player.twitch.tv/?channel=${encodeURIComponent(channel)}&parent=${encodeURIComponent(parent)}`;
    }
    return null;
  } catch {
    return null;
  }
}

export function getAutoplayStreamingEmbedUrl(url: string, platform?: PodcastPlatformType | null): string | null {
  const detectedPlatform = platform && platform !== "direct" && platform !== "other"
    ? platform
    : detectStreamingPlatform(url);
  const embedUrl = getStreamingEmbedUrl(url);
  if (!embedUrl) return null;
  if (detectedPlatform === "youtube") return `${embedUrl}?autoplay=1&controls=0&playsinline=1`;
  if (detectedPlatform === "twitch") return `${embedUrl}&autoplay=true&muted=false`;
  if (detectedPlatform === "kick") return `${embedUrl}?autoplay=true&muted=false`;
  return null;
}

export function getDirectAudioUrl(url: string): string | null {
  const normalized = url.trim();
  if (!normalized) return null;

  const cleanUrl = normalized.toLowerCase().split(/[?#]/)[0];
  if (/\.(mp4|m4v|webm|ogv|mov)$/.test(cleanUrl)) return null;
  if (/\.(mp3|aac|m4a|ogg|wav|flac|opus|m3u8)$/.test(cleanUrl)) return normalized;

  try {
    const parsed = new URL(normalized);
    if (detectStreamingPlatform(normalized) !== "other") return null;
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? normalized : null;
  } catch {
    return null;
  }
}

export function getStreamingPlatformLabel(url: string): string {
  const platform = detectStreamingPlatform(url);
  if (platform === "youtube") return "YouTube";
  if (platform === "twitch") return "Twitch";
  if (platform === "kick") return "Kick";
  return "Desconocida";
}

export function isDirectVideoUrl(url: string): boolean {
  return /\.(mp4|m4v|webm|ogv|mov)$/.test(url.trim().toLowerCase().split(/[?#]/)[0]);
}