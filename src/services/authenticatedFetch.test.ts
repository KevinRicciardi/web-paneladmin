import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../firebase", () => ({
  auth: { currentUser: { uid: "uid-1", getIdToken: async () => "token-1" } },
}));

import { getCachedAuthHeaders, limpiarTokenCache, recordarTenantDelPerfil } from "./authenticatedFetch";

describe("getCachedAuthHeaders", () => {
  beforeEach(() => limpiarTokenCache());

  it("manda el canal que muestra el panel aunque no se haya tocado el selector", async () => {
    recordarTenantDelPerfil("marcos");

    const headers = await getCachedAuthHeaders();

    expect(headers.Authorization).toBe("Bearer token-1");
    expect(headers).toMatchObject({ "X-Tenant-Slug": "marcos" });
  });

  it("al cerrar la sesión se olvida el canal del usuario anterior", async () => {
    recordarTenantDelPerfil("marcos");
    limpiarTokenCache();

    const headers = await getCachedAuthHeaders();

    expect(headers).not.toHaveProperty("X-Tenant-Slug");
  });
});

// Regresión: varias pantallas sacaban solo el token del helper y armaban los
// headers a mano, sin el canal. Un MEGA_ADMIN que editaba otra marca guardaba
// en la suya. Todo pedido autenticado tiene que usar getCachedAuthHeaders().
describe("pedidos autenticados del panel", () => {
  const raiz = join(process.cwd(), "src");
  // kick.service recibe el token para un GET que no depende del canal.
  const permitidos = ["services/authenticatedFetch.ts", "services/kick.service.ts"];

  function archivos(carpeta: string): string[] {
    return readdirSync(carpeta).flatMap((nombre) => {
      const ruta = join(carpeta, nombre);
      if (statSync(ruta).isDirectory()) return archivos(ruta);
      return /\.tsx?$/.test(nombre) && !/\.test\.tsx?$/.test(nombre) ? [ruta] : [];
    });
  }

  it("ninguna pantalla arma el header Authorization a mano", () => {
    const culpables = archivos(raiz)
      .map((ruta) => ({ ruta: relative(raiz, ruta).replace(/\\/g, "/"), codigo: readFileSync(ruta, "utf8") }))
      .filter(({ ruta, codigo }) =>
        codigo.includes(".Authorization.slice(")
        || (!permitidos.includes(ruta) && /Authorization:\s*`Bearer/.test(codigo)),
      )
      .map(({ ruta }) => ruta);

    expect(culpables).toEqual([]);
  });
});
