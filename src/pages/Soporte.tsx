import { useState } from "react";
import { Box, Button, Card, CardContent, IconButton, Link, Stack, TextField, Typography } from "@mui/material";
import { auth } from "../firebase";
import { Link as RouterLink } from "react-router-dom";
import type { Perfil } from "../types";

const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3000";

function whatsappHref(value: string) {
  const trimmed = value.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;

  const phone = trimmed.replace(/[^\d]/g, "");
  return phone ? `https://wa.me/${phone}` : "";
}

export default function Soporte({ perfil }: { perfil: Perfil }) {
  const puedeEditarContacto = perfil.rol === "MEGA_ADMIN" || perfil.rol === "SUPER_ADMIN";
  const [whatsapp, setWhatsapp] = useState(perfil.tenant.whatsappUrl?.trim() ?? "");
  const [emailContacto, setEmailContacto] = useState(perfil.tenant.supportEmail?.trim() ?? "");
  const [editandoWhatsapp, setEditandoWhatsapp] = useState(false);
  const [guardandoWhatsapp, setGuardandoWhatsapp] = useState(false);
  const [contactoEliminando, setContactoEliminando] = useState<"whatsappUrl" | "supportEmail" | null>(null);
  const [errorWhatsapp, setErrorWhatsapp] = useState("");
  const [successWhatsapp, setSuccessWhatsapp] = useState("");
  const whatsappLink = whatsappHref(whatsapp);

  const guardarContactos = async () => {
    try {
      setGuardandoWhatsapp(true);
      setErrorWhatsapp("");
      setSuccessWhatsapp("");
      const token = await auth.currentUser?.getIdToken();
      if (emailContacto && !/^\S+@\S+\.\S+$/.test(emailContacto)) {
        throw new Error("Ingresá un correo electrónico válido.");
      }

      const res = await fetch(`${API_URL}/tenants/mi-tenant`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          whatsappUrl: whatsapp.trim() || null,
          supportEmail: emailContacto.trim() || null,
        }),
      });

      if (!res.ok) throw new Error("No se pudieron guardar los contactos.");

      const updatedTenant = await res.json();
      setWhatsapp(updatedTenant.whatsappUrl?.trim() ?? whatsapp.trim());
      setEmailContacto(updatedTenant.supportEmail?.trim() ?? emailContacto.trim());
      setEditandoWhatsapp(false);
      setSuccessWhatsapp("Contactos actualizados.");
      window.dispatchEvent(new CustomEvent("tenantUpdated", {
        detail: {
          whatsappUrl: updatedTenant.whatsappUrl ?? (whatsapp.trim() || null),
          supportEmail: updatedTenant.supportEmail ?? (emailContacto.trim() || null),
        },
      }));
    } catch (error) {
      setErrorWhatsapp(error instanceof Error ? error.message : "No se pudo guardar el contacto.");
    } finally {
      setGuardandoWhatsapp(false);
    }
  };

  const eliminarContacto = async (campo: "whatsappUrl" | "supportEmail") => {
    const valorAnterior = campo === "whatsappUrl" ? whatsapp : emailContacto;

    try {
      setContactoEliminando(campo);
      setErrorWhatsapp("");
      setSuccessWhatsapp("Eliminando contacto...");
      if (campo === "whatsappUrl") setWhatsapp("");
      if (campo === "supportEmail") setEmailContacto("");

      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(`${API_URL}/tenants/mi-tenant`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ [campo]: null }),
      });

      if (!res.ok) throw new Error("No se pudo eliminar el contacto.");

      const updatedTenant = await res.json();
      if (campo === "whatsappUrl") setWhatsapp(updatedTenant.whatsappUrl?.trim() ?? "");
      if (campo === "supportEmail") setEmailContacto(updatedTenant.supportEmail?.trim() ?? "");
      setSuccessWhatsapp("Contacto eliminado.");
      window.dispatchEvent(new CustomEvent("tenantUpdated", {
        detail: { [campo]: null },
      }));
    } catch (error) {
      if (campo === "whatsappUrl") setWhatsapp(valorAnterior);
      if (campo === "supportEmail") setEmailContacto(valorAnterior);
      setErrorWhatsapp(error instanceof Error ? error.message : "No se pudo eliminar el contacto.");
    } finally {
      setContactoEliminando(null);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Centro de ayuda
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Aquí encontrarás orientación práctica para mantener tu panel actualizado, ordenado y listo para operar.
      </Typography>

      <Stack spacing={2}>
        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>
              1. Define la identidad de tu marca
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Antes de salir al aire, lo primero es ponerle tu toque personal. Acá podés subir la foto de perfil, poner el logo de tu marca, cambiar la imagen de portada y elegir los colores que te van a identificar. Es la cara visible que van a ver todos cuando entren.
            </Typography>
            <Button component={RouterLink} to="/branding" variant="contained" size="small">
              Ver Branding
            </Button>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>
              2. Gestiona tu transmisión
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Para que tu programa de video (como OBS) se conecte con esta página, necesitás la clave de acceso. En este apartado vas a encontrar los datos para copiar y pegar en tu programa, elegir cómo vas a emitir y dejar la pantalla lista para cuando aprietes el botón de salir en vivo.
            </Typography>
            <Button component={RouterLink} to="/streaming" variant="contained" size="small">
              Ir a Streaming
            </Button>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>
              3. Organiza tu Programación de contenido
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              A nadie le gusta entrar a un canal y no saber cuándo hay contenido. Acá podés armar un calendario bien claro con los días y los horarios en los que vas a transmitir durante la semana, así tus seguidores ya saben exactamente qué día conectarse para verte.
            </Typography>
            <Button component={RouterLink} to="/programacion" variant="contained" size="small">
              Ir a Programación
            </Button>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>
              4. Publica novedades con frecuencia
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 2 }}>
              Usá este espacio para escribirle directamente a la gente que te sigue. Podés contarles sobre el próximo evento que vas a hacer, avisar si cambiás un horario o dejar un mensaje fijado para los que recién te conocen. Es tu cartelera de anuncios.
            </Typography>
            <Button component={RouterLink} to="/noticias" variant="contained" size="small">
              Ir a Noticias
            </Button>
          </CardContent>
        </Card>

        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>
              Ayuda personalizada
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 1 }}>
              Si necesitas asistencia, puedes escribirnos a nuestro canal de soporte para resolver dudas o problemas.
            </Typography>
            <Typography sx={{ mb: 1 }}>
              <Link
                href="https://mail.google.com/mail/u/0/?view=cm&to=ayuda@webpanel.com"
                target="_blank"
                rel="noopener noreferrer"
                underline="hover"
                color="info.main"
                sx={{ fontWeight: 600 }}
              >
                ayuda@webpanel.com
              </Link>
            </Typography>
            {emailContacto ? (
              <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1 }}>
                <Link
                  href={`https://mail.google.com/mail/u/0/?view=cm&to=${encodeURIComponent(emailContacto)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="hover"
                  color="info.main"
                  sx={{ fontWeight: 600 }}
                >
                  {emailContacto}
                </Link>
                {puedeEditarContacto ? (
                  <IconButton
                    aria-label="Eliminar correo adicional"
                    size="small"
                    color="inherit"
                    onClick={() => void eliminarContacto("supportEmail")}
                    disabled={contactoEliminando !== null}
                    sx={{
                      color: "text.secondary",
                      p: 0,
                      width: 20,
                      height: 20,
                      borderRadius: 0,
                      "&:hover": { color: "text.primary", bgcolor: "transparent" },
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                  </IconButton>
                ) : null}
              </Stack>
            ) : null}
            {whatsappLink ? (
              <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1 }}>
                <Link
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  underline="hover"
                  color="success.main"
                  sx={{ fontWeight: 600 }}
                >
                  Contactar por WhatsApp
                </Link>
                {puedeEditarContacto ? (
                  <IconButton
                    aria-label="Eliminar WhatsApp"
                    size="small"
                    color="inherit"
                    onClick={() => void eliminarContacto("whatsappUrl")}
                    disabled={contactoEliminando !== null}
                    sx={{
                      color: "text.secondary",
                      p: 0,
                      width: 20,
                      height: 20,
                      borderRadius: 0,
                      "&:hover": { color: "text.primary", bgcolor: "transparent" },
                    }}
                  >
                    <span className="material-symbols-outlined" style={{ fontSize: 16 }}>close</span>
                  </IconButton>
                ) : null}
              </Stack>
            ) : null}
            {puedeEditarContacto && editandoWhatsapp ? (
              <Stack spacing={1.5} sx={{ mt: 2, maxWidth: 520 }}>
                <TextField
                  label="Correo electrónico adicional"
                  value={emailContacto}
                  onChange={(event) => setEmailContacto(event.target.value)}
                  placeholder="contacto@tumarca.com"
                  type="email"
                  size="small"
                  fullWidth
                  helperText="Se mostrará junto al correo de soporte principal."
                />
                <TextField
                  label="Número de WhatsApp"
                  value={whatsapp}
                  onChange={(event) => setWhatsapp(event.target.value)}
                  placeholder="5491112345678 o https://wa.me/5491112345678"
                  size="small"
                  fullWidth
                  helperText="Podés ingresar el número con código de país o un enlace wa.me."
                />
                <Stack direction="row" spacing={1}>
                  <Button variant="contained" size="small" onClick={guardarContactos} disabled={guardandoWhatsapp}>
                    {guardandoWhatsapp ? "Guardando..." : "Guardar contactos"}
                  </Button>
                  <Button variant="outlined" size="small" onClick={() => setEditandoWhatsapp(false)} disabled={guardandoWhatsapp}>
                    Cancelar
                  </Button>
                </Stack>
              </Stack>
            ) : null}
            {puedeEditarContacto && !editandoWhatsapp ? (
              <Button variant="outlined" size="small" onClick={() => setEditandoWhatsapp(true)} sx={{ mt: 1 }}>
                {whatsappLink || emailContacto ? "Editar contactos" : "Agregar contactos"}
              </Button>
            ) : null}
            {errorWhatsapp ? <Typography color="error.main" sx={{ mt: 1 }}>{errorWhatsapp}</Typography> : null}
            {successWhatsapp ? <Typography color="success.main" sx={{ mt: 1 }}>{successWhatsapp}</Typography> : null}
            <Typography color="text.secondary">
              También puedes revisar la configuración de tu cuenta y las secciones del panel para encontrar respuestas rápidas.
            </Typography>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
