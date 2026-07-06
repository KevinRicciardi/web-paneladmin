export interface Tenant {
  id: number;
  nombre: string;
  slug: string;
  logoUrl?: string | null;
  bannerUrl?: string | null;
  colorPrimario?: string | null;
  colorSecundario?: string | null;
  streamUrl?: string | null;
}

export interface Perfil {
  id: number;
  email: string;
  rol: string;
  tenantId: number;
  tenant: Tenant;
}