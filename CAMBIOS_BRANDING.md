# Cambios en el Panel de Branding

## Descripción General
Se han agregado tres nuevas funcionalidades al apartado de Branding del panel administrativo:

### 1. **Redes Sociales (Mejorada con Desplegable)**
- ✅ Se reemplazó la sección anterior que mostraba todos los campos de redes sociales
- ✅ Ahora hay un **desplegable multi-selección** con 6 opciones predefinidas:
  - Instagram 🔗
  - YouTube 🎥
  - TikTok 🎵
  - Facebook 📘
  - X / Twitter 𝕏
  - LinkedIn 💼

- ✅ **Solo aparecen los campos de URL** de las redes sociales que selecciones
- ✅ Los valores se guardan en `socialMediasJson` (JSON con array de redes seleccionadas)
- ✅ Las URLs se siguen guardando en los campos individuales (`instagramUrl`, `youtubeUrl`, etc.)

### 2. **Página Web**
- ✅ Nuevo campo para agregar el enlace del sitio web oficial
- ✅ Almacenado en `websiteUrl`
- ✅ Con icono de "language" y placeholder sugestivo
- ✅ Se mostrará en el perfil del cliente para que los usuarios puedan visitarlo

### 3. **Apartado "Otro"**
- ✅ Campo de texto multilinea para contenido personalizado
- ✅ Almacenado en `otherContent`
- ✅ Pensado para agregar enlaces o información que no encaje en las categorías anteriores
- ✅ Permite flexibilidad para contenido adicional (tienda online, contacto directo, etc.)

---

## Archivos Modificados

### 1. **src/types.ts**
```typescript
// Nuevos campos agregados a la interfaz Tenant:
websiteUrl?: string | null;        // Enlace del sitio web
socialMediasJson?: string | null;  // JSON con redes sociales seleccionadas
otherContent?: string | null;      // Contenido personalizado
```

### 2. **src/services/tenant.service.ts**
```typescript
// Nuevos campos agregados a BrandingPayload:
websiteUrl?: string;       // Enlace del sitio web
socialMediasJson?: string; // JSON con redes sociales seleccionadas
otherContent?: string;     // Contenido personalizado
```

### 3. **src/pages/Branding.tsx**
Cambios realizados:
- ✅ Agregada constante `REDES_SOCIALES_DISPONIBLES` con 6 opciones
- ✅ Nuevos estados:
  - `websiteUrl`: para guardar la URL del sitio web
  - `selectedSocialMedias`: array con las redes seleccionadas
  - `otherContent`: para el contenido personalizado
- ✅ Actualizado `handleGuardar()` para incluir los nuevos campos
- ✅ Actualizado `handleDescartar()` para resetear los nuevos campos
- ✅ Reemplazada la sección de Redes Sociales con UI mejorada
- ✅ Agregadas 2 nuevas tarjetas: Página Web y Apartado "Otro"
- ✅ Sistema de desplegable multi-select funcional

---

## Características Implementadas

### Redes Sociales
- **Multi-selección**: Puedes seleccionar las redes que deseas mostrar
- **Campos condicionales**: Solo aparecen los campos de URL de las redes seleccionadas
- **Validación visual**: Las redes seleccionadas se muestran con badges coloreados
- **Almacenamiento dual**:
  - `socialMediasJson`: guarda qué redes están seleccionadas
  - `instagramUrl`, `youtubeUrl`, etc.: guardan las URLs individuales

### Página Web
- Campo de texto para URL del sitio web
- Placeholder sugestivo
- Icono de "language" para mejor visualización
- Integrado con el sistema de guardado existente

### Apartado "Otro"
- Campo de texto multilinea (3 filas por defecto)
- Pensado para flexibilidad
- Incluye helper text explicativo
- Permite agregar contenido personalizado no categorizado

---

## Cómo Usar

1. **En el Panel de Branding**, ve a la sección **"Redes Sociales"**
2. Selecciona desde el desplegable cuáles redes deseas mostrar
3. Ingresa las URLs de cada red seleccionada
4. Completa el campo "Página Web" con el enlace de tu sitio
5. (Opcional) Agrega contenido personalizado en el apartado "Otro"
6. Haz clic en **"Guardar Configuración"**

---

## Notas Técnicas

- Los nuevos campos son **opcionales**
- Compatibilidad con el sistema de permisos existente (solo administradores pueden modificar)
- Los cambios se guardan en la base de datos mediante PATCH a `/tenants/mi-tenant`
- Evento `tenantUpdated` se dispara después de guardar (para actualizar la UI en tiempo real)
- Sistema de Cloudinary se mantiene para carga de imágenes

---

## Proximos Pasos (Opcional)

Si necesitas:
- Validar URLs (agregar expresiones regulares)
- Mostrar las redes sociales en la aplicación cliente
- Agregar más redes sociales (WhatsApp, Telegram, etc.)
- Personalizar el apartado "Otro" con más opciones

Avísame y lo implemento.
