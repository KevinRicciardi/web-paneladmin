export interface Tenant {
  id: number;
  nombre: string;
  slug: string;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  colorPrimario?: string | null;
  colorSecundario?: string | null;
  streamUrl?: string | null;
  streamActivo?: boolean;
  tipoTransmision?: string;
  imagenPortada?: string;
  colorFondo?: string;
  colorCabecera?: string;
  colorTexto?: string;
  colorBotones?: string | null;
  colorCardFondo?: string | null;
  colorIconos?: string | null;
}

export interface Perfil {
  id: number;
  email: string;
  rol: string;
  tenantId: number;
  tenant: Tenant;
}