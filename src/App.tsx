import { useState, useEffect } from "react";
import { auth } from "./firebase";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { Box, CircularProgress } from "@mui/material";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import Layout from "./components/Layout";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Branding from "./pages/Branding";
import Streaming from "./pages/Streaming";
import Programacion from "./pages/Programacion";
import Noticias from "./pages/Noticias";
import type { Perfil } from "./types";

const API_URL = "http://localhost:3000";
const ROLES_ADMIN = ["SUPER_ADMIN", "ADMIN_CLIENTE"];

function App() {
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (currentUser) => {
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
    });
    return () => unsub();
  }, []);

  if (loading) {
    return (
      <Box sx={ { display: "flex", justifyContent: "center", mt: 10 } }>
        <CircularProgress />
      </Box>
    );
  }

  if (!perfil) return <Login error={error} />;

  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout perfil={perfil} />}>
          <Route path="/" element={<Dashboard perfil={perfil} />} />
          <Route path="/branding" element={<Branding />} />
          <Route path="/streaming" element={<Streaming />} />
          <Route path="/programacion" element={<Programacion />} />
          <Route path="/noticias" element={<Noticias />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;