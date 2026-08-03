import { useEffect, useState } from "react";
import {
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  Paper,
  Stack,
  Switch,
  FormControlLabel,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Typography,
  Alert,
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

function etiquetaDias(dias: DiasSemana) {
  return OPCIONES_DIAS.find((o) => o.value === dias)?.label ?? dias;
}

export default function Programacion() {
  const [programas, setProgramas] = useState<Programa[]>([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [abierto, setAbierto] = useState(false);
  const [editandoId, setEditandoId] = useState<number | null>(null);
  const [form, setForm] = useState<ProgramaPayload>(FORM_VACIO);
  const [guardando, setGuardando] = useState(false);

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
    setForm(FORM_VACIO);
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
    setAbierto(true);
  };

  const guardar = async () => {
    try {
      setGuardando(true);
      setError(null);

      if (editandoId === null) {
        await crearPrograma(form);
      } else {
        await actualizarPrograma(editandoId, form);
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
      <Typography variant="h4" fontWeight={700}>
        Programación
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Gestiona la grilla de contenidos de tu señal.
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
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
                <TableCell>PROGRAMA</TableCell>
                <TableCell align="right">ACCIONES</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {programas.map((p) => (
                <TableRow key={p.id} sx={{ opacity: p.activo ? 1 : 0.5 }}>
                  <TableCell>{etiquetaDias(p.dias)}</TableCell>
                  <TableCell sx={{ fontFamily: "monospace" }}>
                    {p.horaInicio} — {p.horaFin}
                  </TableCell>
                  <TableCell>
                    <Typography
                      fontWeight={600}
                      fontStyle={p.activo ? "normal" : "italic"}
                    >
                      {p.titulo}
                    </Typography>
                    {p.descripcion && (
                      <Typography variant="caption" color="text.secondary">
                        {p.descripcion}
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

      <Dialog open={abierto} onClose={() => setAbierto(false)} fullWidth maxWidth="sm">
        <DialogTitle>
          {editandoId === null ? "Nuevo programa" : "Editar programa"}
        </DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
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
            <TextField
              label="Imagen (URL)"
              value={form.imagenUrl}
              onChange={(e) => setForm({ ...form, imagenUrl: e.target.value })}
              fullWidth
            />
            <TextField
              select
              label="Días"
              value={form.dias}
              onChange={(e) =>
                setForm({ ...form, dias: e.target.value as DiasSemana })
              }
              fullWidth
            >
              {OPCIONES_DIAS.map((o) => (
                <MenuItem key={o.value} value={o.value}>
                  {o.label}
                </MenuItem>
              ))}
            </TextField>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Hora inicio"
                type="time"
                value={form.horaInicio}
                onChange={(e) => setForm({ ...form, horaInicio: e.target.value })}
                fullWidth
                sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: 13 } }}
              />
              <TextField
                label="Hora fin"
                type="time"
                value={form.horaFin}
                onChange={(e) => setForm({ ...form, horaFin: e.target.value })}
                fullWidth
                sx={{ '& .MuiInputBase-input': { fontFamily: 'monospace', fontSize: 13 } }}
              />
            </Stack>
            <TextField
              label="Orden"
              type="number"
              value={form.orden}
              onChange={(e) =>
                setForm({ ...form, orden: Number(e.target.value) })
              }
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