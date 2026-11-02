import { useEffect, useRef } from "react";

/**
 * Cuando un formulario largo vive dentro de una ventana (modal) y el cartel de
 * error está arriba, quien apretó "Guardar" abajo no lo ve y parece que no pasó
 * nada. Este hook devuelve una referencia para ponerle al cartel: cada vez que
 * [vez] sube, la ventana se desplaza sola hasta él.
 *
 * Se usa un contador y no el texto del error porque el mismo error puede
 * repetirse (apretar Guardar dos veces seguidas) y el texto no cambia.
 */
export function useScrollAlAviso<T extends HTMLElement = HTMLDivElement>(
  vez: number,
  block: ScrollLogicalPosition = "start",
) {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (vez > 0) {
      ref.current?.scrollIntoView({ behavior: "smooth", block });
    }
    // block es fijo para cada pantalla: solo cuenta el contador de avisos.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vez]);

  return ref;
}
