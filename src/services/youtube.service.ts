/**
 * Construye la URL de embed que YouTube resuelve automáticamente al video
 * en vivo actual de un canal, sin necesidad de conocer el video ID.
 */
export function buildYoutubeChannelEmbedUrl(
  channelId: string | null | undefined,
): string | null {
  if (!channelId || !channelId.trim()) return null;

  return `https://www.youtube.com/embed/live_stream?channel=${encodeURIComponent(channelId.trim())}`;
}
