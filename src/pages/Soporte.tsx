import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Card,
  CardContent,
  Link,
  Stack,
  Typography,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

const SOPORTE_EMAIL = "empresa.ejemplo@gmail.com";

const secciones = [
  {
    titulo: "Dashboard",
    descripcion:
      "Resumen del canal, estado de la transmisión y accesos rápidos a las tareas principales.",
    instrucciones: [
      "Al entrar, revisá el estado de la transmisión y las métricas que aparecen en las tarjetas. Algunos datos solo están disponibles si el proveedor de streaming los ofrece.",
      "Usá los bloques de noticias y programación para consultar rápidamente lo que ya está publicado o próximo a emitirse.",
      "El botón “Nuevo evento” abre el formulario para crear un programa. Si no aparece, puede que tu rol no tenga permiso para esa acción.",
    ],
    ruta: "/",
    accion: "Ir al Dashboard",
  },
  {
    titulo: "Branding",
    descripcion:
      "Personaliza el nombre, logo, banners, colores y enlaces de redes. Revisa los cambios con la vista previa antes de guardarlos.",
    instrucciones: [
      "Completá la información visual del canal: nombre, logo, colores, banners y enlaces sociales. Los campos están distribuidos en bloques dentro de la página.",
      "Para cambiar una imagen, subila desde el control correspondiente o pegá su URL. Cuando esté disponible, usá el editor para encuadrarla.",
      "Revisá la vista previa para comprobar cómo se verá la app. Guardá los cambios al terminar para aplicarlos.",
      "Si administrás varios canales, verificá que el canal seleccionado en el panel sea el correcto antes de editar.",
    ],
    ruta: "/branding",
    accion: "Configurar marca",
  },
  {
    titulo: "Streaming",
    descripcion:
      "Configura el proveedor y el enlace de transmisión para que la audiencia pueda verla desde la aplicación.",
    instrucciones: [
      "Elegí la plataforma que usás para transmitir y cargá el enlace o identificador que pide el formulario. Las opciones disponibles dependen del proveedor.",
      "Usá la vista previa y el indicador de señal para comprobar que la fuente se pueda mostrar. La disponibilidad de estos controles cambia según la plataforma.",
      "Si utilizás las funciones de Podcast disponibles en esta sección, seguí los campos de episodios y enlaces que aparecen allí.",
      "Guardá los cambios y probá la reproducción desde la app. No compartas públicamente claves o datos privados de transmisión.",
    ],
    ruta: "/streaming",
    accion: "Configurar Streaming",
  },
  {
    titulo: "Programación",
    descripcion:
      "Crea y organiza programas por horario y días. Al activar un programa, también puedes enviar manualmente un recordatorio por notificación.",
    instrucciones: [
      "Elegí crear un programa y completá título, descripción, horarios y días de emisión. También podés definir una fecha puntual si corresponde.",
      "Podés asignar un color e imagen para identificar el programa en la grilla. Revisá que el horario de inicio y fin sea válido antes de guardar.",
      "Usá los controles de la grilla para consultar y organizar la programación. Un programa inactivo no se ofrece como activo a la audiencia.",
      "Para notificar a los usuarios, el programa debe estar activo. Después, usá “Avisar” en ese programa; el envío es manual y no se dispara solo al crearlo.",
    ],
    ruta: "/programacion",
    accion: "Abrir Programación",
  },
  {
    titulo: "Noticias",
    descripcion:
      "Escribe noticias como borrador y publícalas cuando estén listas. Puedes agregar una portada 16:9 y enviar un aviso manual para una noticia publicada.",
    instrucciones: [
      "Abrí el redactor para crear una noticia y completá título y contenido. Podés guardar como borrador si todavía no querés mostrarla en la app.",
      "Agregá una portada horizontal. El recorte es 16:9 y se recomienda preparar la imagen en 1600 × 900 píxeles; comprobá el encuadre en la vista previa.",
      "Al elegir “Publicar ahora”, la noticia aparece como publicada. Desde la lista podés volver a editarla o pasarla a borrador.",
      "La publicación no envía automáticamente una notificación. Para avisar a los usuarios, usá “Enviar aviso” en una noticia que ya esté publicada.",
    ],
    ruta: "/noticias",
    accion: "Abrir Noticias",
  },
  {
    titulo: "Estadísticas",
    descripcion:
      "Consulta las métricas disponibles y cambia el período para revisar distintos rangos de actividad.",
    instrucciones: [
      "Seleccioná el período disponible en el selector para cambiar el rango de fechas analizado.",
      "Leé las tarjetas y gráficos teniendo en cuenta el intervalo seleccionado. Los datos se actualizan desde la información registrada para la app.",
      "Si una métrica aparece vacía o en cero, puede no haber actividad registrada para ese período; probá un rango más amplio.",
    ],
    ruta: "/estadisticas",
    accion: "Ver Estadísticas",
  },
  {
    titulo: "Generar App",
    descripcion:
      "Envía una solicitud de compilación o publicación de la app, completa los datos y recursos requeridos y sigue su estado desde el panel.",
    instrucciones: [
      "Completá la información solicitada para la ficha de Google Play, incluidos los datos de contacto y descripción de la app.",
      "Cargá el ícono, la imagen destacada y al menos la cantidad mínima de capturas que indica el formulario. Revisá cada archivo antes de enviar.",
      "Enviá la solicitud y consultá su estado en esta misma sección. Si el equipo necesita información adicional, editá los datos pedidos y reenviá la solicitud.",
      "Cuando haya una solicitud activa, revisá su estado antes de crear otra. Esta sección está disponible según el rol asignado.",
    ],
    ruta: "/generar-app",
    accion: "Solicitar una app",
    nota: "Disponible según el rol de tu cuenta.",
  },
  {
    titulo: "Administradores",
    descripcion:
      "Invita personas al panel y consulta el estado de sus invitaciones. Los permisos y acciones disponibles dependen del rol asignado.",
    instrucciones: [
      "Usá “Invitar administrador”, ingresá el correo de la persona y seleccioná el rol o cargo que corresponda.",
      "La persona invitada debe completar la activación desde el correo recibido. Mientras no lo haga, su acceso figura como pendiente.",
      "Consultá el estado de cada integrante y usá las acciones disponibles para administrar roles, reenviar una invitación o quitar acceso.",
      "Asigná solo los permisos necesarios. Algunas operaciones están reservadas al SuperAdmin y pueden no aparecer para otros roles.",
    ],
    ruta: "/administradores",
    accion: "Gestionar administradores",
    nota: "Disponible para roles autorizados.",
  },
  {
    titulo: "Solicitudes de Apps",
    descripcion:
      "Cola de solicitudes para el equipo que gestiona compilaciones y publicaciones de los canales.",
    instrucciones: [
      "Usá el filtro de estado para localizar las solicitudes pendientes, en proceso o finalizadas.",
      "Abrí una solicitud para revisar la información y los recursos que envió el canal.",
      "Actualizá el estado a medida que avanza el trabajo. Si falta información, marcá que se necesita una respuesta y detallá qué debe completar el cliente.",
      "Al finalizar, registrá el resultado para que el administrador del canal pueda consultar el avance.",
    ],
    ruta: "/solicitudes-apps",
    accion: "Ver solicitudes",
    nota: "Disponible para el equipo administrador de la plataforma.",
  },
  {
    titulo: "Configuración",
    descripcion:
      "Edita los datos principales del canal que estén habilitados, guarda los cambios y cierra tu sesión cuando termines.",
    instrucciones: [
      "Elegí “Editar Perfil” para habilitar los campos que podés modificar, como nombre, slug o URL de transmisión.",
      "Revisá los valores antes de guardar. Si no querés conservar tus cambios, elegí “Cancelar”.",
      "Al cambiar el slug, la app puede identificarse de forma diferente; asegurate de entender el efecto que muestra el panel antes de confirmar.",
      "Para salir de tu cuenta, usá “Cerrar sesión” en la navegación lateral.",
    ],
    ruta: "/configuracion",
    accion: "Abrir Configuración",
  },
];

export default function Soporte() {
  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Centro de ayuda
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Guía rápida de las funciones del panel de administración y acceso directo a cada apartado.
      </Typography>

      <Stack spacing={1.5}>
        {secciones.map((seccion) => (
          <Accordion key={seccion.ruta} variant="outlined" disableGutters>
            <AccordionSummary
              expandIcon={<Box component="span" aria-hidden="true" sx={{ fontSize: 22 }}>⌄</Box>}
              aria-controls={`soporte-${seccion.ruta.slice(1) || "dashboard"}-content`}
              id={`soporte-${seccion.ruta.slice(1) || "dashboard"}-header`}
            >
              <Box sx={{ minWidth: 0 }}>
                <Typography variant="h6">{seccion.titulo}</Typography>
                <Typography color="text.secondary" variant="body2">
                  {seccion.descripcion}
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              <Typography sx={{ fontWeight: 700, mb: 1 }}>Cómo usar este apartado</Typography>
              <Box component="ol" sx={{ pl: 2.5, mt: 0, mb: 2 }}>
                {seccion.instrucciones.map((instruccion) => (
                  <Typography component="li" key={instruccion} color="text.secondary" sx={{ mb: 1 }}>
                    {instruccion}
                  </Typography>
                ))}
              </Box>
              {seccion.nota && (
                <Typography color="text.secondary" variant="caption" sx={{ display: "block", mb: 1.5 }}>
                  {seccion.nota}
                </Typography>
              )}
              <Button component={RouterLink} to={seccion.ruta} variant="contained" size="small">
                {seccion.accion}
              </Button>
            </AccordionDetails>
          </Accordion>
        ))}

        <Card variant="outlined">
          <CardContent>
            <Typography variant="h6" sx={{ mb: 1 }}>
              ¿Necesitas ayuda personalizada?
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 1 }}>
              Escribe al correo de soporte y cuéntanos qué estabas intentando hacer y en qué sección.
            </Typography>
            <Typography sx={{ mb: 1 }}>
              <Link
                href={`mailto:${SOPORTE_EMAIL}`}
                underline="hover"
                color="info.main"
                sx={{ fontWeight: 600 }}
              >
                {SOPORTE_EMAIL}
              </Link>
            </Typography>
            <Typography color="text.secondary" variant="caption">
              Este correo es de ejemplo y se puede reemplazar por el correo definitivo de la empresa.
            </Typography>
          </CardContent>
        </Card>
      </Stack>
    </Box>
  );
}
