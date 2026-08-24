export interface AdminUser {
  email: string;
  rol: string;
  activo?: boolean;
}

export interface Tenant {
  id: number;
  nombre: string;
  slug: string;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  streamUrl?: string | null;
  streamActivo?: boolean;
  streamProvider?: string | null;
  youtubeChannelId?: string | null;
  tipoTransmision?: string;
  imagenPortada?: string;

  instagramUrl?: string | null;
  youtubeUrl?: string | null;
  tiktokUrl?: string | null;
  facebookUrl?: string | null;
  twitterUrl?: string | null;
  linkedinUrl?: string | null;
  whatsappUrl?: string | null;

  colorPrimario?: string | null;
  colorSecundario?: string | null;
  colorFondo?: string;
  colorCabecera?: string;
  colorTexto?: string;

  colorTextoCabecera?: string | null; // extra
  colorBotones?: string | null; // extra
  colorCardFondo?: string | null; // extra
  colorIconos?: string | null; // extra

  admins?: AdminUser[];
  fontFamily?: string | null; // Fuente personalizada (ej: "Roboto", "Montserrat", etc.)
  temasPersonalizados?: string | null;
}

export interface Perfil {
  id: number;
  email: string;
  rol: string;
  tenantId: number;
  tenant: Tenant;
}

export type NewsStatus = "draft" | "published";

export interface News {
  id: number;
  tenantId: number;
  title: string;
  excerpt?: string | null;
  coverImageUrl?: string | null;
  content: string;
  contentFormat: string;
  status: NewsStatus;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NewsPayload {
  title: string;
  coverImageUrl?: string;
  content: string;
  contentFormat: "markdown";
  status: NewsStatus;
}

export type DiasSemana = "LUN_VIE" | "SABADOS" | "DOMINGOS" | "TODOS" | "PERSONALIZADO" | "FECHA_ESPECIFICA";

export interface Programa {
  id: number;
  tenantId: number;
  titulo: string;
  descripcion?: string | null;
  imagenUrl?: string | null;
  dias: DiasSemana;
  diasPersonalizados?: string[] | null;
  fechaInicio?: string | null;
  fechaFin?: string | null;
  horaInicio: string;
  horaFin: string;
  orden: number;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProgramaPayload {
  titulo: string;
  descripcion?: string;
  imagenUrl?: string;
  dias: DiasSemana;
  diasPersonalizados?: string[];
  fechaInicio?: string;
  fechaFin?: string;
  horaInicio: string;
  horaFin: string;
  orden?: number;
  activo?: boolean;
}