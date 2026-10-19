export type TemaGuardado<Colores> = {
  nombre: string;
  colores: Colores;
  fontFamily?: string;
};

/**
 * Lee los temas personalizados guardados en el tenant (un JSON dentro de un
 * string). Devuelve null si no hay nada que leer o el contenido está roto, para
 * que quien llama pueda distinguir "no hay temas" de "no se pudo leer" y no
 * pise la lista que ya tiene en pantalla.
 */
export function parsearTemas<Colores>(
  raw: unknown,
  normalizarColores: (colores?: Partial<Colores>) => Colores,
): TemaGuardado<Colores>[] | null {
  if (typeof raw !== "string" || !raw.trim()) return null;

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }

  if (!Array.isArray(parsed)) return null;

  return parsed
    .filter((item): item is { nombre: string; colores?: Partial<Colores>; fontFamily?: string } =>
      Boolean(item) && typeof item === "object" && typeof (item as { nombre?: unknown }).nombre === "string",
    )
    .map((item) => ({
      nombre: item.nombre,
      colores: normalizarColores(item.colores),
      fontFamily: item.fontFamily,
    }));
}

/** Enlaces del tenant que el botón "Descartar cambios" tiene que restaurar. */
export function enlacesDelTenant(tenant?: {
  websiteUrl?: string | null;
  socialMediasJson?: string | null;
  otherContentJson?: string | null;
} | null) {
  return {
    websiteUrl: tenant?.websiteUrl ?? "",
    socialMediasJson: tenant?.socialMediasJson ?? undefined,
    otherContentJson: tenant?.otherContentJson ?? undefined,
  };
}
