// Qué tipo de link de YouTube pegó el usuario. La API solo acepta links de un
// CANAL (youtube.com/@nombre, youtube.com/channel/UC..., youtube.com/user/...),
// porque la app reproduce el canal y no un video suelto. Quien pega el link de
// un video no tenía forma de saber que no iba a funcionar hasta que fallaba el
// guardado.

export type TipoLinkYoutube =
  /** Link de un canal: sirve. */
  | "canal"
  /** Link de un video, un short, una transmisión puntual o youtu.be: no sirve. */
  | "video"
  /** youtube.com/c/...: la API lo rechaza, hay que usar el @ del canal. */
  | "personalizado"
  /** No es un link de YouTube o no se reconoce. */
  | "otro";

const ID_DE_CANAL = /^UC[\w-]{22}$/;

export function clasificarLinkYoutube(link: string): TipoLinkYoutube {
  let url: URL;
  try {
    url = new URL(link.trim());
  } catch {
    return "otro";
  }

  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  const esYoutube = host === "youtube.com" || host.endsWith(".youtube.com");

  if (host === "youtu.be") return "video";
  if (!esYoutube) return "otro";

  const partes = url.pathname.split("/").filter(Boolean);
  const primera = partes[0] ?? "";

  if (primera.startsWith("@") && primera.length > 1) return "canal";
  if (primera === "channel" && ID_DE_CANAL.test(partes[1] ?? "")) return "canal";
  if (primera === "user" && partes[1]) return "canal";
  if (primera === "c" && partes[1]) return "personalizado";

  if (primera === "watch" || primera === "live" || primera === "shorts" || primera === "embed") return "video";
  if (url.searchParams.has("v")) return "video";

  return "otro";
}
