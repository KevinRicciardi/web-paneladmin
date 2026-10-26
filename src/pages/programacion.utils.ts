export function shouldShowLoadingState({
  hasCache,
  hasLoadedOnce,
}: {
  hasCache: boolean;
  hasLoadedOnce: boolean;
}) {
  return !hasCache && !hasLoadedOnce;
}

export type AvisoDeHorario =
  | { tipo: "rangoInvalido"; severidad: "warning" }
  | { tipo: "superposicion"; severidad: "warning" }
  /** El inicio o el fin coinciden con otro programa pero no se pisan: deja guardar. */
  | { tipo: "extremos"; severidad: "info" };

/**
 * Qué aviso mostrar debajo de las horas. Amarillo (warning) solo si algo
 * impide guardar; azul (info) si el panel deja guardar igual y solo quiere que
 * se sepa. Antes todo salía amarillo y parecía que no se podía guardar.
 */
export function avisoDeHorario(estado: {
  rangoInvalido: boolean;
  hayConflictoDeRango: boolean;
  hayConflictoEnInicio: boolean;
  hayConflictoEnFin: boolean;
}): AvisoDeHorario | null {
  if (estado.rangoInvalido) return { tipo: "rangoInvalido", severidad: "warning" };
  if (estado.hayConflictoDeRango) return { tipo: "superposicion", severidad: "warning" };
  if (estado.hayConflictoEnInicio || estado.hayConflictoEnFin) return { tipo: "extremos", severidad: "info" };
  return null;
}

// Un programa nocturno (22:00 a 02:00) termina al día siguiente, así que ya no
// se corrige la hora de fin al cambiar el inicio: una fin "anterior" es válida.
export function ajustarFinAlCambiarInicio(_horaInicio: string, horaFin: string) {
  return horaFin;
}

export function esRangoHorarioValido(horaInicio: string, horaFin: string) {
  return Boolean(horaInicio && horaFin && horaInicio !== horaFin);
}

export function terminaAlDiaSiguiente(horaInicio: string, horaFin: string) {
  return esRangoHorarioValido(horaInicio, horaFin) && horaFin < horaInicio;
}

function aMinutos(hora: string) {
  const [horas, minutos] = hora.split(":").map(Number);
  return horas * 60 + minutos;
}

/** ¿Una hora del día cae dentro del programa? Contempla los nocturnos. */
export function horaDentroDelPrograma(horaInicio: string, horaFin: string, hora: string) {
  const inicio = aMinutos(horaInicio);
  const fin = aMinutos(horaFin);
  const valor = aMinutos(hora);

  return fin > inicio
    ? valor >= inicio && valor < fin
    : valor >= inicio || valor < fin;
}

/** ¿Dos rangos de horas se pisan? Contempla los que cruzan la medianoche. */
export function seSolapanHorarios(inicioA: string, finA: string, inicioB: string, finB: string) {
  const DIA = 24 * 60;
  const aInicio = aMinutos(inicioA);
  const aFin = aMinutos(finA) + (aMinutos(finA) <= aInicio ? DIA : 0);
  const bInicio = aMinutos(inicioB);
  const bFin = aMinutos(finB) + (aMinutos(finB) <= bInicio ? DIA : 0);

  // B también puede caer un día antes o después de A (cola de un nocturno).
  return [-DIA, 0, DIA].some((desplazamiento) => {
    const desde = bInicio + desplazamiento;
    const hasta = bFin + desplazamiento;
    return aInicio < hasta && desde < aFin;
  });
}

/**
 * La API guarda "20 de octubre" como medianoche UTC ("2026-10-20T00:00:00.000Z").
 * Pasada por `new Date()` en Argentina (UTC-3) daba el 19 a las 21 hs, y cada
 * edición corría la fecha un día más. Una fecha de calendario se lee de sus
 * primeros diez caracteres, sin pasar por la zona horaria.
 */
export function partesDeFechaCalendario(valor: string) {
  const coincidencia = /^(\d{4})-(\d{2})-(\d{2})/.exec(valor);
  if (!coincidencia) return null;

  const año = Number(coincidencia[1]);
  const mes = Number(coincidencia[2]);
  const dia = Number(coincidencia[3]);

  const fecha = new Date(año, mes - 1, dia);
  if (fecha.getFullYear() !== año || fecha.getMonth() !== mes - 1 || fecha.getDate() !== dia) {
    return null;
  }

  return { año, mes, dia };
}
