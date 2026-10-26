// Número de WhatsApp del Centro de ayuda: país (desplegable) + número local.
//
// El número se guarda como un solo texto internacional, por ejemplo
// "+5491112345678", que es lo que acepta la API (+, de 8 a 15 dígitos) y lo que
// necesita wa.me. Antes había un solo campo libre y cada uno lo escribía a su
// manera (con 0, con 15, sin código de país), y el link no funcionaba.

export type Pais = { codigo: string; nombre: string };

/** Código vacío = "otro país": el usuario escribe el número completo con su código. */
export const OTRO_PAIS = "";

export const PAISES: Pais[] = [
  { codigo: "54", nombre: "Argentina" },
  { codigo: "591", nombre: "Bolivia" },
  { codigo: "55", nombre: "Brasil" },
  { codigo: "56", nombre: "Chile" },
  { codigo: "57", nombre: "Colombia" },
  { codigo: "506", nombre: "Costa Rica" },
  { codigo: "53", nombre: "Cuba" },
  { codigo: "593", nombre: "Ecuador" },
  { codigo: "503", nombre: "El Salvador" },
  { codigo: "34", nombre: "España" },
  { codigo: "1", nombre: "Estados Unidos y Canadá" },
  { codigo: "33", nombre: "Francia" },
  { codigo: "49", nombre: "Alemania" },
  { codigo: "502", nombre: "Guatemala" },
  { codigo: "504", nombre: "Honduras" },
  { codigo: "39", nombre: "Italia" },
  { codigo: "52", nombre: "México" },
  { codigo: "505", nombre: "Nicaragua" },
  { codigo: "507", nombre: "Panamá" },
  { codigo: "595", nombre: "Paraguay" },
  { codigo: "51", nombre: "Perú" },
  { codigo: "351", nombre: "Portugal" },
  { codigo: "44", nombre: "Reino Unido" },
  { codigo: "598", nombre: "Uruguay" },
  { codigo: "58", nombre: "Venezuela" },
];

const soloDigitos = (valor: string) => valor.replace(/\D/g, "");

/**
 * Arma el número internacional ("+5491112345678") a partir del país elegido y
 * lo que escribió el usuario. Devuelve "" si no escribió ningún número.
 *
 * - Saca los ceros del principio (el 0 de "011" no va en un número internacional).
 * - Si pegó el número entero con el código de país, no lo duplica.
 * - En Argentina los celulares de WhatsApp llevan un 9 después del 54: se agrega
 *   si falta (ningún código de área argentino empieza con 9, así que no hay
 *   confusión posible).
 */
export function armarNumeroInternacional(codigoPais: string, numeroLocal: string): string {
  let digitos = soloDigitos(numeroLocal).replace(/^0+/, "");
  if (!digitos) return "";

  if (codigoPais === OTRO_PAIS) return `+${digitos}`;

  if (digitos.startsWith(codigoPais) && digitos.length >= 11) {
    digitos = digitos.slice(codigoPais.length).replace(/^0+/, "");
  }

  if (codigoPais === "54" && !digitos.startsWith("9")) digitos = `9${digitos}`;

  return `+${codigoPais}${digitos}`;
}

/** Misma regla que la API: "+" opcional, primer dígito 1 a 9, de 8 a 15 dígitos en total. */
export function esNumeroValido(numero: string): boolean {
  return /^\+?[1-9]\d{7,14}$/.test(numero);
}

/**
 * Lo inverso: toma lo que hay guardado (un número, con o sin "+", o un link
 * wa.me) y lo separa en país y número local para mostrarlo en el formulario.
 * Si no reconoce el país queda como "otro" con el número completo.
 */
export function separarNumero(guardado: string): { codigo: string; nacional: string } {
  const texto = guardado.trim();
  const digitos = soloDigitos(/wa\.me\//i.test(texto) ? texto.split(/wa\.me\//i)[1] ?? "" : texto);

  if (!digitos) return { codigo: "54", nacional: "" };

  const coincidencia = [...PAISES]
    .sort((a, b) => b.codigo.length - a.codigo.length)
    .find((pais) => digitos.startsWith(pais.codigo));

  if (!coincidencia) return { codigo: OTRO_PAIS, nacional: digitos };

  let nacional = digitos.slice(coincidencia.codigo.length);
  if (coincidencia.codigo === "54" && nacional.startsWith("9")) nacional = nacional.slice(1);

  return { codigo: coincidencia.codigo, nacional };
}

/** Para mostrarle al usuario cómo va a quedar: "+54 9 11 1234 5678". */
export function formatearNumero(numero: string): string {
  const digitos = soloDigitos(numero);
  if (!digitos) return "";

  const { codigo, nacional } = separarNumero(digitos);
  if (codigo === OTRO_PAIS) return `+${digitos}`;

  const nueve = codigo === "54" ? " 9" : "";
  return `+${codigo}${nueve} ${nacional}`.trim();
}
