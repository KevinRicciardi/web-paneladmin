import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";
import { Alert, Box, Button, Typography } from "@mui/material";

type Props = {
  children: ReactNode;
  /** Cuando cambia (por ejemplo la ruta actual), se vuelve a intentar mostrar el contenido. */
  resetKey?: string;
};

type State = { error: Error | null; resetKey?: string };

/// Atrapa los errores de render de los hijos: sin esto, una excepción en
/// cualquier pantalla (por ejemplo un valor inesperado en Branding) deja
/// TODA la aplicación en blanco y hay que recargar a mano.
export default class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null, resetKey: this.props.resetKey };

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { error };
  }

  static getDerivedStateFromProps(props: Props, state: State): Partial<State> | null {
    // Navegar a otra sección limpia el error de la anterior.
    if (props.resetKey !== state.resetKey) {
      return { error: null, resetKey: props.resetKey };
    }
    return null;
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Error de render capturado:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <Box sx={{ p: 4, maxWidth: 560, mx: "auto", mt: 6 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1.5 }}>
          Algo salió mal en esta pantalla
        </Typography>
        <Alert severity="error" sx={{ mb: 2 }}>
          Ocurrió un error inesperado. Tus datos guardados no se tocaron.
        </Alert>
        <Box sx={{ display: "flex", gap: 1.5, flexWrap: "wrap" }}>
          <Button variant="contained" onClick={() => this.setState({ error: null })}>
            Reintentar
          </Button>
          <Button variant="outlined" onClick={() => window.location.assign("/")}>
            Volver al inicio
          </Button>
        </Box>
      </Box>
    );
  }
}
