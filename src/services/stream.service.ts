import { getKickStreamData, extractKickChannelName } from "./kick.service";
import type { KickStreamData } from "./kick.service";

export type StreamProvider = "kick" | "youtube" | "twitch" | null;
export type StreamData = KickStreamData;

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export function detectStreamProvider(url: string): StreamProvider {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (hostname === "kick.com" || hostname.endsWith(".kick.com")) return "kick";
    if (hostname === "youtube.com" || hostname.endsWith(".youtube.com") || hostname === "youtu.be") return "youtube";
    if (hostname === "twitch.tv" || hostname.endsWith(".twitch.tv")) return "twitch";
  } catch {
    // URL inválida.
  }
  return null;
}

export function extractYoutubeVideoId(url: string): string | null {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === "youtu.be") return parsed.pathname.slice(1).split("/")[0] || null;
    const queryId = parsed.searchParams.get("v");
    if (queryId) return queryId;
    const match = parsed.pathname.match(/\/(?:live|shorts|embed)\/([^/?]+)/);
    return match?.[1] ?? null;
  } catch {
    return null;
  }
}

export function extractTwitchChannelName(url: string): string | null {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    if (hostname !== "twitch.tv" && !hostname.endsWith(".twitch.tv")) return null;
    const channel = parsed.pathname.split("/").filter(Boolean)[0];
    if (!channel || ["directory", "videos", "search", "downloads"].includes(channel.toLowerCase())) return null;
    return channel;
  } catch {
    return null;
  }
}

async function getTwitchStreamData(tenantSlug: string): Promise<StreamData | null> {
  const response = await fetch(
    `${API_URL}/tenants/${encodeURIComponent(tenantSlug)}/stream-info`,
    { cache: "no-store" },
  );

  if (!response.ok) throw new Error(`Stream API error: ${response.status}`);
  const data = await response.json() as {
    isLive?: boolean;
    viewers?: number | null;
    title?: string | null;
    thumbnail?: string | null;
    startedAt?: string | null;
  };
  const duration = data.isLive && data.startedAt
    ? Math.max(0, Math.floor((Date.now() - Date.parse(data.startedAt)) / 1000))
    : 0;

  return {
    isLive: Boolean(data.isLive),
    viewerCount: data.viewers ?? 0,
    duration,
    title: data.title ?? "",
    thumbnail: data.thumbnail ?? "",
  };
}

async function getYoutubeStreamData(tenantSlug: string): Promise<StreamData | null> {
  const response = await fetch(
    `${API_URL}/tenants/${encodeURIComponent(tenantSlug)}/stream-info`,
    { cache: "no-store" },
  );
  if (!response.ok) throw new Error(`Stream API error: ${response.status}`);

  const data = await response.json() as {
    isLive?: boolean;
    viewers?: number | null;
    title?: string | null;
    thumbnail?: string | null;
    startedAt?: string | null;
  };
  const duration = data.isLive && data.startedAt
    ? Math.max(0, Math.floor((Date.now() - Date.parse(data.startedAt)) / 1000))
    : 0;

  return {
    isLive: Boolean(data.isLive),
    viewerCount: data.viewers ?? 0,
    duration,
    title: data.title ?? "",
    thumbnail: data.thumbnail ?? "",
  };
}

export async function getStreamData(
  url: string,
  provider: StreamProvider,
  tenantSlug?: string,
): Promise<StreamData | null> {
  if (provider === "kick") {
    const channelName = extractKickChannelName(url);
    return channelName ? getKickStreamData(channelName) : null;
  }
  if (provider === "youtube") return tenantSlug ? getYoutubeStreamData(tenantSlug) : null;

  if (provider === "twitch") {
    return tenantSlug ? getTwitchStreamData(tenantSlug) : null;
  }

  return null;
}
