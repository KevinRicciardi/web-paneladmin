export function shouldShowLoadingState({
  hasCache,
  hasLoadedOnce,
}: {
  hasCache: boolean;
  hasLoadedOnce: boolean;
}) {
  return !hasCache && !hasLoadedOnce;
}

export function ajustarFinAlCambiarInicio(horaInicio: string, horaFin: string) {
  return horaFin < horaInicio ? horaInicio : horaFin;
}

export function esRangoHorarioValido(horaInicio: string, horaFin: string) {
  return Boolean(horaInicio && horaFin && horaInicio < horaFin);
}
