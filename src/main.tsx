import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ThemeProvider, CssBaseline, createTheme } from "@mui/material";
import App from "./App.tsx";

const theme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#e2e2e2",
      contrastText: "#111",
    },
    background: {
      default: "#0f0f0f",
      paper: "#161616",
    },
    divider: "#2b2b2b",
    error: { main: "#ef4444" },
    success: { main: "#16a34a" },
    text: {
      primary: "#e6e6e6",
      secondary: "#9ca3af",
    },
  },
  typography: {
    fontFamily: ['Geist', 'Inter', 'Roboto', 'Helvetica', 'Arial', 'sans-serif'].join(','),
    fontWeightBold: 700,
    button: { textTransform: 'none' },
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          backgroundColor: '#161616',
          borderColor: '#2b2b2b',
        },
      },
    },
    MuiButton: {
      styleOverrides: {
        contained: { boxShadow: 'none' },
      },
    },
    
  },
});

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <App />
    </ThemeProvider>
  </StrictMode>
);