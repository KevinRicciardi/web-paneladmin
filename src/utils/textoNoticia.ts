// Texto plano de una noticia. Misma lógica que la API (src/news/news-text.ts):
// el editor guarda HTML, y el resumen no tiene que mostrar etiquetas.

const ENTIDADES: Record<string, string> = {
  nbsp: ' ',
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
}

function decodificarEntidades(texto: string): string {
  return texto.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (entidad, cuerpo: string) => {
    if (cuerpo[0] === '#') {
      const codigo =
        cuerpo[1].toLowerCase() === 'x'
          ? parseInt(cuerpo.slice(2), 16)
          : parseInt(cuerpo.slice(1), 10)
      try {
        return Number.isFinite(codigo) ? String.fromCodePoint(codigo) : entidad
      } catch {
        return entidad
      }
    }
    return ENTIDADES[cuerpo.toLowerCase()] ?? entidad
  })
}

/** Texto plano de un contenido HTML (o markdown simple), en una sola línea. */
export function textoPlanoDeContenido(contenido: string): string {
  const sinBloques = contenido
    // El contenido de <script> y <style> no es texto de la noticia.
    .replace(/<(script|style)\b[\s\S]*?<\/\1\s*>/gi, ' ')
    // Los cortes de bloque separan palabras: "uno</div><div>dos" no es "unodos".
    .replace(/<\/?(p|div|br|li|ul|ol|h[1-6]|blockquote|tr|table|figure)\b[^>]*>/gi, ' ')
    .replace(/<[a-zA-Z/!][^>]*>/g, '')

  return decodificarEntidades(sinBloques)
    // Restos de markdown de noticias viejas. No se tocan guiones ni guiones
    // bajos sueltos: son parte de las palabras y de los links.
    .replace(/^\s{0,3}#{1,6}\s+/gm, '')
    .replace(/^\s*>\s?/gm, '')
    .replace(/[*`]+|__/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Resumen de hasta [max] caracteres, sin cortar en medio de una palabra. */
export function resumenDeContenido(contenido: string, max = 180): string {
  const texto = textoPlanoDeContenido(contenido)
  if (texto.length <= max) return texto

  const corte = texto.slice(0, max)
  const ultimoEspacio = corte.lastIndexOf(' ')
  const base = ultimoEspacio > max * 0.6 ? corte.slice(0, ultimoEspacio) : corte
  return `${base.trimEnd()}…`
}
