import {
  AppBar, Box, Button, Divider, Drawer, List,
  ListItemButton, ListItemText, Toolbar, Typography,
} from "@mui/material";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import type { Perfil } from "../types";

const drawerWidth = 240;

const navItems = [
  { to: "/", label: "📊 Dashboard" },
  { to: "/branding", label: "🎨 Branding" },
  { to: "/streaming", label: "📺 Streaming" },
  { to: "/programacion", label: "🗓️ Programación" },
  { to: "/noticias", label: "📰 Noticias" },
];

export default function Layout({ perfil }: { perfil: Perfil }) {
  const navigate = useNavigate();
  const location = useLocation();
  const nombreCliente = perfil.tenant?.nombre ?? perfil.tenant?.slug ?? "Cliente";

  return (
    <Box sx={ { display: "flex" } }>
      <AppBar position="fixed" sx={ { zIndex: (theme) => theme.zIndex.drawer + 1 } }>
        <Toolbar>
          <Typography variant="h6" sx={ { flexGrow: 1 } }>
            Panel Admin — {nombreCliente}
          </Typography>
          <Typography variant="body2" sx={ { mr: 2 } }>
            {perfil.email} · {perfil.rol}
          </Typography>
          <Button color="inherit" onClick={() => signOut(auth)}>
            Salir
          </Button>
        </Toolbar>
      </AppBar>

      <Drawer
        variant="permanent"
        sx={ {
          width: drawerWidth,
          flexShrink: 0,
          ["& .MuiDrawer-paper"]: { width: drawerWidth, boxSizing: "border-box" },
        } }
      >
        <Toolbar />
        <Divider />
        <List>
          {navItems.map((item) => (
            <ListItemButton
              key={item.to}
              selected={location.pathname === item.to}
              onClick={() => navigate(item.to)}
            >
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>
      </Drawer>

      <Box component="main" sx={ { flexGrow: 1, p: 3 } }>
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
}