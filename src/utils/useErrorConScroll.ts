import { useCallback, useState } from "react";
import { useScrollAlAviso } from "./useScrollAlAviso";

/**
 * Estado de error para un formulario largo: reemplaza a
 * `const [error, setError] = useState("")`. Cada vez que se pone un error
 * (aunque sea el mismo texto), la pantalla se desplaza sola hasta el cartel,
 * que se enlaza con `ref={avisoRef}`. Sin esto, quien aprieta "Guardar" abajo
 * no ve el cartel de arriba y parece que no pasó nada.
 *
 * Se centra en pantalla (y no se pega arriba) para que no lo tape el menú fijo.
 */
export function useErrorConScroll(inicial = "") {
  const [error, setErrorBase] = useState(inicial);
  const [erroresMostrados, setErroresMostrados] = useState(0);

  const setError = useCallback((mensaje: string) => {
    setErrorBase(mensaje);
    if (mensaje) setErroresMostrados((veces) => veces + 1);
  }, []);

  const avisoRef = useScrollAlAviso(erroresMostrados, "center");

  return { error, setError, avisoRef };
}
