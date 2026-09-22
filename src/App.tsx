import { lazy, Suspense, useState, useEffect } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { Box, CircularProgress } from "@mui/material";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import type { Perfil } from "./types";
import { getCachedAuthHeaders } from "./services/authenticatedFetch";

const Login = lazy(() => import("./pages/Login"));
const Layout = lazy(() => import("./components/Layout"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Branding = lazy(() => import("./pages/Branding"));
const Configuracion = lazy(() => import("./pages/Configuracion"));
const Soporte = lazy(() => import("./pages/Soporte"));
const Streaming = lazy(() => import("./pages/Streaming"));
const Programacion = lazy(() => import("./pages/Programacion"));
const Noticias = lazy(() => import("./pages/Noticias"));
const Podcast = lazy(() => import("./pages/Podcast"));
const Estadisticas = lazy(() => import("./pages/Estadisticas"));
const Administradores = lazy(() => import("./pages/Administradores"));
const GenerarApp = lazy(() => import("./pages/GenerarApp"));
const SolicitudesApps = lazy(() => import("./pages/SolicitudesApps"));
const Activate = lazy(() => import("./pages/Activate"));

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
        const { Authorization } = await getCachedAuthHeaders();
        const res = await fetch(`${API_URL}/me`, {
          headers: { Authorization },
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
      <Suspense fallback={<Box sx={{ display: "flex", justifyContent: "center", mt: 10 }}><CircularProgress /></Box>}>
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
                  <Route path="/podcast" element={<Podcast perfil={perfil} />} />
                  <Route path="/estadisticas" element={<Estadisticas />} />
                  <Route path="/administradores" element={<Administradores />} />
                  <Route path="/generar-app" element={<GenerarApp perfil={perfil} />} />
                  <Route path="/solicitudes-apps" element={<SolicitudesApps />} />
                  <Route path="/configuracion" element={<Configuracion perfil={perfil} />} />
                  <Route path="/soporte" element={<Soporte perfil={perfil} />} />
                </Route>
              </Routes>
            )
          }
        />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}

export default App;