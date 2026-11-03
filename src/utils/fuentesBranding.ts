// Fuentes que una marca puede elegir en Branding. Solo esa pantalla las
// muestra, así que se piden al entrar ahí y no en el index.html (bloqueaban
// el primer render de todo el panel).
const URL_FUENTES =
  "https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&family=Montserrat:wght@300;400;600;700&family=Playfair+Display:wght@400;500;700&family=Poppins:wght@300;400;600;700&family=Raleway:wght@300;400;600;700&family=Lato:wght@300;400;700&family=Open+Sans:wght@300;400;600;700&family=Oswald:wght@300;400;500;700&display=swap";

export function cargarFuentesDeBranding() {
  if (typeof document === "undefined") return;
  if (document.querySelector(`link[href="${URL_FUENTES}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = URL_FUENTES;
  document.head.appendChild(link);
}
