"use client";

import { useCallback, useEffect, useState } from "react";

import {
  listOpmeSuppliers,
  listTenantMembersForPicker,
} from "@/features/settings/app/services/tenant-settings.service";

type UseTenantSettingsPickersOptions = {
  enabled?: boolean;
  fallbackErrorMessage: string;
};

type TenantMemberPicker = {
  userId: string;
  name: string | null;
  email: string;
};

type OpmeSupplierPicker = {
  id: string;
  name: string;
};

export function useTenantSettingsPickers({
  enabled = true,
  fallbackErrorMessage,
}: UseTenantSettingsPickersOptions) {
  const [members, setMembers] = useState<TenantMemberPicker[] | null>(null);
  const [suppliers, setSuppliers] = useState<OpmeSupplierPicker[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!enabled) return;
    setError(null);
    try {
      const [memberResponse, supplierResponse] = await Promise.all([
        listTenantMembersForPicker(),
        listOpmeSuppliers({ limit: 100 }),
      ]);
      setMembers(memberResponse.members);
      setSuppliers(supplierResponse.data.map((supplier) => ({ id: supplier.id, name: supplier.name })));
    } catch (e) {
      setError(e instanceof Error ? e.message : fallbackErrorMessage);
      setMembers([]);
      setSuppliers([]);
    }
  }, [enabled, fallbackErrorMessage]);

  useEffect(() => {
    if (!enabled) return;
    void reload();
  }, [enabled, reload]);

  const appendSupplier = useCallback((supplier: OpmeSupplierPicker) => {
    setSuppliers((prev) => [...(prev ?? []), supplier]);
  }, []);

  return {
    members,
    suppliers,
    error,
    reload,
    appendSupplier,
  };
}
