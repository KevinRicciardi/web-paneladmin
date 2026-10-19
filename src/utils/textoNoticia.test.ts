import { describe, expect, it } from "vitest";
import { resumenDeContenido, textoPlanoDeContenido } from "./textoNoticia";

describe("textoPlanoDeContenido", () => {
  it("quita las etiquetas del editor y separa los bloques", () => {
    expect(textoPlanoDeContenido('Hola<div>mundo</div><img src="https://x.com/a.png"><div><br></div>')).toBe("Hola mundo");
  });

  it("decodifica entidades y conserva guiones", () => {
    expect(textoPlanoDeContenido("Tom&nbsp;&amp;&nbsp;Jerry - co-conductor")).toBe("Tom & Jerry - co-conductor");
  });

  it("un \"<\" suelto no se toma por una etiqueta", () => {
    expect(textoPlanoDeContenido("<div>2 < 3 y 5 > 4</div>")).toBe("2 < 3 y 5 > 4");
  });

  it("el resumen guardado con etiquetas se muestra limpio", () => {
    expect(resumenDeContenido('<div>Texto</div><img src="a.png">', 120)).toBe("Texto");
  });

  it("corta un resumen largo en una palabra", () => {
    const resumen = resumenDeContenido("palabra ".repeat(40), 30);

    expect(resumen.endsWith("…")).toBe(true);
    expect(resumen.length).toBeLessThanOrEqual(31);
  });
});
