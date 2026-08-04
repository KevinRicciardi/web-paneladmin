import { useEffect, useState, type ChangeEvent } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  Popover,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
} from "@mui/material";
import type { DiasSemana, Programa, ProgramaPayload } from "../types";
import {
  listarMiProgramacion,
  crearPrograma,
  actualizarPrograma,
  eliminarPrograma,
} from "../services/schedule.service";

const OPCIONES_DIAS: { value: DiasSemana; label: string }[] = [
  { value: "LUN_VIE", label: "Lunes a Viernes" },
  { value: "SABADOS", label: "Sábados" },
  { value: "DOMINGOS", label: "Domingos" },
  { value: "TODOS", label: "Todos los días" },
  { value: "PERSONALIZADO", label: "Días específicos" },
  { value: "FECHA_ESPECIFICA", label: "Fecha específica" },
];

const DIAS_SEMANA = [
  { value: "LUN", label: "Lun" },
  { value: "MAR", label: "Mar" },
  { value: "MIE", label: "Mié" },
  { value: "JUE", label: "Jue" },
  { value: "VIE", label: "Vie" },
  { value: "SAB", label: "Sáb" },
  { value: "DOM", label: "Dom" },
];

const FORM_VACIO: ProgramaPayload = {
  titulo: "",
  descripcion: "",
  imagenUrl: "",
  dias: "LUN_VIE",
  horaInicio: "09:00",
  horaFin: "12:00",
  orden: 0,
  activo: true,
};

const OPCIONES_HORAS = Array.from({ length: 48 }, (_, index) => {
  const horas = Math.floor(index / 2)
    .toString()
    .padStart(2, "0");
  const minutos = index % 2 === 0 ? "00" : "30";
  return `${horas}:${minutos}`;
});

function etiquetaDias(dias: DiasSemana, seleccionados?: string[] | null) {
  if (dias === "PERSONALIZADO" && seleccionados && seleccionados.length > 0) {
    return seleccionados.map((dia) => DIAS_SEMANA.find((item) => item.value === dia)?.label ?? dia).join(", ");
  }

  if (seleccionados && seleccionados.length > 0 && seleccionados.length < 7) {
    return seleccionados.map((dia) => DIAS_SEMANA.find((item) => item.value === dia)?.label ?? dia).join(", ");
  }

  return OPCIONES_DIAS.find((o) => o.value === dias)?.label ?? dias;
}

function obtenerDiasDesdeSeleccion(seleccionados: string[]): DiasSemana {
  const todos = DIAS_SEMANA.map((item) => item.value);
  const laborales = ["LUN", "MAR", "MIE", "JUE", "VIE"];

  if (seleccionados.length === 0) {
    return "LUN_VIE";
  }

  if (seleccionados.length === 7 || seleccionados.every((dia) => todos.includes(dia))) {
    return "TODOS";
  }

  if (seleccionados.length === 5 && seleccionados.every((dia) => laborales.includes(dia))) {
    return "LUN_VIE";
  }

  if (seleccionados.length === 1 && seleccionados.includes("SAB")) {
    return "SABADOS";
  }

  if (seleccionados.length === 1 && seleccionados.includes("DOM")) {
    return "DOMINGOS";
  }

  return "PERSONALIZADO";
}

function obtenerSeleccionDesdeDias(dias: DiasSemana, personalizados?: string[] | null) {
  if (personalizados && personalizados.length > 0) {
    return personalizados;
  }

  switch (dias) {
    case "SABADOS":
      return ["SAB"];
    case "DOMINGOS":
      return ["DOM"];
    case "TODOS":
      return DIAS_SEMANA.map((item) => item.value);
    case "FECHA_ESPECIFICA":
      return [];
    default:
      return ["LUN", "MAR", "MIE", "JUE", "VIE"];
  }
}

function obtenerDiasParaFechaEspecifica(fechaInicio: string, fechaFin?: string) {
  const inicio = parsearFechaInput(fechaInicio);
  const fin = fechaFin ? parsearFechaInput(fechaFin) : inicio;

  if (!inicio) {
    return { dias: "LUN_VIE" as DiasSemana, personalizados: [] };
  }

  const diasSet = new Set<string>();
  const final = fin ?? inicio;
  let actual = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());

  while (actual <= final) {
    const codigo = obtenerCodigoDia(actual);
    if (codigo) diasSet.add(codigo);
    actual.setDate(actual.getDate() + 1);
  }

  const personalizados = Array.from(diasSet);
  const laborales = ["LUN", "MAR", "MIE", "JUE", "VIE"];
  const tieneLaborales = personalizados.some((dia) => laborales.includes(dia));
  const tieneSab = personalizados.includes("SAB");
  const tieneDom = personalizados.includes("DOM");

  let dias: DiasSemana = "LUN_VIE";

  if (personalizados.length === 1 && tieneSab) {
    dias = "SABADOS";
  } else if (personalizados.length === 1 && tieneDom) {
    dias = "DOMINGOS";
  } else if (!tieneSab && !tieneDom) {
    dias = "LUN_VIE";
  } else if (!tieneLaborales && tieneSab && !tieneDom) {
    dias = "SABADOS";
  } else if (!tieneLaborales && !tieneSab && tieneDom) {
    dias = "DOMINGOS";
  } else if (diasSet.size === DIAS_SEMANA.length) {
    dias = "TODOS";
  } else {
    dias = "PERSONALIZADO";
  }

  return { dias, personalizados };
}

function formatearRangoFechas(fechaInicio?: string | null, fechaFin?: string | null) {
  if (!fechaInicio) {
    return "Sin fechas";
  }

  if (!fechaFin || fechaFin === fechaInicio) {
    return fechaInicio;
  }

  return `${fechaInicio} → ${fechaFin}`;
}

function formatearFechaParaMostrar(fecha?: string | null) {
  if (!fecha) {
    return "";
  }

  const fechaParseada = parsearFechaInput(fecha);
  if (!fechaParseada) {
    return fecha;
  }

  return fechaParseada.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function nombreDiaParaFecha(fecha?: string | null) {
  const fechaParseada = fecha ? parsearFechaInput(fecha) : null;
  if (!fechaParseada) {
    return "";
  }

  return fechaParseada.toLocaleDateString("es-ES", { weekday: "short" });
}

function etiquetaDiaPrograma(programa: Programa) {
  if (programa.fechaInicio) {
    if (programa.fechaFin && programa.fechaFin !== programa.fechaInicio) {
      return `${formatearFechaParaMostrar(programa.fechaInicio)} → ${formatearFechaParaMostrar(programa.fechaFin)}`;
    }

    const fechaMostrada = formatearFechaParaMostrar(programa.fechaInicio);
    const diaMostrado = nombreDiaParaFecha(programa.fechaInicio);
    return diaMostrado ? `${diaMostrado} • ${fechaMostrada}` : fechaMostrada;
  }

  return etiquetaDias(programa.dias, programa.diasPersonalizados);
}

function formatearFechaInput(fecha: Date) {
  const año = fecha.getFullYear();
  const mes = `${fecha.getMonth() + 1}`.padStart(2, "0");
  const dia = `${fecha.getDate()}`.padStart(2, "0");
  return `${año}-${mes}-${dia}`;
}

function parsearFechaInput(valor: string) {
  if (!valor) {
    return null;
  }

  const soloFecha = /^\d{4}-\d{2}-\d{2}$/;
  if (soloFecha.test(valor)) {
    const [año, mes, dia] = valor.split("-");
    const fecha = new Date(Number(año), Number(mes) - 1, Number(dia));
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }

  const fechaISO = new Date(valor);
  return Number.isNaN(fechaISO.getTime()) ? null : fechaISO;
}

function obtenerDiasCalendario(fecha: Date) {
  const año = fecha.getFullYear();
  const mes = fecha.getMonth();
  const primerDia = new Date(año, mes, 1);
  const ultimoDia = new Date(año, mes + 1, 0);
  const primerDiaSemana = (primerDia.getDay() + 6) % 7;
  const totalDias = ultimoDia.getDate();
  const dias: Array<Date | null> = [];

  for (let i = 0; i < primerDiaSemana; i += 1) {
    dias.push(null);
  }

  for (let dia = 1; dia <= totalDias; dia += 1) {
    dias.push(new Date(año, mes, dia));
  }

  while (dias.length % 7 !== 0) {
    dias.push(null);
  }

  return dias;
}

function convertirHoraAMinutos(hora: string) {
  const [horas, minutos] = hora.split(":").map(Number);
  return horas * 60 + minutos;
}

function obtenerCodigoDia(fecha: string | Date | null | undefined) {
  if (!fecha) {
    return null;
  }

  const fechaObj = typeof fecha === "string" ? parsearFechaInput(fecha) : fecha;
  if (!fechaObj) {
    return null;
  }

  const dias = ["DOM", "LUN", "MAR", "MIE", "JUE", "VIE", "SAB"] as const;
  return dias[fechaObj.getDay()];
}

function aplicaProgramaADia(programa: Programa, fechaReferencia: string | null | undefined) {
  const codigoDia = obtenerCodigoDia(fechaReferencia);

  if (!codigoDia) {
    return false;
  }

  if (programa.fechaInicio && programa.fechaFin) {
    const inicio = parsearFechaInput(programa.fechaInicio);
    const fin = parsearFechaInput(programa.fechaFin);
    const referencia = parsearFechaInput(fechaReferencia ?? "");

    if (inicio && fin && referencia) {
      if (referencia < inicio || referencia > fin) {
        return false;
      }
    }
  }

  if (programa.fechaInicio && programa.fechaFin && programa.fechaInicio === programa.fechaFin) {
    return programa.fechaInicio === fechaReferencia;
  }

  const personalizados = programa.diasPersonalizados ?? [];

  switch (programa.dias) {
    case "TODOS":
      return true;
    case "LUN_VIE":
      return ["LUN", "MAR", "MIE", "JUE", "VIE"].includes(codigoDia);
    case "SABADOS":
      return codigoDia === "SAB";
    case "DOMINGOS":
      return codigoDia === "DOM";
    case "PERSONALIZADO":
      return personalizados.includes(codigoDia);
    default:
      return false;
  }
}

function obtenerCodigosDiasParaPrograma(programa: Programa) {
  // Devuelve códigos de días (LUN, MAR...) que cubre el programa.
  const codigos: string[] = [];

  if (programa.fechaInicio) {
    const inicio = parsearFechaInput(programa.fechaInicio);
    const fin = programa.fechaFin ? parsearFechaInput(programa.fechaFin) : inicio;

    if (inicio && fin) {
      // Iterar entre inicio y fin (inclusive) y recoger los códigos de día
      let cur = new Date(inicio.getFullYear(), inicio.getMonth(), inicio.getDate());
      while (cur <= fin) {
        const dias = ["DOM", "LUN", "MAR", "MIE", "JUE", "VIE", "SAB"] as const;
        const code = dias[cur.getDay()];
        if (!codigos.includes(code)) codigos.push(code);
        cur.setDate(cur.getDate() + 1);
      }
      return codigos;
    }
  }

  // Si no tiene fecha específica, derivar de la propiedad dias/diasPersonalizados
  switch (programa.dias) {
    case "TODOS":
      return DIAS_SEMANA.map((d) => d.value);
    case "LUN_VIE":
      return ["LUN", "MAR", "MIE", "JUE", "VIE"];
    case "SABADOS":
      return ["SAB"];
    case "DOMINGOS":
      return ["DOM"];
    case "PERSONALIZADO":
      return programa.diasPersonalizados ?? [];
    default:
      return [];
  }
}

function esHorarioOcupado(programa: Programa, horario: string) {
  const horarioInicio = convertirHoraAMinutos(programa.horaInicio);
  const horarioFin = convertirHoraAMinutos(programa.horaFin);
  const horarioSeleccionado = convertirHoraAMinutos(horario);

  return horarioSeleccionado >= horarioInicio && horarioSeleccionado < horarioFin;
}

export default function Programacion() {
  const [selectorFechaAnchor, setSelectorFechaAnchor] = useState<HTMLElement | null>(null);
  const [selectorFechaTipo, setSelectorFechaTipo] = useState<"inicio" | "fin" | null>(null);
  const [selectorFechaMes, setSelectorFechaMes] = useState<Date>(new Date());

  const [programas, setProgramas] = useState<Programa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [abierto, setAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [form, setForm] = useState<ProgramaPayload>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [diasSeleccionados, setDiasSeleccionados] = useState<string[]>(["LUN", "MAR", "MIE", "JUE", "VIE"]);
  const [modoDias, setModoDias] = useState<DiasSemana>("LUN_VIE");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [imagenPreview, setImagenPreview] = useState<string | null>(null);
  const [modoFecha, setModoFecha] = useState<"NINGUNO" | "ESPECIFICA" | "RANGO">("NINGUNO");

  const abrirSelectorFecha = (tipo: "inicio" | "fin", elemento?: HTMLElement | null) => {
    const valor = tipo === "inicio" ? fechaInicio : fechaFin;
    const fechaBase = parsearFechaInput(valor) ?? new Date();

    setSelectorFechaTipo(tipo);
    setSelectorFechaAnchor(elemento ?? null);
    setSelectorFechaMes(fechaBase);
  };

  const manejarClickFecha = (tipo: "inicio" | "fin", event: React.MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.stopPropagation();
    // No abrir calendario si no se eligió modo de fecha
    if (modoFecha === "NINGUNO") return;
    // Si estamos en modo especifica, no permitir abrir "fin"
    if (modoFecha === "ESPECIFICA" && tipo === "fin") return;

    abrirSelectorFecha(tipo, event.currentTarget as HTMLElement);
  };

  const cerrarSelectorFecha = () => {
    setSelectorFechaAnchor(null);
    setSelectorFechaTipo(null);
  };

  const cambiarMesSelector = (delta: number) => {
    setSelectorFechaMes((actual) => new Date(actual.getFullYear(), actual.getMonth() + delta, 1));
  };

  const seleccionarFecha = (dia: Date) => {
    const valor = formatearFechaInput(dia);

    if (selectorFechaTipo === "inicio") {
      setFechaInicio(valor);
    } else if (selectorFechaTipo === "fin") {
      setFechaFin(valor);
    }

    cerrarSelectorFecha();
  };

  const cargar = async () => {
    try {
      setCargando(true);
      setError(null);
      setProgramas(await listarMiProgramacion());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al cargar");
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    let active = true;

    const cargarProgramacion = async () => {
      try {
        setCargando(true);
        setError(null);

        const data = await listarMiProgramacion();
        if (!active) return;

        setProgramas(data);
      } catch (e) {
        if (!active) return;
        setError(e instanceof Error ? e.message : "Error al cargar");
      } finally {
        if (active) setCargando(false);
      }
    };

    void cargarProgramacion();
    return () => {
      active = false;
    };
  }, []);

  const abrirNuevo = () => {
    setEditandoId(null);
    setForm({ ...FORM_VACIO });
    setDiasSeleccionados(["LUN", "MAR", "MIE", "JUE", "VIE"]);
    setModoDias("LUN_VIE");
    setFechaInicio("");
    setFechaFin("");
    setImagenPreview(null);
    setModoFecha("NINGUNO");
    setAbierto(true);
  };

  const abrirEdicion = (p: Programa) => {
    setEditandoId(p.id);
    setForm({
      titulo: p.titulo,
      descripcion: p.descripcion ?? "",
      imagenUrl: p.imagenUrl ?? "",
      dias: p.dias,
      horaInicio: p.horaInicio,
      horaFin: p.horaFin,
      orden: p.orden,
      activo: p.activo,
    });
    const esFechaEspecifica = Boolean(p.fechaInicio && (!p.diasPersonalizados || p.diasPersonalizados.length === 0));
    setDiasSeleccionados(obtenerSeleccionDesdeDias(p.dias, p.diasPersonalizados));
    setModoDias(esFechaEspecifica ? "FECHA_ESPECIFICA" : p.dias);
    setFechaInicio(p.fechaInicio ?? "");
    setFechaFin(p.fechaFin ?? "");
    setImagenPreview(p.imagenUrl ?? null);
    // Determinar modoFecha según los valores guardados
    if (p.fechaInicio) {
      if (p.fechaFin && p.fechaFin !== p.fechaInicio) {
        setModoFecha("RANGO");
      } else {
        setModoFecha("ESPECIFICA");
      }
    } else {
      setModoFecha("NINGUNO");
    }
    setAbierto(true);
  };

  const alternarDia = (dia: string) => {
    setModoDias("PERSONALIZADO");
    setDiasSeleccionados((actual) =>
      actual.includes(dia) ? actual.filter((item) => item !== dia) : [...actual, dia],
    );
  };

  const cambiarModoDias = (nuevoModo: DiasSemana) => {
    setModoDias(nuevoModo);

    if (nuevoModo === "LUN_VIE") {
      setDiasSeleccionados(["LUN", "MAR", "MIE", "JUE", "VIE"]);
      setModoFecha("NINGUNO");
      setFechaInicio("");
      setFechaFin("");
    } else if (nuevoModo === "SABADOS") {
      setDiasSeleccionados(["SAB"]);
      setModoFecha("NINGUNO");
      setFechaInicio("");
      setFechaFin("");
    } else if (nuevoModo === "DOMINGOS") {
      setDiasSeleccionados(["DOM"]);
      setModoFecha("NINGUNO");
      setFechaInicio("");
      setFechaFin("");
    } else if (nuevoModo === "TODOS") {
      setDiasSeleccionados(DIAS_SEMANA.map((dia) => dia.value));
      setModoFecha("NINGUNO");
      setFechaInicio("");
      setFechaFin("");
    } else if (nuevoModo === "PERSONALIZADO") {
      setDiasSeleccionados([]);
      setModoFecha("NINGUNO");
      setFechaInicio("");
      setFechaFin("");
    } else {
      setDiasSeleccionados([]);
      setModoFecha("ESPECIFICA");
      if (!fechaInicio) {
        setFechaInicio(formatearFechaInput(new Date()));
      }
    }
  };

  const manejarArchivo = (event: ChangeEvent<HTMLInputElement>) => {
    const archivo = event.target.files?.[0];

    if (!archivo) {
      return;
    }

    const lector = new FileReader();
    lector.onload = () => {
      const resultado = typeof lector.result === "string" ? lector.result : "";
      setForm((actual) => ({ ...actual, imagenUrl: resultado }));
      setImagenPreview(resultado);
    };

    lector.readAsDataURL(archivo);
  };

  const guardar = async () => {
    try {
      setGuardando(true);
      setError(null);

      let inicioGuardado = fechaInicio;
      let finGuardado = fechaFin;

      if (modoFecha === "RANGO" && fechaInicio && fechaFin && fechaFin < fechaInicio) {
        inicioGuardado = fechaFin;
        finGuardado = fechaInicio;
      }

      const fechaFinPayload = modoFecha === "RANGO" && finGuardado && finGuardado !== inicioGuardado ? finGuardado : undefined;
      const fechaInicioPayload = inicioGuardado || undefined;

      const fechaEspecifica = modoDias === "FECHA_ESPECIFICA" ? obtenerDiasParaFechaEspecifica(fechaInicioPayload ?? "", fechaFinPayload) : null;
      const payload: ProgramaPayload = {
        ...form,
        dias: fechaEspecifica ? fechaEspecifica.dias : modoDias === "PERSONALIZADO" ? obtenerDiasDesdeSeleccion(diasSeleccionados) : modoDias,
        diasPersonalizados: fechaEspecifica ? fechaEspecifica.personalizados : modoDias === "PERSONALIZADO" ? diasSeleccionados : [],
        fechaInicio: fechaInicioPayload,
        fechaFin: fechaFinPayload,
        imagenUrl: form.imagenUrl || undefined,
      };

      if (editandoId === null) {
        await crearPrograma(payload);
      } else {
        await actualizarPrograma(editandoId, payload);
      }

      await cargar();
      setAbierto(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al guardar");
    } finally {
      setGuardando(false);
    }
  };

  const borrar = async (p: Programa) => {
    if (!confirm(`¿Eliminar "${p.titulo}"?`)) return;

    try {
      await eliminarPrograma(p.id);
      await cargar();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error al eliminar");
    }
  };

  const pickerFieldSx = {
    '& .MuiOutlinedInput-root': {
      bgcolor: '#111111',
      color: '#ffffff',
      borderRadius: 1.5,
      border: '1px solid rgba(255,255,255,0.12)',
      transition: 'all 180ms ease',
      '&:hover': {
        borderColor: 'rgba(255,255,255,0.24)',
      },
      '&.Mui-focused': {
        borderColor: '#ffffff',
      },
    },
    '& .MuiOutlinedInput-input': {
      color: '#ffffff',
      cursor: 'pointer',
      WebkitTextFillColor: '#ffffff',
      backgroundColor: '#111111',
    },
    '& .MuiOutlinedInput-notchedOutline': {
      borderColor: 'transparent',
    },
    '& .MuiInputLabel-root': {
      color: '#cccccc',
      '&.Mui-focused': {
        color: '#ffffff',
      },
    },
  };

  const fechaReferencia = modoFecha === "NINGUNO" ? null : (fechaInicio || fechaFin || null);
  const horariosOcupados = programas.filter((programa) => {
    if (modoFecha !== "NINGUNO") {
      return aplicaProgramaADia(programa, fechaReferencia);
    }

    const codigos = obtenerCodigosDiasParaPrograma(programa);
    return codigos.some((c) => diasSeleccionados.includes(c));
  });

  const calendarioDisabled = modoFecha === "NINGUNO";

  

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" sx={{ fontWeight: 700 }}>
        Programación
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Gestiona la grilla de contenidos de tu señal.
      </Typography>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 2 }}>
          <Typography variant="h6">Grilla Semanal</Typography>
          <Button variant="contained" onClick={abrirNuevo}>
            + Agregar
          </Button>
        </Box>

        {cargando ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress />
          </Box>
        ) : programas.length === 0 ? (
          <Typography color="text.secondary" sx={{ py: 4 }} align="center">
            Todavía no cargaste programación.
          </Typography>
        ) : (
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>DÍA</TableCell>
                <TableCell>HORARIO</TableCell>
                <TableCell>EVENTO</TableCell>
                <TableCell align="right">ACCIONES</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {programas.map((p) => (
                <TableRow key={p.id} sx={{ opacity: p.activo ? 1 : 0.5 }}>
                  <TableCell>{etiquetaDiaPrograma(p)}</TableCell>
                  <TableCell sx={{ fontFamily: "monospace" }}>
                    {p.horaInicio} — {p.horaFin}
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                      {p.imagenUrl && (
                        <Box
                          sx={{ width: 48, height: 48, borderRadius: 1, overflow: "hidden", border: "1px solid", borderColor: "divider", flexShrink: 0 }}
                        >
                          <Box component="img" src={p.imagenUrl} alt={p.titulo} sx={{ width: "100%", height: "100%", objectFit: "cover" }} />
                        </Box>
                      )}
                      <Box>
                        <Typography sx={{ fontWeight: 600, fontStyle: p.activo ? "normal" : "italic" }}>
                          {p.titulo}
                        </Typography>
                        {p.descripcion && (
                          <Typography variant="caption" color="text.secondary">
                            {p.descripcion}
                          </Typography>
                        )}
                        {p.fechaInicio && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
                            {formatearRangoFechas(p.fechaInicio, p.fechaFin)}
                          </Typography>
                        )}
                      </Box>
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Button size="small" onClick={() => abrirEdicion(p)}>
                      Editar
                    </Button>
                    <Button size="small" color="error" onClick={() => borrar(p)}>
                      Eliminar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Paper>

      <Dialog
        open={abierto}
        onClose={() => setAbierto(false)}
        fullWidth
        maxWidth="md"
        slotProps={{ paper: { sx: { bgcolor: "#000000", color: "#ffffff", border: "1px solid #2a2a2a" } } }}
      >
        <DialogTitle sx={{ color: "#ffffff", bgcolor: "#000000", borderBottom: "1px solid #2a2a2a" }}>
          {editandoId === null ? "Nuevo programa" : "Editar programa"}
        </DialogTitle>
        <DialogContent sx={{ bgcolor: "#000000", color: "#ffffff" }}>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {error && (
              <Alert severity="error" onClose={() => setError(null)}>
                {error}
              </Alert>
            )}
            <TextField
              label="Título"
              value={form.titulo}
              onChange={(e) => setForm({ ...form, titulo: e.target.value })}
              fullWidth
              required
            />
            <TextField
              label="Descripción"
              value={form.descripcion}
              onChange={(e) => setForm({ ...form, descripcion: e.target.value })}
              fullWidth
              multiline
              rows={2}
            />

            <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Imagen del evento
              </Typography>
              <Stack spacing={1.5}>
                <Button component="label" variant="outlined" sx={{ alignSelf: "flex-start" }}>
                  Adjuntar imagen
                  <input hidden accept="image/*" type="file" onChange={manejarArchivo} />
                </Button>
                <TextField
                  label="o pegar URL"
                  value={form.imagenUrl}
                  onChange={(e) => setForm({ ...form, imagenUrl: e.target.value })}
                  fullWidth
                />
                {imagenPreview && (
                  <Box sx={{ borderRadius: 2, overflow: "hidden", border: "1px solid", borderColor: "divider", maxWidth: 220 }}>
                    <Box component="img" src={imagenPreview} alt="Vista previa" sx={{ width: "100%", display: "block", objectFit: "cover", maxHeight: 140 }} />
                  </Box>
                )}
              </Stack>
            </Box>

            <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Días de la semana
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: "block" }}>
                Elige si el programa se repite por semana, por días específicos o todos los días.
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1, mb: 2 }}>
                {OPCIONES_DIAS.map((opcion) => (
                  <Button
                    key={opcion.value}
                    size="small"
                    onClick={() => cambiarModoDias(opcion.value)}
                    sx={{
                      minWidth: 96,
                      borderRadius: 999,
                      border: modoDias === opcion.value ? "1px solid #ffffff" : "1px solid rgba(255,255,255,0.2)",
                      bgcolor: modoDias === opcion.value ? "#ffffff" : "transparent",
                      color: modoDias === opcion.value ? "#000000" : "#ffffff",
                      fontWeight: 700,
                      px: 1.25,
                      '&:hover': {
                        bgcolor: modoDias === opcion.value ? "#f5f5f5" : "rgba(255,255,255,0.08)",
                      },
                    }}
                  >
                    {opcion.label}
                  </Button>
                ))}
              </Stack>
              {modoDias === "PERSONALIZADO" && (
                <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
                  {DIAS_SEMANA.map((dia) => {
                    const activo = diasSeleccionados.includes(dia.value);
                    return (
                      <Button
                        key={dia.value}
                        size="small"
                        onClick={() => alternarDia(dia.value)}
                        aria-pressed={activo}
                        sx={{
                          minWidth: 68,
                          borderRadius: 999,
                          border: activo ? "1px solid #ffffff" : "1px solid rgba(255,255,255,0.2)",
                          bgcolor: activo ? "#ffffff" : "transparent",
                          color: activo ? "#000000" : "#ffffff",
                          fontWeight: 700,
                          px: 1.25,
                          '&:hover': {
                            bgcolor: activo ? "#f5f5f5" : "rgba(255,255,255,0.08)",
                          },
                        }}
                      >
                        {dia.label}
                      </Button>
                    );
                  })}
                </Stack>
              )}

              {/* Se eliminó el botón duplicado de "Fecha específica" aquí. */}
            </Box>

            <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Calendario del evento
              </Typography>
              <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                <Button
                  size="small"
                  disabled={calendarioDisabled}
                  onClick={() => {
                    if (calendarioDisabled) return;
                    // Al activar desde el calendario, seleccionar la opción principal Fecha específica
                    setModoDias("FECHA_ESPECIFICA");
                    setDiasSeleccionados([]);
                    setModoFecha("ESPECIFICA");
                    if (!fechaInicio) setFechaInicio(formatearFechaInput(new Date()));
                  }}
                  sx={{
                    borderRadius: 999,
                    border: modoFecha === "ESPECIFICA" ? "1px solid #ffffff" : "1px solid rgba(255,255,255,0.12)",
                    bgcolor: modoFecha === "ESPECIFICA" ? "#ffffff" : "transparent",
                    color: modoFecha === "ESPECIFICA" ? "#000000" : "#ffffff",
                  }}
                >
                  Fecha específica
                </Button>
                <Button
                  size="small"
                  disabled={calendarioDisabled}
                  onClick={() => {
                    if (calendarioDisabled) return;
                    // Rango de fechas también implica que trabajamos sobre Fecha específica
                    setModoDias("FECHA_ESPECIFICA");
                    setDiasSeleccionados([]);
                    setModoFecha("RANGO");
                    if (!fechaInicio) setFechaInicio(formatearFechaInput(new Date()));
                    if (!fechaFin) setFechaFin(formatearFechaInput(new Date()));
                  }}
                  sx={{
                    borderRadius: 999,
                    border: modoFecha === "RANGO" ? "1px solid #ffffff" : "1px solid rgba(255,255,255,0.12)",
                    bgcolor: modoFecha === "RANGO" ? "#ffffff" : "transparent",
                    color: modoFecha === "RANGO" ? "#000000" : "#ffffff",
                  }}
                >
                  Rango de fechas
                </Button>
              </Stack>
              {calendarioDisabled && (
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1.5, display: 'block' }}>
                  Activa "Fecha específica" en la sección "Días de la semana" para habilitar estas opciones.
                </Typography>
              )}

              <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mt: 1 }}>
                <TextField
                  key={`fecha-inicio-${fechaInicio || "empty"}`}
                  label="Fecha de inicio"
                  type="date"
                  value={fechaInicio || ""}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  fullWidth
                  disabled={modoFecha === "NINGUNO"}
                  slotProps={{
                    input: {
                      onClick: (event) => manejarClickFecha("inicio", event),
                      readOnly: true,
                    },
                    inputLabel: { shrink: true },
                  }}
                  sx={pickerFieldSx}
                />
                <TextField
                  key={`fecha-fin-${fechaFin || "empty"}`}
                  label="Fecha de fin"
                  type="date"
                  value={fechaFin || ""}
                  onChange={(e) => setFechaFin(e.target.value)}
                  fullWidth
                  disabled={modoFecha !== "RANGO"}
                  slotProps={{
                    input: {
                      onClick: (event) => manejarClickFecha("fin", event),
                      readOnly: true,
                    },
                    inputLabel: { shrink: true },
                  }}
                  sx={pickerFieldSx}
                />
              </Stack>

              <Popover
                open={Boolean(selectorFechaAnchor && selectorFechaTipo)}
                anchorEl={selectorFechaAnchor}
                onClose={cerrarSelectorFecha}
                anchorOrigin={{ vertical: "bottom", horizontal: "left" }}
                transformOrigin={{ vertical: "top", horizontal: "left" }}
                slotProps={{
                  paper: {
                    sx: {
                      mt: 1,
                      bgcolor: "#0b0b0b",
                      color: "#ffffff",
                      border: "1px solid rgba(255,255,255,0.12)",
                      borderRadius: 2,
                      boxShadow: "0 16px 40px rgba(0,0,0,0.45)",
                      p: 1.5,
                    },
                  },
                }}
              >
                <Stack spacing={1.2}>
                  <Stack direction="row" sx={{ alignItems: "center", justifyContent: "space-between" }}>
                    <Button size="small" onClick={() => cambiarMesSelector(-1)} sx={{ minWidth: 32, color: "#ffffff" }}>
                      ‹
                    </Button>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                      {selectorFechaMes.toLocaleDateString("es-ES", { month: "long", year: "numeric" })}
                    </Typography>
                    <Button size="small" onClick={() => cambiarMesSelector(1)} sx={{ minWidth: 32, color: "#ffffff" }}>
                      ›
                    </Button>
                  </Stack>

                  <Box sx={{ display: "grid", gridTemplateColumns: "repeat(7, 32px)", gap: 0.75 }}>
                    {['L', 'M', 'X', 'J', 'V', 'S', 'D'].map((dia) => (
                      <Typography key={dia} variant="caption" sx={{ textAlign: "center", color: "#bdbdbd" }}>
                        {dia}
                      </Typography>
                    ))}
                    {obtenerDiasCalendario(selectorFechaMes).map((dia, index) => {
                      if (!dia) {
                        return <Box key={`empty-${index}`} sx={{ width: 32, height: 32 }} />;
                      }

                      const seleccionado =
                        selectorFechaTipo === "inicio"
                          ? formatearFechaInput(dia) === fechaInicio
                          : formatearFechaInput(dia) === fechaFin;

                      const esHoy = formatearFechaInput(dia) === formatearFechaInput(new Date());

                      return (
                        <Button
                          key={dia.toISOString()}
                          size="small"
                          onClick={() => seleccionarFecha(dia)}
                          sx={{
                            minWidth: 32,
                            width: 32,
                            height: 32,
                            borderRadius: "50%",
                            color: seleccionado ? "#000000" : "#ffffff",
                            bgcolor: seleccionado ? "#ffffff" : "transparent",
                            border: esHoy && !seleccionado ? "1px solid rgba(255,255,255,0.28)" : "none",
                            p: 0,
                            '&:hover': {
                              bgcolor: seleccionado ? "#ffffff" : "rgba(255,255,255,0.12)",
                            },
                          }}
                        >
                          {dia.getDate()}
                        </Button>
                      );
                    })}
                  </Box>
                </Stack>
              </Popover>
            </Box>

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <FormControl fullWidth>
                <InputLabel id="hora-inicio-label">Hora inicio</InputLabel>
                <Select
                  labelId="hora-inicio-label"
                  value={form.horaInicio}
                  label="Hora inicio"
                  onChange={(e) => setForm({ ...form, horaInicio: e.target.value })}
                  sx={pickerFieldSx}
                  MenuProps={{
                    slotProps: {
                      paper: {
                        sx: {
                          bgcolor: "#0b0b0b",
                          color: "#ffffff",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: 2,
                        },
                      },
                    },
                  }}
                >
                  {OPCIONES_HORAS.map((hora) => {
                    const ocupado = horariosOcupados.some((programa) => esHorarioOcupado(programa, hora));

                    return (
                      <MenuItem key={hora} value={hora} sx={{ color: ocupado ? "#ff6b6b" : "inherit" }}>
                        {hora}
                        {ocupado ? " • Ocupado" : ""}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>

              <FormControl fullWidth>
                <InputLabel id="hora-fin-label">Hora fin</InputLabel>
                <Select
                  labelId="hora-fin-label"
                  value={form.horaFin}
                  label="Hora fin"
                  onChange={(e) => setForm({ ...form, horaFin: e.target.value })}
                  sx={pickerFieldSx}
                  MenuProps={{
                    slotProps: {
                      paper: {
                        sx: {
                          bgcolor: "#0b0b0b",
                          color: "#ffffff",
                          border: "1px solid rgba(255,255,255,0.12)",
                          borderRadius: 2,
                        },
                      },
                    },
                  }}
                >
                  {OPCIONES_HORAS.map((hora) => {
                    const ocupado = horariosOcupados.some((programa) => esHorarioOcupado(programa, hora));

                    return (
                      <MenuItem key={hora} value={hora} sx={{ color: ocupado ? "#ff6b6b" : "inherit" }}>
                        {hora}
                        {ocupado ? " • Ocupado" : ""}
                      </MenuItem>
                    );
                  })}
                </Select>
              </FormControl>
            </Stack>
            <TextField
              label="Orden"
              type="number"
              value={form.orden}
              onChange={(e) => setForm({ ...form, orden: Number(e.target.value) })}
              fullWidth
            />
            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
              <Switch
                checked={form.activo ?? true}
                onChange={(e) => setForm({ ...form, activo: e.target.checked })}
              />
              <Typography variant="body2">Activo</Typography>
            </Box>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ bgcolor: "#000000", color: "#ffffff" }}>
          <Button onClick={() => setAbierto(false)}>Cancelar</Button>
          <Button variant="contained" onClick={guardar} disabled={guardando}>
            {guardando ? "Guardando..." : "Guardar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}