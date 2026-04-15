export type ActorKey = "admin" | "user";

export type LibraryFileSeed = {
  alias: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
};

export type StageSeed = {
  key: string;
  name: string;
  patientMessage: string;
  alertWarningDays: number;
  alertCriticalDays: number;
  checklist: string[];
  documentAliases: string[];
};

export type PathwaySeed = {
  key: string;
  name: string;
  description: string;
  publishedStages: StageSeed[];
  draftStages?: StageSeed[];
};

export type ClientSeed = {
  key: string;
  name: string;
  phone: string;
  email?: string;
  documentId?: string | null;
  caseDescription: string;
  createdDaysAgo: number;
  assignedTo?: ActorKey | null;
  supplierName?: string | null;
  pathwayKey?: string;
  currentStageKey?: string;
  enteredStageDaysAgo?: number;
  completedChecklistCount?: number;
  noteCount?: number;
  /** Sem seed de `FileAsset` por paciente (apenas metadados de jornada). */
  clientFileCount?: number;
  postalCode?: string | null;
  addressLine?: string | null;
  addressNumber?: string | null;
  addressComp?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  isMinor?: boolean;
  guardianName?: string | null;
  guardianDocumentId?: string | null;
  guardianPhone?: string | null;
};

export type TenantSeed = {
  slug: string;
  name: string;
  taxId: string;
  phone: string;
  addressLine: string;
  city: string;
  postalCode: string;
  affiliatedHospitals: string;
  notifications: {
    notifyCriticalAlerts: boolean;
    notifySurgeryReminders: boolean;
    notifyNewPatients: boolean;
    notifyWeeklyReport: boolean;
    notifyDocumentDelivery: boolean;
  };
  adminEmail: string;
  adminName: string;
  userEmail: string;
  userName: string;
  suppliers: { name: string; active: boolean }[];
  libraryFiles: LibraryFileSeed[];
  pathways: PathwaySeed[];
  clients: ClientSeed[];
};

export type SeedFileRef = {
  id: string;
  fileName: string;
  mimeType: string;
  r2Key: string;
};

export type SeedStageDocumentBundleItem = {
  stageDocumentId: string;
  sortOrder: number;
  file: SeedFileRef;
};

export type PathwayContext = {
  pathwayId: string;
  publishedVersionId: string;
  orderedStages: {
    id: string;
    key: string;
    name: string;
    sortOrder: number;
  }[];
  checklistItemsByStageKey: Map<string, { id: string; label: string }[]>;
  documentBundleByStageKey: Map<string, SeedStageDocumentBundleItem[]>;
};

export type TenantContext = {
  tenantId: string;
  tenantSlug: string;
  actors: Record<ActorKey, { id: string; email: string; name: string }>;
  supplierByName: Map<string, { id: string; name: string; active: boolean }>;
  pathwaysByKey: Map<string, PathwayContext>;
};
