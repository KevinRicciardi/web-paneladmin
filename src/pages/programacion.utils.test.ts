import { describe, expect, it } from "vitest";
import {
  ajustarFinAlCambiarInicio,
  avisoDeHorario,
  esRangoHorarioValido,
  horaDentroDelPrograma,
  partesDeFechaCalendario,
  seSolapanHorarios,
  shouldShowLoadingState,
  terminaAlDiaSiguiente,
} from "./programacion.utils";

describe("shouldShowLoadingState", () => {
  it("no muestra loading si ya hay cache disponible", () => {
    expect(shouldShowLoadingState({ hasCache: true, hasLoadedOnce: false })).toBe(false);
  });

  it("muestra loading solo cuando no hay cache y aún no cargó nada", () => {
    expect(shouldShowLoadingState({ hasCache: false, hasLoadedOnce: false })).toBe(true);
  });

  it("deja de mostrar loading después de la primera carga", () => {
    expect(shouldShowLoadingState({ hasCache: false, hasLoadedOnce: true })).toBe(false);
  });
});

describe("validación de rango horario", () => {
  it("ya no corrige la hora de fin: una fin anterior es un programa nocturno", () => {
    expect(ajustarFinAlCambiarInicio("22:00", "02:00")).toBe("02:00");
    expect(ajustarFinAlCambiarInicio("14:00", "16:00")).toBe("16:00");
  });

  it("solo rechaza el rango vacío (inicio igual a fin)", () => {
    expect(esRangoHorarioValido("14:00", "14:00")).toBe(false);
    expect(esRangoHorarioValido("", "14:00")).toBe(false);
    expect(esRangoHorarioValido("15:00", "14:00")).toBe(true);
    expect(esRangoHorarioValido("14:00", "14:30")).toBe(true);
  });

  it("avisa cuando el programa termina al día siguiente", () => {
    expect(terminaAlDiaSiguiente("22:00", "02:00")).toBe(true);
    expect(terminaAlDiaSiguiente("10:00", "12:00")).toBe(false);
    expect(terminaAlDiaSiguiente("10:00", "10:00")).toBe(false);
  });
});

describe("avisoDeHorario", () => {
  const base = { rangoInvalido: false, hayConflictoDeRango: false, hayConflictoEnInicio: false, hayConflictoEnFin: false };

  it("sin conflictos no hay aviso", () => {
    expect(avisoDeHorario(base)).toBeNull();
  });

  it("un rango inválido o una superposición real avisan en amarillo, porque no dejan guardar", () => {
    expect(avisoDeHorario({ ...base, rangoInvalido: true })).toEqual({ tipo: "rangoInvalido", severidad: "warning" });
    expect(avisoDeHorario({ ...base, hayConflictoDeRango: true })).toEqual({ tipo: "superposicion", severidad: "warning" });
  });

  it("si solo el fin (o el inicio) coincide con otro programa, avisa en azul: deja guardar igual", () => {
    expect(avisoDeHorario({ ...base, hayConflictoEnFin: true })).toEqual({ tipo: "extremos", severidad: "info" });
    expect(avisoDeHorario({ ...base, hayConflictoEnInicio: true })).toEqual({ tipo: "extremos", severidad: "info" });
  });

  it("lo que impide guardar tiene prioridad sobre lo que solo informa", () => {
    expect(avisoDeHorario({ ...base, hayConflictoDeRango: true, hayConflictoEnFin: true })?.severidad).toBe("warning");
    expect(avisoDeHorario({ ...base, rangoInvalido: true, hayConflictoEnInicio: true })?.tipo).toBe("rangoInvalido");
  });
});

describe("horarios que cruzan la medianoche", () => {
  it("una hora cae dentro de un programa nocturno antes y después de las 00:00", () => {
    expect(horaDentroDelPrograma("22:00", "02:00", "23:00")).toBe(true);
    expect(horaDentroDelPrograma("22:00", "02:00", "01:00")).toBe(true);
    expect(horaDentroDelPrograma("22:00", "02:00", "02:00")).toBe(false);
    expect(horaDentroDelPrograma("22:00", "02:00", "12:00")).toBe(false);
  });

  it("en un programa normal sigue valiendo inicio <= hora < fin", () => {
    expect(horaDentroDelPrograma("10:00", "12:00", "10:00")).toBe(true);
    expect(horaDentroDelPrograma("10:00", "12:00", "12:00")).toBe(false);
  });

  it("detecta el solapamiento entre un nocturno y otro de madrugada", () => {
    expect(seSolapanHorarios("22:00", "02:00", "01:00", "03:00")).toBe(true);
    expect(seSolapanHorarios("22:00", "02:00", "02:00", "04:00")).toBe(false);
    expect(seSolapanHorarios("22:00", "02:00", "23:00", "23:30")).toBe(true);
  });

  it("los rangos normales se comportan como siempre", () => {
    expect(seSolapanHorarios("10:00", "12:00", "11:00", "13:00")).toBe(true);
    expect(seSolapanHorarios("10:00", "12:00", "12:00", "14:00")).toBe(false);
  });
});

describe("partesDeFechaCalendario", () => {
  it("lee la fecha tal cual la guardó la API, sin correrla por la zona horaria", () => {
    expect(partesDeFechaCalendario("2026-10-20T00:00:00.000Z")).toEqual({ año: 2026, mes: 10, dia: 20 });
  });

  it("acepta una fecha sola", () => {
    expect(partesDeFechaCalendario("2026-10-20")).toEqual({ año: 2026, mes: 10, dia: 20 });
  });

  it("rechaza texto que no es una fecha o una fecha imposible", () => {
    expect(partesDeFechaCalendario("")).toBeNull();
    expect(partesDeFechaCalendario("hoy")).toBeNull();
    expect(partesDeFechaCalendario("2026-02-31")).toBeNull();
  });
});
