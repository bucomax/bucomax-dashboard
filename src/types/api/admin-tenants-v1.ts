export type CreateAdminTenantRequestBody = {
  name: string;
  slug: string;
};

export type AdminTenantDto = {
  id: string;
  name: string;
  slug: string;
};

export type AdminTenantListItemDto = AdminTenantDto & {
  isActive: boolean;
};

export type ListAdminTenantsResponseData = {
  tenants: AdminTenantListItemDto[];
};

export type PatchAdminTenantRequestBody = {
  isActive: boolean;
};

export type PatchAdminTenantResponseData = {
  tenant: AdminTenantListItemDto;
};

export type CreateAdminTenantResponseData = {
  tenant: AdminTenantDto;
};
