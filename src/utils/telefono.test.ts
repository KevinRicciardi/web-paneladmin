import { describe, expect, it } from "vitest";
import { armarNumeroInternacional, esNumeroValido, formatearNumero, OTRO_PAIS, separarNumero } from "./telefono";

describe("armarNumeroInternacional", () => {
  it("Argentina: agrega el 54 y el 9 que necesita WhatsApp", () => {
    expect(armarNumeroInternacional("54", "11 1234 5678")).toBe("+5491112345678");
    expect(armarNumeroInternacional("54", "(11) 1234-5678")).toBe("+5491112345678");
  });

  it("saca el 0 del principio (011, 0351...) porque no va en un número internacional", () => {
    expect(armarNumeroInternacional("54", "011 1234 5678")).toBe("+5491112345678");
    expect(armarNumeroInternacional("54", "0351 123 4567")).toBe("+5493511234567");
  });

  it("si ya escribió el 9 de los celulares argentinos no lo repite", () => {
    expect(armarNumeroInternacional("54", "9 11 1234 5678")).toBe("+5491112345678");
  });

  it("si pegó el número completo con el código de país, no lo duplica", () => {
    expect(armarNumeroInternacional("54", "5491112345678")).toBe("+5491112345678");
    expect(armarNumeroInternacional("34", "34612345678")).toBe("+34612345678");
  });

  it("otros países: solo antepone el código", () => {
    expect(armarNumeroInternacional("598", "99 123 456")).toBe("+59899123456");
    expect(armarNumeroInternacional("52", "55 1234 5678")).toBe("+525512345678");
    expect(armarNumeroInternacional("1", "(305) 555-0123")).toBe("+13055550123");
  });

  it('"otro país": el usuario escribe el número entero y solo se le pone el +', () => {
    expect(armarNumeroInternacional(OTRO_PAIS, "81 90 1234 5678")).toBe("+819012345678");
  });

  it("sin número devuelve vacío (para poder borrar el contacto)", () => {
    expect(armarNumeroInternacional("54", "")).toBe("");
    expect(armarNumeroInternacional("54", "  -  ")).toBe("");
    expect(armarNumeroInternacional("54", "000")).toBe("");
  });
});

describe("esNumeroValido (misma regla que la API)", () => {
  it("acepta números internacionales razonables", () => {
    expect(esNumeroValido("+5491112345678")).toBe(true);
    expect(esNumeroValido("+59899123456")).toBe(true);
  });

  it("rechaza números muy cortos, muy largos o que empiezan con 0", () => {
    expect(esNumeroValido("+5491")).toBe(false);
    expect(esNumeroValido("+1234567890123456")).toBe(false);
    expect(esNumeroValido("+0123456789")).toBe(false);
    expect(esNumeroValido("abc")).toBe(false);
  });
});

describe("separarNumero", () => {
  it("separa un número guardado en país y número local", () => {
    expect(separarNumero("+5491112345678")).toEqual({ codigo: "54", nacional: "1112345678" });
    expect(separarNumero("+59899123456")).toEqual({ codigo: "598", nacional: "99123456" });
    expect(separarNumero("+34612345678")).toEqual({ codigo: "34", nacional: "612345678" });
  });

  it("entiende un link de wa.me que se guardó antes", () => {
    expect(separarNumero("https://wa.me/5491112345678")).toEqual({ codigo: "54", nacional: "1112345678" });
  });

  it("elige el código más largo cuando hay dos que empiezan igual (Paraguay 595 antes que Cuba 53...)", () => {
    expect(separarNumero("+595981123456").codigo).toBe("595");
    expect(separarNumero("+5351234567").codigo).toBe("53");
  });

  it("un país que no está en la lista queda como 'otro' con el número completo", () => {
    expect(separarNumero("+819012345678")).toEqual({ codigo: OTRO_PAIS, nacional: "819012345678" });
  });

  it("sin nada guardado ofrece Argentina vacía", () => {
    expect(separarNumero("")).toEqual({ codigo: "54", nacional: "" });
  });

  it("lo que se arma se puede volver a separar y da lo mismo", () => {
    const armado = armarNumeroInternacional("54", "011 1234 5678");
    const { codigo, nacional } = separarNumero(armado);

    expect(armarNumeroInternacional(codigo, nacional)).toBe(armado);
  });
});

describe("formatearNumero", () => {
  it("muestra cómo va a quedar el número", () => {
    expect(formatearNumero("+5491112345678")).toBe("+54 9 1112345678");
    expect(formatearNumero("+59899123456")).toBe("+598 99123456");
    expect(formatearNumero("")).toBe("");
  });
});
