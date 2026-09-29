import type { KickStreamData } from "./kick.service";

export type StreamProvider = "kick" | "youtube" | "twitch" | null;
export type StreamData = KickStreamData;

export type SignalStatus = {
  label: "Conectado" | "Desconectado";
  conectado: boolean;
};

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const STREAM_DATA_CACHE_TTL_MS = 5_000;
const streamDataCache = new Map<string, { data: StreamData | null; expiresAt: number }>();
const streamDataRequests = new Map<string, Promise<StreamData | null>>();

export function getSignalStatus(
  provider: string | StreamProvider | null | undefined,
  data?: Partial<StreamData> | null,
): SignalStatus {
  const isLive = Boolean(data?.isLive);
  if (provider && provider !== "kick" && !data) {
    return { label: "Desconectado", conectado: false };
  }
  return isLive
    ? { label: "Conectado", conectado: true }
    : { label: "Desconectado", conectado: false };
}

function calcularDuracionStream(isLive: boolean | undefined, startedAt?: string | null) {
  if (!isLive || !startedAt) return 0;

  const fechaNormalizada = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(startedAt)
    ? startedAt
    : `${startedAt.replace(" ", "T")}Z`;
  const timestamp = Date.parse(fechaNormalizada);

  return Number.isNaN(timestamp)
    ? 0
    : Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
}

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
  const duration = calcularDuracionStream(data.isLive, data.startedAt);

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
  const duration = calcularDuracionStream(data.isLive, data.startedAt);

  return {
    isLive: Boolean(data.isLive),
    viewerCount: data.viewers ?? 0,
    duration,
    title: data.title ?? "",
    thumbnail: data.thumbnail ?? "",
  };
}

async function getTenantStreamData(tenantSlug: string): Promise<StreamData | null> {
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
  const duration = calcularDuracionStream(data.isLive, data.startedAt);

  return {
    isLive: Boolean(data.isLive),
    viewerCount: data.viewers ?? 0,
    duration,
    title: data.title ?? "",
    thumbnail: data.thumbnail ?? "",
  };
}

export async function getStreamData(
  _url: string,
  provider: StreamProvider,
  tenantSlug?: string,
): Promise<StreamData | null> {
  if (!tenantSlug || !provider) return null;

  const cacheKey = `${provider}:${tenantSlug}`;
  const cached = streamDataCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const pending = streamDataRequests.get(cacheKey);
  if (pending) return pending;

  const request = (async () => {
    const data = provider === "kick"
      ? await getTenantStreamData(tenantSlug)
      : provider === "youtube"
        ? await getYoutubeStreamData(tenantSlug)
        : provider === "twitch"
          ? await getTwitchStreamData(tenantSlug)
          : null;

    streamDataCache.set(cacheKey, {
      data,
      expiresAt: Date.now() + STREAM_DATA_CACHE_TTL_MS,
    });
    return data;
  })();

  streamDataRequests.set(cacheKey, request);
  try {
    return await request;
  } finally {
    if (streamDataRequests.get(cacheKey) === request) {
      streamDataRequests.delete(cacheKey);
    }
  }
}
