import { useState, useEffect } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { Box, CircularProgress } from "@mui/material";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Branding from "./pages/Branding";
import Configuracion from "./pages/Configuracion";
import Soporte from "./pages/Soporte";
import Streaming from "./pages/Streaming";
import Programacion from "./pages/Programacion";
import Noticias from "./pages/Noticias";
import Estadisticas from "./pages/Estadisticas";
import Administradores from "./pages/Administradores";
import GenerarApp from "./pages/GenerarApp";
import Activate from "./pages/Activate";
import type { Perfil } from "./types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
const ROLES_ADMIN = ["MEGA_ADMIN", "SUPER_ADMIN", "ADMIN"];

function App() {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let unsub = () => {};
    const fetchPerfil = async (currentUser: any | null) => {
      if (!currentUser) {
        setPerfil(null);
        setLoading(false);
        return;
      }
      try {
        const token = await currentUser.getIdToken();
        const res = await fetch(`${API_URL}/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("No se pudo validar el usuario");
        const data: Perfil = await res.json();
        if (!ROLES_ADMIN.includes(data.rol)) {
          setError("Tu usuario no tiene permisos de administrador.");
          await signOut(auth);
          setPerfil(null);
        } else {
          setPerfil(data);
        }
      } catch (err) {
        console.error(err);
        setError("Error al validar el usuario con el servidor.");
        await signOut(auth);
        setPerfil(null);
      } finally {
        setLoading(false);
      }
    };

    unsub = onAuthStateChanged(auth, fetchPerfil);

    const onTenantUpdated = async (ev: Event) => {
      try {
        const ce = ev as CustomEvent;
        if (ce && ce.detail && typeof ce.detail === "object") {
          // Aplicamos la actualización optimista y no forzamos un re-fetch inmediato,
          // así la UI no se sobrescribe si el backend no persiste el cambio.
          setPerfil((prev) => {
            if (!prev) return prev;
            return { ...prev, tenant: { ...prev.tenant, ...ce.detail } } as Perfil;
          });
          return;
        }
        const currentUser = auth.currentUser;
        await fetchPerfil(currentUser);
      } catch (e) {
        console.error("Error re-fetch perfil:", e);
      }
    };
    window.addEventListener("tenantUpdated", onTenantUpdated as EventListener);

    return () => {
      try { unsub(); } catch {}
      window.removeEventListener("tenantUpdated", onTenantUpdated as EventListener);
    };
  }, []);

  return (
    <BrowserRouter>
      <Routes>
        {/* Pública: se llega acá sin sesión iniciada, desde el link del
            email de invitación. */}
        <Route path="/activate" element={<Activate />} />

        <Route
          path="/*"
          element={
            loading ? (
              <Box sx={ { display: "flex", justifyContent: "center", mt: 10 } }>
                <CircularProgress />
              </Box>
            ) : !perfil ? (
              <Login error={error} />
            ) : (
              <Routes>
                <Route element={<Layout perfil={perfil} />}>
                  <Route path="/" element={<Dashboard perfil={perfil} />} />
                  <Route path="/branding" element={<Branding perfil={perfil} />} />
                  <Route path="/streaming" element={<Streaming perfil={perfil} />} />
                  <Route path="/programacion" element={<Programacion />} />
                  <Route path="/noticias" element={<Noticias />} />
                  <Route path="/estadisticas" element={<Estadisticas />} />
                  <Route path="/administradores" element={<Administradores />} />
                  <Route path="/generar-app" element={<GenerarApp perfil={perfil} />} />
                  <Route path="/configuracion" element={<Configuracion perfil={perfil} />} />
                  <Route path="/soporte" element={<Soporte perfil={perfil} />} />
                </Route>
              </Routes>
            )
          }
        />
      </Routes>
    </BrowserRouter>
  );
}

export default App;