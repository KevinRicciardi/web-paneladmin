import { lazy, Suspense, useState, useEffect, useRef, type ReactNode } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { Box, CircularProgress } from "@mui/material";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import type { Perfil } from "./types";
import { getCachedAuthHeaders, recordarTenantDelPerfil } from "./services/authenticatedFetch";
import ErrorBoundary from "./components/ErrorBoundary";
import ErrorConexion from "./components/ErrorConexion";
import { limpiarCachesDeSesion } from "./utils/sesion";
import { API_URL } from "./config/api";
import { puedeVerRuta } from "./utils/permisos";

const Login = lazy(() => import("./pages/Login"));
const Layout = lazy(() => import("./components/Layout"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Branding = lazy(() => import("./pages/Branding"));
const Configuracion = lazy(() => import("./pages/Configuracion"));
const Soporte = lazy(() => import("./pages/Soporte"));
const Streaming = lazy(() => import("./pages/Streaming"));
const Programacion = lazy(() => import("./pages/Programacion"));
const Noticias = lazy(() => import("./pages/Noticias"));
const Estadisticas = lazy(() => import("./pages/Estadisticas"));
const Administradores = lazy(() => import("./pages/Administradores"));
const GenerarApp = lazy(() => import("./pages/GenerarApp"));
const SolicitudesApps = lazy(() => import("./pages/SolicitudesApps"));
const Activate = lazy(() => import("./pages/Activate"));

const ROLES_ADMIN = ["MEGA_ADMIN", "SUPER_ADMIN", "ADMIN"];

// Una sección que no está en el menú de este admin vuelve al inicio.
function Permitida({ perfil, ruta, children }: { perfil: Perfil; ruta: string; children: ReactNode }) {
  return puedeVerRuta(perfil, ruta) ? children : <Navigate to="/" replace />;
}

function App() {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  // El servidor no respondió (o falló): se conserva la sesión y se ofrece reintentar.
  const [falloServidor, setFalloServidor] = useState(false);
  const fetchPerfilRef = useRef<(user: any | null) => Promise<void>>(async () => {});
  const uidActualRef = useRef<string | null>(null);

  useEffect(() => {
    let unsub = () => {};
    const fetchPerfil = async (currentUser: any | null) => {
      if (!currentUser) {
        limpiarCachesDeSesion();
        uidActualRef.current = null;
        setPerfil(null);
        setLoading(false);
        return;
      }
      // Entró un usuario distinto al anterior: sus datos no se mezclan con los del otro.
      if (uidActualRef.current && uidActualRef.current !== currentUser.uid) {
        limpiarCachesDeSesion();
      }
      uidActualRef.current = currentUser.uid;
      try {
        const headers = await getCachedAuthHeaders();
        const res = await fetch(`${API_URL}/me`, {
          headers,
        });
        // Solo un 401/403 significa "esta sesión no sirve". Un 5xx o un corte
        // de red no: ahí se mantiene la sesión y se muestra "Reintentar".
        if (res.status === 401 || res.status === 403) {
          setError("Tu sesión no es válida. Iniciá sesión de nuevo.");
          await signOut(auth);
          setPerfil(null);
          return;
        }
        if (!res.ok) throw new Error(`El servidor respondió ${res.status}`);
        const data: Perfil = await res.json();
        if (!ROLES_ADMIN.includes(data.rol)) {
          setError("Tu usuario no tiene permisos de administrador.");
          await signOut(auth);
          setPerfil(null);
        } else {
          setError("");
          setFalloServidor(false);
          recordarTenantDelPerfil(data.tenant?.slug);
          setPerfil(data);
        }
      } catch (err) {
        console.error(err);
        setFalloServidor(true);
      } finally {
        setLoading(false);
      }
    };

    fetchPerfilRef.current = fetchPerfil;
    unsub = onAuthStateChanged(auth, fetchPerfil);
    const onTenantContextChanged = () => {
      limpiarCachesDeSesion();
      setLoading(true);
      void fetchPerfil(auth.currentUser);
    };
    window.addEventListener("tenantContextChanged", onTenantContextChanged);

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
      window.removeEventListener("tenantContextChanged", onTenantContextChanged);
    };
  }, []);

  return (
    <BrowserRouter>
      <ErrorBoundary>
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
            ) : falloServidor ? (
              <ErrorConexion
                onReintentar={() => {
                  setLoading(true);
                  setFalloServidor(false);
                  void fetchPerfilRef.current(auth.currentUser);
                }}
                onCerrarSesion={() => {
                  setFalloServidor(false);
                  void signOut(auth);
                }}
              />
            ) : !perfil ? (
              <Login error={error} />
            ) : (
              <Routes>
                <Route element={<Layout perfil={perfil} />}>
                  <Route path="/" element={<Dashboard perfil={perfil} />} />
                  <Route path="/branding" element={<Permitida perfil={perfil} ruta="/branding"><Branding perfil={perfil} /></Permitida>} />
                  <Route path="/streaming" element={<Permitida perfil={perfil} ruta="/streaming"><Streaming perfil={perfil} /></Permitida>} />
                  <Route path="/podcast" element={<Navigate to="/streaming" replace />} />
                  <Route path="/programacion" element={<Permitida perfil={perfil} ruta="/programacion"><Programacion /></Permitida>} />
                  <Route path="/noticias" element={<Permitida perfil={perfil} ruta="/noticias"><Noticias /></Permitida>} />
                  <Route path="/estadisticas" element={<Permitida perfil={perfil} ruta="/estadisticas"><Estadisticas /></Permitida>} />
                  <Route path="/administradores" element={<Permitida perfil={perfil} ruta="/administradores"><Administradores perfil={perfil} /></Permitida>} />
                  <Route path="/generar-app" element={<Permitida perfil={perfil} ruta="/generar-app"><GenerarApp perfil={perfil} /></Permitida>} />
                  <Route path="/solicitudes-apps" element={<Permitida perfil={perfil} ruta="/solicitudes-apps"><SolicitudesApps /></Permitida>} />
                  <Route path="/configuracion" element={<Configuracion perfil={perfil} />} />
                  <Route path="/soporte" element={<Soporte perfil={perfil} />} />
                </Route>
                {/* Cualquier otra dirección (un marcador viejo, un error de
                    tipeo) vuelve al inicio en vez de mostrar una pantalla vacía. */}
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            )
          }
        />
        </Routes>
      </Suspense>
      </ErrorBoundary>
    </BrowserRouter>
  );
}

export default App;