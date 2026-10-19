/** "#FF0000" o "FF0000" -> "#FF0000" (mayúsculas o minúsculas); cualquier otra cosa -> null. */
export function normalizarHex(valor: string): string | null {
  const limpio = valor.trim();
  const conNumeral = limpio.startsWith("#") ? limpio : `#${limpio}`;
  return /^#[0-9a-fA-F]{6}$/.test(conNumeral) ? conNumeral : null;
}
