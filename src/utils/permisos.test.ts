import { describe, expect, it } from "vitest";
import type { Perfil } from "../types";
import { puedeVerRuta } from "./permisos";

const perfil = (rol: string, cargo: string | null = null) => ({ rol, cargo }) as unknown as Perfil;

describe("puedeVerRuta", () => {
  it("un ADMIN solo entra a las secciones de su cargo", () => {
    const analista = perfil("ADMIN", "Analista");

    expect(puedeVerRuta(analista, "/estadisticas")).toBe(true);
    expect(puedeVerRuta(analista, "/branding")).toBe(false);
    expect(puedeVerRuta(analista, "/administradores")).toBe(false);
    expect(puedeVerRuta(analista, "/")).toBe(true);
  });

  it("el dueño del canal entra a todo menos a la cola de solicitudes", () => {
    const dueno = perfil("SUPER_ADMIN");

    expect(puedeVerRuta(dueno, "/branding")).toBe(true);
    expect(puedeVerRuta(dueno, "/generar-app")).toBe(true);
    expect(puedeVerRuta(dueno, "/solicitudes-apps")).toBe(false);
  });

  it("el MEGA_ADMIN ve la cola de solicitudes y no Generar App, como en el menú", () => {
    const mega = perfil("MEGA_ADMIN");

    expect(puedeVerRuta(mega, "/solicitudes-apps")).toBe(true);
    expect(puedeVerRuta(mega, "/generar-app")).toBe(false);
    expect(puedeVerRuta(mega, "/administradores")).toBe(true);
  });

  it("Streaming se abre también con permiso de podcast", () => {
    expect(puedeVerRuta(perfil("ADMIN", "Operador de Streaming"), "/streaming")).toBe(true);
  });
});
