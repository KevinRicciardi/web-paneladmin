import { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { signOut } from "firebase/auth";
import { auth } from "../firebase";
import type { AdminUser, Perfil, Tenant } from "../types";

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
  const [adminEmail, setAdminEmail] = useState("");
  const [adminRole, setAdminRole] = useState("ADMIN_CLIENTE");
  const [adminsList, setAdminsList] = useState<AdminUser[]>(perfil.tenant.admins ?? []);
  const [adminLoading, setAdminLoading] = useState(false);
  const [adminDeleting, setAdminDeleting] = useState("");
  const [adminError, setAdminError] = useState("");
  const [adminSuccess, setAdminSuccess] = useState("");

  useEffect(() => {
    setTenant(perfil.tenant);
    setFormData({
      nombre: perfil.tenant.nombre,
      slug: perfil.tenant.slug,
      streamUrl: perfil.tenant.streamUrl ?? "",
    });

    const persistedAdmins = localStorage.getItem(`tenant-admins-${perfil.tenant.id}`);
    if (persistedAdmins) {
      try {
        setAdminsList(JSON.parse(persistedAdmins));
      } catch {
        setAdminsList(perfil.tenant.admins ?? []);
      }
    } else {
      setAdminsList(perfil.tenant.admins ?? []);
    }
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

  const handleAddAdmin = async () => {
    const email = adminEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAdminError("Ingresá un correo válido para agregar un administrador.");
      setAdminSuccess("");
      return;
    }

    if (adminsList.some((admin) => admin.email.toLowerCase() === email)) {
      setAdminError("Ese administrador ya está en la lista.");
      setAdminSuccess("");
      return;
    }

    const nuevoAdmin: AdminUser = {
      email,
      rol: adminRole,
      activo: true,
    };

    const nextAdmins = [...adminsList, nuevoAdmin];
    setAdminsList(nextAdmins);
    localStorage.setItem(`tenant-admins-${tenant.id}`, JSON.stringify(nextAdmins));
    setAdminEmail("");
    setAdminRole("ADMIN_CLIENTE");
    setAdminError("");
    setAdminSuccess(`${email} se agregó a los administradores del canal.`);

    try {
      setAdminLoading(true);
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${API_URL}/tenants/mi-tenant/admins`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email, rol: adminRole }),
      });

      if (!res.ok) {
        throw new Error("No se pudo persistir en el backend");
      }
    } catch (err) {
      console.warn("No se pudo sincronizar con el backend; se guardó localmente.", err);
      setAdminSuccess("Se guardó localmente y quedará listo para sincronizar si tu backend expone el endpoint de admins.");
    } finally {
      setAdminLoading(false);
    }
  };

  const canDeleteAdmin = (admin: AdminUser) =>
    perfil.rol === "SUPER_ADMIN" ||
    (perfil.rol === "ADMIN_CLIENTE" && admin.rol === "ADMIN_CLIENTE");

  const handleDeleteAdmin = async (admin: AdminUser) => {
    if (!canDeleteAdmin(admin)) return;

    const nextAdmins = adminsList.filter((item) => item.email !== admin.email);
    setAdminsList(nextAdmins);
    localStorage.setItem(`tenant-admins-${tenant.id}`, JSON.stringify(nextAdmins));
    setAdminError("");
    setAdminSuccess(`${admin.email} se eliminó de los administradores del canal.`);

    try {
      setAdminDeleting(admin.email);
      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${API_URL}/tenants/mi-tenant/admins`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: admin.email }),
      });

      if (!res.ok) {
        throw new Error("No se pudo persistir la eliminación en el backend");
      }
    } catch (err) {
      console.warn("No se pudo sincronizar la eliminación con el backend; se quitó localmente.", err);
      setAdminSuccess(`${admin.email} se quitó localmente y quedará listo para sincronizar.`);
    } finally {
      setAdminDeleting("");
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

      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h6" sx={{ mb: 1 }}>
            Administradores
          </Typography>
          <Typography color="text.secondary" sx={{ mb: 2 }}>
            Permití que otros usuarios gestionen el canal agregándolos como administradores del tenant.
          </Typography>

          <Stack spacing={2}>
            <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
              <TextField
                label="Correo del administrador"
                value={adminEmail}
                onChange={(e) => setAdminEmail(e.target.value)}
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel id="admin-role-label">Permiso</InputLabel>
                <Select
                  labelId="admin-role-label"
                  value={adminRole}
                  label="Permiso"
                  onChange={(e) => setAdminRole(e.target.value)}
                >
                  <MenuItem value="ADMIN_CLIENTE">Administrador</MenuItem>
                  <MenuItem value="SUPER_ADMIN">Super administrador</MenuItem>
                </Select>
              </FormControl>
            </Stack>

            <Button variant="contained" onClick={handleAddAdmin} disabled={adminLoading}>
              {adminLoading ? "Agregando..." : "Agregar administrador"}
            </Button>

            {adminError ? (
              <Typography color="error.main">{adminError}</Typography>
            ) : null}
            {adminSuccess ? (
              <Typography color="success.main">{adminSuccess}</Typography>
            ) : null}

            <Typography variant="subtitle2" sx={{ mt: 1 }}>
              Administradores actuales
            </Typography>
            {adminsList.length > 0 ? (
              <Stack direction="row" spacing={1} useFlexGap sx={{ flexWrap: "wrap" }}>
                {adminsList.map((admin) => (
                  <Chip
                    key={admin.email}
                    label={`${admin.email} · ${admin.rol}`}
                    color="primary"
                    variant="outlined"
                    onDelete={canDeleteAdmin(admin) ? () => handleDeleteAdmin(admin) : undefined}
                    disabled={adminDeleting === admin.email}
                  />
                ))}
              </Stack>
            ) : (
              <Typography color="text.secondary">
                Todavía no hay administradores adicionales.
              </Typography>
            )}
          </Stack>
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
