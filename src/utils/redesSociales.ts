export type SocialMediaKey =
  | "instagramUrl"
  | "youtubeUrl"
  | "tiktokUrl"
  | "facebookUrl"
  | "twitterUrl"
  | "linkedinUrl";
export type CustomLinkKey = `custom:${string}`;
export type BrandingLinkKey = SocialMediaKey | "websiteUrl" | CustomLinkKey;

export const REDES_PRINCIPALES: SocialMediaKey[] = [
  "instagramUrl",
  "youtubeUrl",
  "tiktokUrl",
  "facebookUrl",
  "twitterUrl",
  "linkedinUrl",
];

type EnlacesGuardados = Partial<Record<SocialMediaKey | "websiteUrl", string | null>> & {
  socialMediasJson?: string | null;
};

function leerLista(valor?: string | null): unknown[] | null {
  if (!valor?.trim()) return null;
  try {
    const parsed: unknown = JSON.parse(valor);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

/**
 * Enlaces que muestra Branding, en el orden en que los muestra la app.
 *
 * socialMediasJson es la lista que guardó el admin: una red que quitó no
 * vuelve a aparecer. Antes se le sumaban siempre las seis redes, así que
 * quitar una y guardar parecía no guardarse (al volver a entrar estaba de
 * nuevo, vacía). Si nunca se guardó una lista, se muestran las seis.
 *
 * Igual se suman al final los enlaces con link que no estén en la lista
 * (datos viejos): la app los muestra, así que el panel no los puede esconder.
 */
export function ordenDeEnlaces(
  enlaces: EnlacesGuardados,
  idsPersonalizados: CustomLinkKey[],
): BrandingLinkKey[] {
  const esValida = (key: unknown): key is BrandingLinkKey =>
    key === "websiteUrl"
    || REDES_PRINCIPALES.includes(key as SocialMediaKey)
    || idsPersonalizados.includes(key as CustomLinkKey);
  const tieneLink = (key: SocialMediaKey | "websiteUrl") => Boolean(enlaces[key]?.trim());

  const guardada = leerLista(enlaces.socialMediasJson) ?? REDES_PRINCIPALES;
  const enLista = [...new Set(guardada)].filter(esValida);

  const conLinkFueraDeLista: BrandingLinkKey[] = [
    ...REDES_PRINCIPALES.filter(tieneLink),
    ...(tieneLink("websiteUrl") ? (["websiteUrl"] as const) : []),
    ...idsPersonalizados,
  ].filter((key) => !enLista.includes(key));

  return [...enLista, ...conLinkFueraDeLista];
}
