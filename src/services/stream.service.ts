import { getKickStreamData, extractKickChannelName } from "./kick.service";
import type { KickStreamData } from "./kick.service";

export type StreamProvider = "kick" | "youtube" | "twitch" | null;
export type StreamData = KickStreamData;

const YOUTUBE_API_URL = "https://www.googleapis.com/youtube/v3";

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

async function getYoutubeStreamData(url: string, channelId: string | null | undefined): Promise<StreamData | null> {
  const apiKey = import.meta.env.VITE_YOUTUBE_API_KEY as string | undefined;
  if (!apiKey) return null;

  const params = new URLSearchParams({
    part: "snippet,liveStreamingDetails",
    key: apiKey,
  });
  const videoId = extractYoutubeVideoId(url);

  if (videoId) {
    params.set("id", videoId);
  } else if (channelId) {
    params.set("channelId", channelId);
    params.set("eventType", "live");
    params.set("type", "video");
    params.set("maxResults", "1");
  } else {
    return null;
  }

  const response = await fetch(`${YOUTUBE_API_URL}/${videoId ? "videos" : "search"}?${params}`);
  if (!response.ok) throw new Error(`YouTube API error: ${response.status}`);
  const data = await response.json() as { items?: Array<{ id?: { videoId?: string }; snippet?: { title?: string; liveBroadcastContent?: string }; liveStreamingDetails?: { actualStartTime?: string; concurrentViewers?: string } }> };
  const item = data.items?.[0];
  if (!item) return { isLive: false, viewerCount: 0, duration: 0, title: "", thumbnail: "" };

  const details = item.liveStreamingDetails;
  const isLive = item.snippet?.liveBroadcastContent === "live" && Boolean(details?.actualStartTime);
  const duration = isLive && details?.actualStartTime
    ? Math.max(0, Math.floor((Date.now() - Date.parse(details.actualStartTime)) / 1000))
    : 0;

  return {
    isLive,
    viewerCount: Number(details?.concurrentViewers ?? 0),
    duration,
    title: item.snippet?.title ?? "",
    thumbnail: "",
  };
}

export async function getStreamData(
  url: string,
  provider: StreamProvider,
  youtubeChannelId?: string | null,
): Promise<StreamData | null> {
  if (provider === "kick") {
    const channelName = extractKickChannelName(url);
    return channelName ? getKickStreamData(channelName) : null;
  }
  if (provider === "youtube") return getYoutubeStreamData(url, youtubeChannelId);

  // Twitch requiere Client-ID y token; debe resolverse en el backend, nunca en el navegador.
  return null;
}
