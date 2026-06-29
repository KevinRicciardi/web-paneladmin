import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#1976d2', // 👈 color principal del panel (cambialo cuando quieras)
    },
    secondary: {
      main: '#9c27b0', // 👈 color secundario
    },
    background: {
      default: '#f5f6f8',
    },
  },
  typography: {
    fontFamily: 'Roboto, Arial, sans-serif',
  },
  shape: {
    borderRadius: 8,
  },
})

export default theme