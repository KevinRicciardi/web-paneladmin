import { describe, expect, it } from "vitest";
import ErrorBoundary from "./ErrorBoundary";

describe("ErrorBoundary", () => {
  it("guarda el error cuando un hijo falla al renderizar", () => {
    const error = new Error("MUI: Unsupported color");

    expect(ErrorBoundary.getDerivedStateFromError(error)).toEqual({ error });
  });

  it("limpia el error al cambiar de pantalla (resetKey distinta)", () => {
    const estado = { error: new Error("x"), resetKey: "/branding" };

    expect(ErrorBoundary.getDerivedStateFromProps({ children: null, resetKey: "/streaming" }, estado)).toEqual({
      error: null,
      resetKey: "/streaming",
    });
  });

  it("conserva el error si sigue en la misma pantalla", () => {
    const estado = { error: new Error("x"), resetKey: "/branding" };

    expect(ErrorBoundary.getDerivedStateFromProps({ children: null, resetKey: "/branding" }, estado)).toBeNull();
  });
});
