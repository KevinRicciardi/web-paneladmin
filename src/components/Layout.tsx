import {
  Avatar,
  Box,
  Divider,
  Drawer,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  ListItemText,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { Outlet, useLocation, useNavigate } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import type { Perfil } from "../types";

const drawerWidth = 280;

const navItems = [
  { to: "/", label: "Dashboard", icon: "dashboard" },
  { to: "/branding", label: "Branding", icon: "palette" },
  { to: "/streaming", label: "Streaming", icon: "sensors" },
  { to: "/programacion", label: "Programación", icon: "calendar_month" },
  { to: "/noticias", label: "Noticias", icon: "newspaper" },
];

const footerItems = [
  { to: "/configuracion", label: "Configuración", icon: "settings" },
  { to: "/soporte", label: "Soporte", icon: "help" },
];

export default function Layout({ perfil }: { perfil: Perfil }) {
  const navigate = useNavigate();
  const location = useLocation();
  const nombreCliente = perfil.tenant?.nombre ?? perfil.tenant?.slug ?? "Cliente";
  const brandName = perfil.tenant?.nombre || "StreamManager";

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <Drawer
        variant="permanent"
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          ["& .MuiDrawer-paper"]: {
            width: drawerWidth,
            boxSizing: "border-box",
            bgcolor: "background.paper",
            borderRight: "1px solid",
            borderColor: "divider",
            px: 2.5,
            py: 3,
          },
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", height: "100%" }}>
          <Box sx={{ mb: 4 }}>
            <Box
              sx={{
                width: 52,
                height: 52,
                borderRadius: 2,
                bgcolor: "rgba(255,255,255,0.04)",
                display: "grid",
                placeItems: "center",
                mb: 2,
                border: "1px solid",
                borderColor: "divider",
              }}
            >
              <span className="material-symbols-outlined">dashboard</span>
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 900, mb: 0.5 }}>
              {brandName}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Admin de Marca
            </Typography>
          </Box>

          <List sx={{ flex: 1, p: 0 }}>
            {navItems.map((item) => {
              const selected = location.pathname === item.to;
              return (
                <ListItemButton
                  key={item.to}
                  selected={selected}
                  onClick={() => navigate(item.to)}
                  sx={{
                    borderRadius: 2,
                    mb: 1,
                    py: 1.5,
                    color: selected ? "text.primary" : "text.secondary",
                    bgcolor: selected ? "rgba(255,255,255,0.06)" : "transparent",
                    "&:hover": {
                      bgcolor: "rgba(255,255,255,0.05)",
                    },
                  }}
                >
                  <ListItemText
                    primary={
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <span className="material-symbols-outlined">{item.icon}</span>
                        <Typography sx={{ fontWeight: 700 }}>{item.label}</Typography>
                      </Stack>
                    }
                  />
                </ListItemButton>
              );
            })}
          </List>

          <Divider sx={{ mt: 2, borderColor: "divider" }} />

          <Box sx={{ mt: 2 }}>
            {footerItems.map((item) => {
              const selected = location.pathname === item.to;
              return (
                <ListItemButton
                  key={item.label}
                  selected={selected}
                  onClick={() => navigate(item.to)}
                  sx={{
                    borderRadius: 2,
                    mb: 1,
                    py: 1.5,
                    justifyContent: "flex-start",
                    color: selected ? "text.primary" : "text.secondary",
                    bgcolor: selected ? "rgba(255,255,255,0.06)" : "transparent",
                    "&:hover": {
                      bgcolor: "rgba(255,255,255,0.05)",
                    },
                  }}
                >
                  <ListItemText
                    primary={
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <span className="material-symbols-outlined">{item.icon}</span>
                        <Typography sx={{ fontWeight: 700 }}>{item.label}</Typography>
                      </Stack>
                    }
                  />
                </ListItemButton>
              );
            })}
          </Box>
        </Box>
      </Drawer>

      <Box component="main" sx={{ flexGrow: 1, p: 3 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
