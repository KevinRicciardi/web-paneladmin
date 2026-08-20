import { Box, Button, Card, CardContent, Chip, Divider, Typography } from "@mui/material";
import type { Perfil } from "../types";

const pasos = [
  { label: "Configurada", icon: "check_circle" },
  { label: "Compilando...", icon: "sync" },
  { label: "Compilada", icon: "check_circle" },
  { label: "Disponible para descargar", icon: "download" },
];

export default function GenerarApp({ perfil }: { perfil: Perfil }) {
  const brandName = perfil.tenant?.nombre || "Sin nombre";

  return (
    <Box>
      {/* Encabezado */}
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 2,
          mb: 4,
        }}
      >
        <Box>
          <Typography variant="h4" gutterBottom>
            Generar App
          </Typography>

          <Typography color="text.secondary" sx={{ maxWidth: 640 }}>
            Generá una nueva versión de la aplicación de tu marca para
            distribuirla como archivo .AAB.
          </Typography>
        </Box>

        <Button
          variant="contained"
          startIcon={
            <span className="material-symbols-outlined">
              build
            </span>
          }
          disabled
        >
          Generar nueva versión
        </Button>
      </Box>

      {/* Información de la aplicación */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              mb: 3,
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              color: "text.secondary",
              fontFamily: "monospace",
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 16 }}
            >
              phone_android
            </span>
            Aplicación
          </Typography>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                sm: "repeat(3, 1fr)",
              },
              gap: 3,
            }}
          >
            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: "block",
                  mb: 0.5,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Marca
              </Typography>

              <Typography sx={{ fontWeight: 700 }}>
                {brandName}
              </Typography>
            </Box>

            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: "block",
                  mb: 0.5,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Versión actual
              </Typography>

              <Typography sx={{ fontWeight: 700, fontFamily: "monospace" }}>
                —
              </Typography>
            </Box>

            <Box>
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{
                  display: "block",
                  mb: 0.5,
                  textTransform: "uppercase",
                  letterSpacing: 1,
                }}
              >
                Próxima versión
              </Typography>

              <Typography sx={{ fontWeight: 700, fontFamily: "monospace" }}>
                —
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Estado de compilación */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 2,
              mb: 3,
            }}
          >
            <Typography
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                color: "text.secondary",
                fontFamily: "monospace",
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 16 }}
              >
                account_tree
              </span>
              Estado de compilación
            </Typography>

            <Chip
              label="CONFIGURADA"
              size="small"
              color="success"
              sx={{
                fontSize: 10,
                fontWeight: 700,
                letterSpacing: 0.5,
              }}
            />
          </Box>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(4, 1fr)",
              },
              gap: 2,
            }}
          >
            {pasos.map((paso, index) => {
              const activo = index === 0;

              return (
                <Box
                  key={paso.label}
                  sx={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    gap: 1.5,
                    minHeight: 56,
                    p: 1.5,
                    border: "1px solid",
                    borderColor: activo ? "success.main" : "divider",
                    borderRadius: 2,
                    bgcolor: activo
                      ? "rgba(46, 125, 50, 0.08)"
                      : "transparent",
                  }}
                >
                  <span
                    className="material-symbols-outlined"
                    style={{
                      fontSize: 22,
                      color: activo
                        ? "var(--mui-palette-success-main)"
                        : "inherit",
                    }}
                  >
                    {paso.icon}
                  </span>

                  <Typography
                    sx={{
                      fontSize: 13,
                      fontWeight: activo ? 700 : 500,
                      color: activo ? "text.primary" : "text.secondary",
                    }}
                  >
                    {paso.label}
                  </Typography>
                </Box>
              );
            })}
          </Box>

          <Divider sx={{ my: 3 }} />

          <Typography variant="body2" color="text.secondary">
            La aplicación está configurada y lista para generar una nueva
            versión.
          </Typography>
        </CardContent>
      </Card>

      {/* Información del proceso */}
      <Card variant="outlined" sx={{ mb: 3 }}>
        <CardContent>
          <Typography
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              mb: 2,
              fontSize: 12,
              fontWeight: 600,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              color: "text.secondary",
              fontFamily: "monospace",
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{ fontSize: 16 }}
            >
              info
            </span>
            ¿Cómo funciona?
          </Typography>

          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: {
                xs: "1fr",
                md: "repeat(4, 1fr)",
              },
              gap: 2,
            }}
          >
            {[
              {
                numero: "01",
                titulo: "Configuración",
                texto: "La aplicación utiliza la configuración actual del tenant.",
              },
              {
                numero: "02",
                titulo: "Compilación",
                texto: "Se genera el .AAB utilizando el identificador del tenant.",
              },
              {
                numero: "03",
                titulo: "Verificación",
                texto: "El sistema informa si la compilación terminó correctamente.",
              },
              {
                numero: "04",
                titulo: "Descarga",
                texto: "El administrador puede descargar el archivo generado.",
              },
            ].map((item) => (
              <Box
                key={item.numero}
                sx={{
                  p: 2,
                  borderRadius: 2,
                  bgcolor: "rgba(255,255,255,0.02)",
                  border: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography
                  sx={{
                    fontFamily: "monospace",
                    fontSize: 11,
                    color: "text.secondary",
                    mb: 1,
                  }}
                >
                  {item.numero}
                </Typography>

                <Typography sx={{ fontWeight: 700, mb: 0.75 }}>
                  {item.titulo}
                </Typography>

                <Typography variant="body2" color="text.secondary">
                  {item.texto}
                </Typography>
              </Box>
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Historial */}
      <Card variant="outlined">
        <CardContent>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 3,
            }}
          >
            <Typography
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                fontSize: 12,
                fontWeight: 600,
                letterSpacing: 1.5,
                textTransform: "uppercase",
                color: "text.secondary",
                fontFamily: "monospace",
              }}
            >
              <span
                className="material-symbols-outlined"
                style={{ fontSize: 16 }}
              >
                history
              </span>
              Historial de compilaciones
            </Typography>
          </Box>

          <Box
            sx={{
              py: 5,
              textAlign: "center",
              border: "1px dashed",
              borderColor: "divider",
              borderRadius: 2,
            }}
          >
            <span
              className="material-symbols-outlined"
              style={{
                fontSize: 34,
                opacity: 0.45,
              }}
            >
              inventory_2
            </span>

            <Typography sx={{ mt: 1, fontWeight: 600 }}>
              Todavía no hay compilaciones
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
              Las versiones generadas aparecerán aquí.
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
}