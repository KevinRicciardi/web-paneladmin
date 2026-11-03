import DOMPurify from "dompurify";

// El contenido de una noticia lo escribe cualquier admin de la marca y lo
// abre, por ejemplo, el MEGA_ADMIN: sin limpiar, un <img onerror=...>
// guardado ejecutaba código en su sesión. La API también lo limpia al
// guardar; esto cubre las noticias viejas.
export function limpiarContenidoNoticia(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      "p", "div", "span", "br", "hr",
      "b", "strong", "i", "em", "u", "s", "strike", "sub", "sup",
      "h1", "h2", "h3", "h4", "h5", "h6",
      "ul", "ol", "li", "blockquote", "a", "img",
    ],
    ALLOWED_ATTR: ["href", "src", "alt", "target", "rel", "style"],
  });
}
