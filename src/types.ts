export interface Tenant {
  id: number;
  nombre: string;
  slug: string;
  branding?: string;
  activo?: boolean;
}

export interface Perfil {
  id: number;
  email: string;
  rol: string;
  firebaseUid: string;
  tenantId: number;
  tenant?: Tenant;
}