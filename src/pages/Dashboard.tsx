import { auth } from "../firebase";
import { signOut } from "firebase/auth";
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Drawer,
  List,
  ListItemButton,
  ListItemText,
  Container,
  Chip,
} from "@mui/material";
import type { Perfil } from "../types";

interface DashboardProps {
  perfil: Perfil;
}

const drawerWidth = 220;

export default function Dashboard({ perfil }: DashboardProps) {
  const handleLogout = async () => {
    await signOut(auth);
  };

  return (
    <Box sx={ { display: "flex" } }>
      <AppBar position="fixed" sx={ { zIndex: (t) => t.zIndex.drawer + 1 } }>
        <Toolbar sx={ { justifyContent: "space-between" } }>
          <Typography variant="h6">Pinnacle Admin</Typography>
          <Button color="inherit" onClick={handleLogout}>
            Cerrar sesión
          </Button>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={ { width: drawerWidth, "& .MuiDrawer-paper": { width: drawerWidth, boxSizing: "border-box" } } }
      >
        <Toolbar />
        <List>
          <ListItemButton><ListItemText primary="Clientes" /></ListItemButton>
          <ListItemButton><ListItemText primary="Noticias" /></ListItemButton>
          <ListItemButton><ListItemText primary="Turnos" /></ListItemButton>
        </List>
      </Drawer>

      <Box component="main" sx={ { flexGrow: 1, p: 3 } }>
        <Toolbar />
        <Container>
          <Typography variant="h4" gutterBottom>Dashboard</Typography>
          <Typography>Bienvenido, {perfil.email}</Typography>
          <Box sx={ { mt: 2, display: "flex", gap: 1 } }>
            <Chip label={`Rol: ${perfil.rol}`} color="primary" />
            <Chip label={`Tenant: ${perfil.tenant?.nombre ?? "-"}`} />
          </Box>
        </Container>
      </Box>
    </Box>
  );
}