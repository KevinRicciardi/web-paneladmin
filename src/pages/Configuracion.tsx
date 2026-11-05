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
import { getCachedAuthHeaders, renombrarCanal } from "../services/authenticatedFetch";
import { cambiarSlugDeTenant } from "../services/tenant.service";
import type { Perfil, Tenant } from "../types";
import { API_URL } from "../config/api";

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
  const puedeCambiarSlug = perfil.rol === "MEGA_ADMIN";

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
    const slugNuevo = formData.slug.trim().toLowerCase();
    const cambiaSlug = puedeCambiarSlug && slugNuevo !== tenant.slug;
    let slugCambiado = false;

    try {
      setGuardando(true);
      setError("");
      setSuccess("");

      // El slug no se guarda por /tenants/mi-tenant: la API lo ignoraba y
      // la pantalla decía "actualizado" aunque no hubiera cambiado. Va por
      // el endpoint propio (solo MEGA_ADMIN), y primero: si el formato no
      // sirve, no se guarda nada.
      if (cambiaSlug) {
        const conSlug = await cambiarSlugDeTenant(tenant.id, slugNuevo);
        renombrarCanal(tenant.slug, conSlug.slug);
        slugCambiado = true;
      }

      // Solo el nombre: el link del stream es de la pantalla Streaming (y
      // mandarlo exigía permiso de streaming a quien solo cambia el nombre).
      const res = await fetch(`${API_URL}/tenants/mi-tenant`, {
        method: "PATCH",
        headers: await getCachedAuthHeaders(),
        body: JSON.stringify({ nombre: formData.nombre.trim() }),
      });

      if (!res.ok) {
        let message = "No se pudo guardar el nombre.";
        try {
          const data = await res.json();
          if (typeof data?.message === "string" && data.message.trim()) message = data.message;
        } catch {
          // La API puede responder sin un cuerpo JSON.
        }
        throw new Error(message);
      }

      const updatedTenant: Tenant = await res.json();
      setTenant(updatedTenant);
      setFormData({
        nombre: updatedTenant.nombre,
        slug: updatedTenant.slug,
        streamUrl: updatedTenant.streamUrl ?? "",
      });
      setSuccess("Perfil actualizado correctamente.");
      setIsEditing(false);
      // Con el slug nuevo se vuelve a pedir el perfil entero: el selector de
      // canales también tiene que mostrarlo.
      window.dispatchEvent(new CustomEvent("tenantUpdated", slugCambiado
        ? undefined
        : { detail: { nombre: updatedTenant.nombre } }));
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error && err.message
          ? err.message
          : "No se pudo guardar. Revisá los datos e intentá nuevamente.",
      );
      // El slug ya cambió aunque el nombre no: el panel vuelve a leer el canal.
      if (slugCambiado) window.dispatchEvent(new CustomEvent("tenantUpdated"));
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
              disabled={!isEditing || !puedeCambiarSlug}
              onChange={(e) => handleChange("slug", e.target.value)}
              helperText={
                puedeCambiarSlug
                  ? "Con el slug se arma la app del canal: si lo cambiás, las apps ya instaladas dejan de encontrarlo."
                  : "Solo un MEGA_ADMIN puede cambiar el slug."
              }
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
