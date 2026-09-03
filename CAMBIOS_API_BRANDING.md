# Cambios en la API para Branding

## Resumen de cambios en el Frontend

Se han implementado nuevos campos en el panel de Branding:

1. **Página Web** (`websiteUrl`) - Campo simple de texto
2. **Contenido Personalizado** (`otherContentJson`) - Array de objetos con nombre + enlace

Ahora el usuario puede agregar **múltiples enlaces personalizados** con nombre y URL.

---

## Cambios requeridos en la Base de Datos

### Agregar nuevas columnas a la tabla `tenants`

```sql
-- Si no existe, agregar las columnas
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS website_url VARCHAR(255);
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS other_content_json JSONB DEFAULT '[]'::jsonb;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS support_email VARCHAR(255);

-- Opcional: eliminar la columna vieja si existe
-- ALTER TABLE tenants DROP COLUMN IF NOT EXISTS other_content;
```

### Estructura esperada en la BD:

```
tenants
├── id
├── nombre
├── slug
├── ...
├── websiteUrl (VARCHAR 255) - Enlace del sitio web
├── socialMediasJson (JSONB) - ['instagram', 'youtube', ...] - Ya existía
└── otherContentJson (JSONB) - [
    { "nombre": "WhatsApp", "enlace": "https://wa.me/..." },
    { "nombre": "Tienda Online", "enlace": "https://tienda.com" }
  ]
```

---

## Cambios en la API (Nest.js)

### 1. Actualizar el DTO `UpdateBrandingDto`

En `src/dto/` (o donde tengas el DTO):

```typescript
export class UpdateBrandingDto {
  nombre?: string;
  logoUrl?: string;
  bannerUrl?: string;
  fontFamily?: string;
  
  // Redes sociales
  instagramUrl?: string;
  youtubeUrl?: string;
  tiktokUrl?: string;
  facebookUrl?: string;
  twitterUrl?: string;
  linkedinUrl?: string;
  whatsappUrl?: string;
  supportEmail?: string;
  
  // Colores
  colorPrimario?: string;
  colorSecundario?: string;
  colorFondo?: string;
  colorCabecera?: string;
  colorTexto?: string;
  colorTextoCabecera?: string;
  colorBotones?: string;
  colorCardFondo?: string;
  colorIconos?: string;
  
  temasPersonalizados?: string;
  
  // NUEVOS CAMPOS
  websiteUrl?: string;          // URL del sitio web
  socialMediasJson?: string;    // JSON array de redes seleccionadas
  otherContentJson?: string;    // JSON array: [{ nombre, enlace }, ...]
}
```

### 2. Actualizar la entidad `Tenant` (Prisma)

En `prisma/schema.prisma`:

```prisma
model Tenant {
  id                    Int       @id @default(autoincrement())
  nombre                String
  slug                  String    @unique
  
  // ... campos existentes ...
  
  websiteUrl            String?   // Nuevo: enlace del sitio web
  socialMediasJson      String?   // Redes sociales seleccionadas (JSON string)
  otherContentJson      String?   @default("[]") // Nuevo: enlaces personalizados (JSON string)
  supportEmail          String?   @map("support_email") // Correo adicional de Soporte
  
  // ... relaciones ...
}
```

Luego ejecutar:
```bash
npx prisma migrate dev --name add_branding_fields
```

El endpoint debe permitir `supportEmail` y mantener la autorización para que solo
`SUPER_ADMIN` y `MEGA_ADMIN` puedan actualizar o eliminar (`null`) los contactos.

### 3. Actualizar el servicio/controlador que guarda branding

Asegúrate que el endpoint `PATCH /tenants/mi-tenant` reciba y guarde estos nuevos campos:

```typescript
async updateTenantBranding(tenantId: number, data: UpdateBrandingDto) {
  return await this.prisma.tenant.update({
    where: { id: tenantId },
    data: {
      nombre: data.nombre,
      logoUrl: data.logoUrl,
      bannerUrl: data.bannerUrl,
      fontFamily: data.fontFamily,
      
      // Redes sociales
      instagramUrl: data.instagramUrl,
      youtubeUrl: data.youtubeUrl,
      tiktokUrl: data.tiktokUrl,
      facebookUrl: data.facebookUrl,
      twitterUrl: data.twitterUrl,
      linkedinUrl: data.linkedinUrl,
      whatsappUrl: data.whatsappUrl,
      supportEmail: data.supportEmail,
      
      // Colores
      colorPrimario: data.colorPrimario,
      colorSecundario: data.colorSecundario,
      colorFondo: data.colorFondo,
      colorCabecera: data.colorCabecera,
      colorTexto: data.colorTexto,
      colorTextoCabecera: data.colorTextoCabecera,
      colorBotones: data.colorBotones,
      colorCardFondo: data.colorCardFondo,
      colorIconos: data.colorIconos,
      
      // NUEVOS CAMPOS
      websiteUrl: data.websiteUrl,
      socialMediasJson: data.socialMediasJson,
      otherContentJson: data.otherContentJson,
    },
  });
}
```

### 4. Validación (Opcional pero recomendado)

En el DTO, puedes agregar validación:

```typescript
import { IsUrl, IsOptional, IsJSON } from 'class-validator';

export class UpdateBrandingDto {
  @IsOptional()
  @IsUrl()
  websiteUrl?: string;
  
  @IsOptional()
  @IsJSON()
  socialMediasJson?: string;
  
  @IsOptional()
  @IsJSON()
  otherContentJson?: string;
  
  // ... resto de campos ...
}
```

---

## Formato esperado en los payloads

### Guardar Branding

```json
{
  "nombre": "Mi Marca",
  "logoUrl": "https://...",
  "websiteUrl": "https://miwebsite.com",
  "socialMediasJson": "[\"instagram\", \"youtube\"]",
  "otherContentJson": "[
    {\"nombre\": \"WhatsApp\", \"enlace\": \"https://wa.me/...\"},
    {\"nombre\": \"Tienda Online\", \"enlace\": \"https://tienda.com\"}
  ]",
  "instagramUrl": "https://instagram.com/...",
  "youtubeUrl": "https://youtube.com/@...",
  ...
}
```

### Respuesta GET

```json
{
  "id": 1,
  "nombre": "Mi Marca",
  "logoUrl": "https://...",
  "websiteUrl": "https://miwebsite.com",
  "socialMediasJson": "[\"instagram\", \"youtube\"]",
  "otherContentJson": "[
    {\"nombre\": \"WhatsApp\", \"enlace\": \"https://wa.me/...\"},
    {\"nombre\": \"Tienda Online\", \"enlace\": \"https://tienda.com\"}
  ]",
  ...
}
```

---

## Resumen de cambios

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `websiteUrl` | VARCHAR(255) | URL del sitio web oficial |
| `socialMediasJson` | JSONB/TEXT | Array JSON con redes seleccionadas |
| `otherContentJson` | JSONB/TEXT | Array JSON con objetos `{nombre, enlace}` |

---

## Nota importante

El frontend espera que estos campos sean strings (JSON serializado), no objetos. La API debe:
- **Guardar**: aceptar strings JSON y almacenarlos como está
- **Retornar**: devolver strings JSON (no parsearlos)

El frontend se encarga de parsear/serializar.

Ejemplo correcto:
```
API recibe: "otherContentJson": "[{\"nombre\":\"WhatsApp\", ...}]"
API guarda: "[{\"nombre\":\"WhatsApp\", ...}]"
API retorna: "[{\"nombre\":\"WhatsApp\", ...}]"
```
