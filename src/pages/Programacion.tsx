import { useEffect, useState, type ChangeEvent } from "react";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Paper,
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

function etiquetaDias(dias: DiasSemana, seleccionados?: string[] | null) {
  if (seleccionados && seleccionados.length > 0) {
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
    default:
      return ["LUN", "MAR", "MIE", "JUE", "VIE"];
  }
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

export default function Programacion() {
  const [programas, setProgramas] = useState<Programa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [abierto, setAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [form, setForm] = useState<ProgramaPayload>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);
  const [diasSeleccionados, setDiasSeleccionados] = useState<string[]>(["LUN", "MAR", "MIE", "JUE", "VIE"]);
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [eventoVariosDias, setEventoVariosDias] = useState(false);
  const [imagenPreview, setImagenPreview] = useState<string | null>(null);

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
    setFechaInicio("");
    setFechaFin("");
    setEventoVariosDias(false);
    setImagenPreview(null);
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
    setDiasSeleccionados(obtenerSeleccionDesdeDias(p.dias, p.diasPersonalizados));
    setFechaInicio(p.fechaInicio ?? "");
    setFechaFin(p.fechaFin ?? "");
    setEventoVariosDias(Boolean(p.fechaFin && p.fechaFin !== p.fechaInicio));
    setImagenPreview(p.imagenUrl ?? null);
    setAbierto(true);
  };

  const alternarDia = (dia: string) => {
    setDiasSeleccionados((actual) =>
      actual.includes(dia) ? actual.filter((item) => item !== dia) : [...actual, dia],
    );
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

      const payload: ProgramaPayload = {
        ...form,
        dias: obtenerDiasDesdeSeleccion(diasSeleccionados),
        diasPersonalizados: diasSeleccionados,
        fechaInicio: fechaInicio || undefined,
        fechaFin: eventoVariosDias ? fechaFin || undefined : fechaInicio || undefined,
        imagenUrl: form.imagenUrl || undefined,
      };

      if (editandoId === null) {
        await crearPrograma(payload);
      } else {
        await actualizarPrograma(editandoId, payload);
      }

      setAbierto(false);
      await cargar();
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
                  <TableCell>{etiquetaDias(p.dias, p.diasPersonalizados)}</TableCell>
                  <TableCell sx={{ fontFamily: "monospace" }}>
                    {p.horaInicio} — {p.horaFin}
                  </TableCell>
                  <TableCell>
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

      <Dialog open={abierto} onClose={() => setAbierto(false)} fullWidth maxWidth="md">
        <DialogTitle>
          {editandoId === null ? "Nuevo programa" : "Editar programa"}
        </DialogTitle>
        <DialogContent>
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
                Selecciona los días que quieras.
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", rowGap: 1 }}>
                {DIAS_SEMANA.map((dia) => {
                  const activo = diasSeleccionados.includes(dia.value);
                  return (
                    <Button
                      key={dia.value}
                      size="small"
                      variant={activo ? "contained" : "outlined"}
                      onClick={() => alternarDia(dia.value)}
                      sx={{ minWidth: 68, borderRadius: 999 }}
                    >
                      {dia.label}
                    </Button>
                  );
                })}
              </Stack>
            </Box>

            <Box sx={{ border: "1px solid", borderColor: "divider", borderRadius: 2, p: 2 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
                Calendario del evento
              </Typography>
              <FormControlLabel
                control={<Switch checked={eventoVariosDias} onChange={(e) => setEventoVariosDias(e.target.checked)} />}
                label="Este evento dura varios días"
              />
              <Stack direction={{ xs: "column", md: "row" }} spacing={2} sx={{ mt: 1 }}>
                <TextField
                  label="Fecha de inicio"
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  fullWidth
                  slotProps={{ inputLabel: { shrink: true } }}
                />
                <TextField
                  label="Fecha de fin"
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  fullWidth
                  disabled={!eventoVariosDias}
                  slotProps={{ inputLabel: { shrink: true } }}
                />
              </Stack>
            </Box>

            <Stack direction={{ xs: "column", md: "row" }} spacing={2}>
              <TextField
                label="Hora inicio"
                type="time"
                value={form.horaInicio}
                onChange={(e) => setForm({ ...form, horaInicio: e.target.value })}
                fullWidth
                sx={{ "& .MuiInputBase-input": { fontFamily: "monospace", fontSize: 13 } }}
              />
              <TextField
                label="Hora fin"
                type="time"
                value={form.horaFin}
                onChange={(e) => setForm({ ...form, horaFin: e.target.value })}
                fullWidth
                sx={{ "& .MuiInputBase-input": { fontFamily: "monospace", fontSize: 13 } }}
              />
            </Stack>
            <TextField
              label="Orden"
              type="number"
              value={form.orden}
              onChange={(e) => setForm({ ...form, orden: Number(e.target.value) })}
              fullWidth
            />
            <FormControlLabel
              control={
                <Switch
                  checked={form.activo ?? true}
                  onChange={(e) => setForm({ ...form, activo: e.target.checked })}
                />
              }
              label="Activo"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAbierto(false)}>Cancelar</Button>
          <Button variant="contained" onClick={guardar} disabled={guardando}>
            {guardando ? "Guardando..." : "Guardar"}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}