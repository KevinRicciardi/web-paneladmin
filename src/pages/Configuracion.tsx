import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import type { Perfil, Tenant } from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

export default function Configuracion({ perfil }: { perfil: Perfil }) {
  const [tenant, setTenant] = useState<Tenant>(perfil.tenant);
  const [formData, setFormData] = useState({
    nombre: perfil.tenant.nombre,
    slug: perfil.tenant.slug,
    streamUrl: perfil.tenant.streamUrl ?? "",
  });
  const [isEditing, setIsEditing] = useState(false);
  const [cerrando, setCerrando] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    setTenant(perfil.tenant);
    setFormData({
      nombre: perfil.tenant.nombre,
      slug: perfil.tenant.slug,
      streamUrl: perfil.tenant.streamUrl ?? "",
    });
  }, [perfil.tenant]);

  const handleLogout = async () => {
    try {
      setCerrando(true);
      await signOut(auth);
    } catch (error) {
      console.error("Error al cerrar sesión:", error);
    } finally {
      setCerrando(false);
    }
  };

  const handleChange = (field: "nombre" | "slug" | "streamUrl", value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleStartEdit = () => {
    setError("");
    setSuccess("");
    setIsEditing(true);
  };

  const handleCancel = () => {
    setFormData({
      nombre: tenant.nombre,
      slug: tenant.slug,
      streamUrl: tenant.streamUrl ?? "",
    });
    setError("");
    setSuccess("");
    setIsEditing(false);
  };

  const handleSave = async () => {
    try {
      setGuardando(true);
      setError("");
      setSuccess("");

      const token = await auth.currentUser?.getIdToken();
      const payload = {
        nombre: formData.nombre.trim(),
        slug: formData.slug.trim(),
        streamUrl: formData.streamUrl.trim() || null,
      };

      const res = await fetch(`${API_URL}/tenants/mi-tenant`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error("No se pudo guardar la información.");
      }

      const updatedTenant = await res.json();
      setTenant(updatedTenant);
      setFormData({
        nombre: updatedTenant.nombre,
        slug: updatedTenant.slug,
        streamUrl: updatedTenant.streamUrl ?? "",
      });
      setSuccess("Perfil actualizado correctamente.");
      setIsEditing(false);
      window.dispatchEvent(new CustomEvent("tenantUpdated", {
        detail: {
          nombre: updatedTenant.nombre,
          slug: updatedTenant.slug,
          streamUrl: updatedTenant.streamUrl ?? null,
        },
      }));
    } catch (err) {
      console.error(err);
      setError("No se pudo guardar. Revisá los datos e intentá nuevamente.");
    } finally {
      setGuardando(false);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Configuración
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Ajusta los valores clave de tu canal. Estos datos se usan para personalizar la experiencia del usuario.
      </Typography>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Información de Marca
          </Typography>
          <Stack spacing={2}>
            <TextField
              label="Nombre de la Marca"
              value={formData.nombre}
              fullWidth
              disabled={!isEditing}
              onChange={(e) => handleChange("nombre", e.target.value)}
            />
            <TextField
              label="Slug"
              value={formData.slug}
              fullWidth
              disabled={!isEditing}
              onChange={(e) => handleChange("slug", e.target.value)}
            />
          </Stack>
        </CardContent>
      </Card>

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Opciones de ayuda
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Ajustá los datos principales de tu marca y guardalos cuando termines.
          </Typography>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            {!isEditing ? (
              <Button variant="contained" onClick={handleStartEdit} disabled={guardando}>
                Editar Perfil
              </Button>
            ) : (
              <>
                <Button variant="contained" onClick={handleSave} disabled={guardando}>
                  {guardando ? "Guardando..." : "Guardar cambios"}
                </Button>
                <Button variant="outlined" onClick={handleCancel} disabled={guardando}>
                  Cancelar
                </Button>
              </>
            )}
            <Button
              variant="outlined"
              component="a"
              href="https://docs.google.com/document/d/1rZ-Hhl8g2x7wm3zaaZo40nJno2hEYczyrsUdsKx6n5s/edit?tab=t.0"
              target="_blank"
              rel="noopener noreferrer"
            >
              Ver documentación
            </Button>
          </Stack>
          {error ? (
            <Typography color="error.main" sx={{ mt: 2 }}>
              {error}
            </Typography>
          ) : null}
          {success ? (
            <Typography color="success.main" sx={{ mt: 2 }}>
              {success}
            </Typography>
          ) : null}
        </CardContent>
      </Card>

      <Divider sx={{ my: 3 }} />

      <Card variant="outlined">
        <CardContent>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Sesión
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Cierra tu sesión actual del panel de administración.
          </Typography>
          <Button variant="outlined" color="error" onClick={handleLogout} disabled={cerrando}>
            {cerrando ? "Cerrando sesión..." : "Cerrar sesión"}
          </Button>
        </CardContent>
      </Card>

      <Typography variant="body2" color="text.secondary" sx={{ mt: 3 }}>
        Esta sección es ideal para centralizar configuraciones generales de la marca y el stream en un solo lugar.
      </Typography>
    </Box>
  );
}
