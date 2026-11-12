// "Descargas" cuenta solo las instalaciones que bajó Google Play (la app le avisa
// a la API quién la instaló). Las que llegan por otro medio (APK directo,
// pruebas del equipo, instalaciones anteriores a este dato) se muestran aparte
// para que no parezca que desaparecieron.

export function textoDeDescargas({
  descargas,
  variacion,
  otrasInstalaciones,
}: {
  descargas: number;
  variacion: number;
  /** Una API anterior a este campo no lo manda. */
  otrasInstalaciones?: number;
}): string {
  const comparacion =
    descargas > 0 || variacion !== 0
      ? `${variacion >= 0 ? "+" : ""}${variacion}% vs. período anterior`
      : "Sin descargas en el período anterior";

  if (!otrasInstalaciones || otrasInstalaciones <= 0) return comparacion;

  const cantidad = otrasInstalaciones.toLocaleString("es-AR");
  const plural = otrasInstalaciones === 1 ? "instalación" : "instalaciones";
  return `${comparacion} · Además, ${cantidad} ${plural} fuera de Play Store (APK directo o pruebas)`;
}
