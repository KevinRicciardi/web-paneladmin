import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../firebase", () => ({
  auth: { currentUser: { uid: "uid-1", getIdToken: async () => "token-1" } },
}));

import {
  contextoDeCache,
  elegirCanal,
  getCachedAuthHeaders,
  limpiarTokenCache,
  olvidarCanalElegido,
  recordarTenantDelPerfil,
  renombrarCanal,
} from "./authenticatedFetch";

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

  describe("con el selector de canal (localStorage, compartido entre pestañas)", () => {
    const selector = new Map<string, string>();
    const elegirEnOtraPestana = (slug: string) => selector.set("pinnacle-tenant-slug:uid-1", slug);

    beforeEach(() => {
      selector.clear();
      vi.stubGlobal("window", {
        localStorage: {
          getItem: (clave: string) => selector.get(clave) ?? null,
          setItem: (clave: string, valor: string) => selector.set(clave, valor),
          removeItem: (clave: string) => selector.delete(clave),
        },
      });
      return () => vi.unstubAllGlobals();
    });

    // Regresión: un MEGA_ADMIN le cambiaba el slug al canal que tenía
    // elegido y desde ahí todo guardado respondía "Tenant no encontrado".
    it("si le cambian el slug al canal elegido, los pedidos van al slug nuevo", async () => {
      elegirCanal("radio-vieja");
      recordarTenantDelPerfil("radio-vieja");

      renombrarCanal("radio-vieja", "radio-nueva");

      expect(await getCachedAuthHeaders()).toMatchObject({ "X-Tenant-Slug": "radio-nueva" });
      expect(selector.get("pinnacle-tenant-slug:uid-1")).toBe("radio-nueva");
    });

    it("renombrar otro canal no cambia el que muestra el panel", async () => {
      elegirCanal("marcos");
      recordarTenantDelPerfil("marcos");

      renombrarCanal("radio-xyz", "radio-abc");

      expect(await getCachedAuthHeaders()).toMatchObject({ "X-Tenant-Slug": "marcos" });
      expect(selector.get("pinnacle-tenant-slug:uid-1")).toBe("marcos");
    });

    it("olvidar el canal elegido vuelve al de siempre (sin header)", async () => {
      elegirCanal("ya-no-existe");
      recordarTenantDelPerfil("ya-no-existe");

      expect(olvidarCanalElegido()).toBe(true);
      expect(await getCachedAuthHeaders()).not.toHaveProperty("X-Tenant-Slug");
      // Sin nada elegido no hay nada que olvidar: App no reintenta en bucle.
      expect(olvidarCanalElegido()).toBe(false);
    });

    // Regresión: la pestaña que mostraba "marcos" guardaba su branding
    // (nombre incluido) en el canal que otra pestaña acababa de elegir.
    it("guarda en el canal que muestra esta pestaña aunque otra pestaña elija otro", async () => {
      recordarTenantDelPerfil("marcos");
      elegirEnOtraPestana("radio-xyz");

      const headers = await getCachedAuthHeaders();

      expect(headers).toMatchObject({ "X-Tenant-Slug": "marcos" });
      expect(contextoDeCache()).toBe("uid-1:marcos");
    });

    it("al cambiar de canal, /me pide el elegido en el selector", async () => {
      recordarTenantDelPerfil("marcos");
      // Es lo que hace App al cambiar de canal (limpiarCachesDeSesion).
      limpiarTokenCache();
      elegirEnOtraPestana("radio-xyz");

      const headers = await getCachedAuthHeaders();

      expect(headers).toMatchObject({ "X-Tenant-Slug": "radio-xyz" });
    });
  });
});

// Regresión: varias pantallas sacaban solo el token del helper y armaban los
// headers a mano, sin el canal. Un MEGA_ADMIN que editaba otra marca guardaba
// en la suya. Todo pedido autenticado tiene que usar getCachedAuthHeaders().
describe("pedidos autenticados del panel", () => {
  const raiz = join(process.cwd(), "src");
  const permitidos = ["services/authenticatedFetch.ts"];

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
