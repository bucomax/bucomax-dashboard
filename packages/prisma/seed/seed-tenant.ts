import {
  GlobalRole,
  NotificationType,
  type PrismaClient,
  TenantRole,
} from "@prisma/client";

import type {
  PathwayContext,
  SeedFileRef,
  SeedStageDocumentBundleItem,
  TenantContext,
  TenantSeed,
} from "./types";
import {
  buildDaysAgoTimeline,
  buildDispatchStub,
  buildGraphJson,
  daysAgo,
  safeKeyPart,
} from "./utils";

export async function upsertUser(
  prisma: PrismaClient,
  input: {
    email: string;
    name: string;
    passwordHash: string;
    globalRole?: GlobalRole;
  },
) {
  return prisma.user.upsert({
    where: { email: input.email },
    create: {
      email: input.email,
      name: input.name,
      passwordHash: input.passwordHash,
      globalRole: input.globalRole ?? GlobalRole.user,
      emailVerified: new Date(),
    },
    update: {
      name: input.name,
      passwordHash: input.passwordHash,
      globalRole: input.globalRole ?? GlobalRole.user,
      emailVerified: new Date(),
      deletedAt: null,
    },
  });
}

async function seedPathways(
  prisma: PrismaClient,
  tenantId: string,
  tenantSlug: string,
  pathways: TenantSeed["pathways"],
  libraryFilesByAlias: Map<string, SeedFileRef>,
) {
  const pathwaysByKey = new Map<string, PathwayContext>();

  for (const pathwaySeed of pathways) {
    const pathway = await prisma.carePathway.create({
      data: {
        tenantId,
        name: pathwaySeed.name,
        description: pathwaySeed.description,
        createdAt: daysAgo(90),
      },
    });

    const publishedVersion = await prisma.pathwayVersion.create({
      data: {
        pathwayId: pathway.id,
        version: 1,
        published: true,
        graphJson: buildGraphJson(pathwaySeed.publishedStages),
        createdAt: daysAgo(75),
      },
    });

    const draftStages = pathwaySeed.draftStages ?? pathwaySeed.publishedStages;
    await prisma.pathwayVersion.create({
      data: {
        pathwayId: pathway.id,
        version: 2,
        published: false,
        graphJson: buildGraphJson(draftStages),
        createdAt: daysAgo(8),
      },
    });

    const orderedStages: PathwayContext["orderedStages"] = [];
    const checklistItemsByStageKey = new Map<string, { id: string; label: string }[]>();
    const documentBundleByStageKey = new Map<string, SeedStageDocumentBundleItem[]>();

    for (const [stageIndex, stageSeed] of pathwaySeed.publishedStages.entries()) {
      const stage = await prisma.pathwayStage.create({
        data: {
          pathwayVersionId: publishedVersion.id,
          stageKey: stageSeed.key,
          name: stageSeed.name,
          sortOrder: stageIndex,
          patientMessage: stageSeed.patientMessage,
          alertWarningDays: stageSeed.alertWarningDays,
          alertCriticalDays: stageSeed.alertCriticalDays,
        },
      });

      orderedStages.push({
        id: stage.id,
        key: stage.stageKey,
        name: stage.name,
        sortOrder: stage.sortOrder,
      });

      const checklistRows: { id: string; label: string }[] = [];
      for (const [checkIndex, label] of stageSeed.checklist.entries()) {
        const created = await prisma.pathwayStageChecklistItem.create({
          data: {
            pathwayStageId: stage.id,
            label,
            sortOrder: checkIndex,
          },
        });
        checklistRows.push({ id: created.id, label: created.label });
      }
      checklistItemsByStageKey.set(stageSeed.key, checklistRows);

      const bundleRows: SeedStageDocumentBundleItem[] = [];
      for (const [docIndex, alias] of stageSeed.documentAliases.entries()) {
        const file = libraryFilesByAlias.get(alias);
        if (!file) {
          throw new Error(`Arquivo de biblioteca nao encontrado no seed: ${alias} (${tenantSlug})`);
        }

        const stageDocument = await prisma.stageDocument.create({
          data: {
            pathwayStageId: stage.id,
            fileAssetId: file.id,
            sortOrder: docIndex,
          },
        });

        bundleRows.push({
          stageDocumentId: stageDocument.id,
          sortOrder: docIndex,
          file: {
            id: file.id,
            fileName: file.fileName,
            mimeType: file.mimeType,
            r2Key: file.r2Key,
          },
        });
      }
      documentBundleByStageKey.set(stageSeed.key, bundleRows);
    }

    pathwaysByKey.set(pathwaySeed.key, {
      pathwayId: pathway.id,
      publishedVersionId: publishedVersion.id,
      orderedStages,
      checklistItemsByStageKey,
      documentBundleByStageKey,
    });
  }

  return pathwaysByKey;
}

export async function seedTenant(
  prisma: PrismaClient,
  input: {
    seed: TenantSeed;
    passwordHash: string;
    superUserId: string;
  },
) {
  const { seed, passwordHash, superUserId } = input;

  const tenant = await prisma.tenant.create({
    data: {
      name: seed.name,
      slug: seed.slug,
      taxId: seed.taxId,
      phone: seed.phone,
      addressLine: seed.addressLine,
      city: seed.city,
      postalCode: seed.postalCode,
      affiliatedHospitals: seed.affiliatedHospitals,
      ...seed.notifications,
    },
  });

  const admin = await upsertUser(prisma, {
    email: seed.adminEmail,
    name: seed.adminName,
    passwordHash,
  });
  const memberUser = await upsertUser(prisma, {
    email: seed.userEmail,
    name: seed.userName,
    passwordHash,
  });

  const actors = {
    admin: { id: admin.id, email: admin.email, name: admin.name ?? seed.adminName },
    user: { id: memberUser.id, email: memberUser.email, name: memberUser.name ?? seed.userName },
  } satisfies TenantContext["actors"];

  for (const [userId, role] of [
    [admin.id, TenantRole.tenant_admin],
    [memberUser.id, TenantRole.tenant_user],
    [superUserId, TenantRole.tenant_admin],
  ] as const) {
    await prisma.tenantMembership.create({
      data: {
        userId,
        tenantId: tenant.id,
        role,
      },
    });
  }

  await prisma.user.updateMany({
    where: { id: { in: [admin.id, memberUser.id] } },
    data: { activeTenantId: tenant.id },
  });

  const supplierByName = new Map<string, { id: string; name: string; active: boolean }>();
  for (const supplierSeed of seed.suppliers) {
    const supplier = await prisma.opmeSupplier.create({
      data: {
        tenantId: tenant.id,
        name: supplierSeed.name,
        active: supplierSeed.active,
      },
    });
    supplierByName.set(supplier.name, { id: supplier.id, name: supplier.name, active: supplier.active });
  }

  const libraryFilesByAlias = new Map<string, SeedFileRef>();
  for (const fileSeed of seed.libraryFiles) {
    const r2Key = `tenants/${tenant.id}/library/${fileSeed.alias}-${safeKeyPart(fileSeed.fileName)}`;
    const file = await prisma.fileAsset.create({
      data: {
        tenantId: tenant.id,
        uploadedById: actors.admin.id,
        r2Key,
        fileName: fileSeed.fileName,
        mimeType: fileSeed.mimeType,
        sizeBytes: fileSeed.sizeBytes,
      },
      select: { id: true, fileName: true, mimeType: true, r2Key: true },
    });
    libraryFilesByAlias.set(fileSeed.alias, file);
  }

  const pathwaysByKey = await seedPathways(
    prisma,
    tenant.id,
    seed.slug,
    seed.pathways,
    libraryFilesByAlias,
  );

  for (const clientSeed of seed.clients) {
    const assignedActor =
      clientSeed.assignedTo && clientSeed.assignedTo in actors ? actors[clientSeed.assignedTo] : null;
    const supplier = clientSeed.supplierName ? supplierByName.get(clientSeed.supplierName) ?? null : null;

    const clientCreatedAt = daysAgo(clientSeed.createdDaysAgo, 9);
    const client = await prisma.client.create({
      data: {
        tenantId: tenant.id,
        name: clientSeed.name,
        phone: clientSeed.phone,
        email: clientSeed.email,
        caseDescription: clientSeed.caseDescription,
        documentId: clientSeed.documentId,
        assignedToUserId: assignedActor?.id ?? null,
        opmeSupplierId: supplier?.id ?? null,
        createdAt: clientCreatedAt,
      },
    });

    const fileCount = clientSeed.clientFileCount ?? 0;
    for (let index = 0; index < fileCount; index += 1) {
      await prisma.fileAsset.create({
        data: {
          tenantId: tenant.id,
          uploadedById: assignedActor?.id ?? actors.admin.id,
          clientId: client.id,
          r2Key: `tenants/${tenant.id}/clients/${client.id}/uploads/arquivo-${index + 1}.pdf`,
          fileName: `${clientSeed.key}-arquivo-${index + 1}.pdf`,
          mimeType: "application/pdf",
          sizeBytes: 140_000 + index * 11_500,
          createdAt: daysAgo(Math.max(clientSeed.createdDaysAgo - index, 0), 15),
        },
      });
    }

    const noteCount = clientSeed.noteCount ?? 0;
    for (let index = 0; index < noteCount; index += 1) {
      const author = index % 2 === 0 ? actors.admin : actors.user;
      await prisma.patientNote.create({
        data: {
          tenantId: tenant.id,
          clientId: client.id,
          authorUserId: author.id,
          content:
            index === 0
              ? `Resumo inicial do caso de ${clientSeed.name}: ${clientSeed.caseDescription}`
              : `Follow-up ${index} de ${clientSeed.name}: acompanhamento operacional e proximos passos.`,
          createdAt: daysAgo(
            Math.max((clientSeed.enteredStageDaysAgo ?? clientSeed.createdDaysAgo) - index, 0),
            16,
          ),
        },
      });
    }

    if (!clientSeed.pathwayKey || !clientSeed.currentStageKey) {
      continue;
    }

    const pathway = pathwaysByKey.get(clientSeed.pathwayKey);
    if (!pathway) {
      throw new Error(`Pathway nao encontrado no seed: ${clientSeed.pathwayKey}`);
    }

    const currentStageIndex = pathway.orderedStages.findIndex(
      (stage) => stage.key === clientSeed.currentStageKey,
    );
    if (currentStageIndex < 0) {
      throw new Error(`Etapa nao encontrada no seed: ${clientSeed.currentStageKey}`);
    }

    const currentStage = pathway.orderedStages[currentStageIndex]!;
    const enteredStageDaysAgo = clientSeed.enteredStageDaysAgo ?? clientSeed.createdDaysAgo;
    const enteredStageAt = daysAgo(enteredStageDaysAgo, 11);
    const visitedStages = pathway.orderedStages.slice(0, currentStageIndex + 1);
    const transitionDaysAgoTimeline = buildDaysAgoTimeline(
      clientSeed.createdDaysAgo,
      enteredStageDaysAgo,
      visitedStages.length,
    );
    const patientPathwayCreatedAt = daysAgo(transitionDaysAgoTimeline[0]!, 11);

    const patientPathway = await prisma.patientPathway.create({
      data: {
        tenantId: tenant.id,
        clientId: client.id,
        pathwayId: pathway.pathwayId,
        pathwayVersionId: pathway.publishedVersionId,
        currentStageId: currentStage.id,
        enteredStageAt,
        createdAt: patientPathwayCreatedAt,
      },
    });

    for (const [index, stage] of visitedStages.entries()) {
      const previousStage = index === 0 ? null : visitedStages[index - 1]!;
      const documents = pathway.documentBundleByStageKey.get(stage.key) ?? [];
      await prisma.stageTransition.create({
        data: {
          patientPathwayId: patientPathway.id,
          fromStageId: previousStage?.id ?? null,
          toStageId: stage.id,
          actorUserId: index % 2 === 0 ? actors.admin.id : actors.user.id,
          note:
            index === 0
              ? `Entrada do paciente ${clientSeed.name} na jornada ${clientSeed.pathwayKey}.`
              : `Movido para ${stage.name} apos validacao clinica.`,
          dispatchStub: buildDispatchStub({
            tenantId: tenant.id,
            clientId: client.id,
            stageId: stage.id,
            stageName: stage.name,
            correlationId: `seed-${clientSeed.key}-${stage.key}-${index + 1}`,
            documents,
          }),
          createdAt: daysAgo(transitionDaysAgoTimeline[index]!, 13),
        },
      });
    }

    const currentStageChecklist = pathway.checklistItemsByStageKey.get(currentStage.key) ?? [];
    const completedChecklistCount = Math.min(
      clientSeed.completedChecklistCount ?? 0,
      currentStageChecklist.length,
    );

    for (const [index, item] of currentStageChecklist.entries()) {
      await prisma.patientPathwayChecklistItem.create({
        data: {
          patientPathwayId: patientPathway.id,
          checklistItemId: item.id,
          completedAt:
            index < completedChecklistCount
              ? daysAgo(Math.max(enteredStageDaysAgo - (index + 1), 0), 14)
              : null,
          completedByUserId:
            index < completedChecklistCount
              ? (index % 2 === 0 ? actors.admin.id : actors.user.id)
              : null,
          createdAt: daysAgo(enteredStageDaysAgo, 14),
        },
      });
    }
  }

  await seedNotifications(prisma, tenant.id, actors);

  return {
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    actors,
    supplierByName,
    pathwaysByKey,
  } satisfies TenantContext;
}

async function seedNotifications(
  prisma: PrismaClient,
  tenantId: string,
  actors: TenantContext["actors"],
) {
  const existing = await prisma.notification.count({ where: { tenantId } });
  if (existing > 0) return;

  const samples: { type: NotificationType; title: string; body: string | null; daysAgo: number; read: boolean }[] = [
    { type: "sla_critical", title: "Alerta crítico: Maria Silva", body: "12 dias na etapa \"Pré-Operatório\".", daysAgo: 0, read: false },
    { type: "sla_warning", title: "Atenção: João Santos", body: "7 dias na etapa \"Consulta Inicial\".", daysAgo: 1, read: false },
    { type: "stage_transition", title: "Ana Costa avançou para Pós-Operatório", body: null, daysAgo: 2, read: true },
    { type: "new_patient", title: "Novo paciente: Carlos Oliveira", body: "Jornada \"Cirurgia Bucomaxilofacial\" iniciada.", daysAgo: 3, read: true },
    { type: "checklist_complete", title: "Checklist completo: Maria Silva", body: "Todos os itens da etapa \"Exames\" foram concluídos.", daysAgo: 4, read: true },
    { type: "sla_warning", title: "Atenção: Pedro Almeida", body: "5 dias na etapa \"Exames\".", daysAgo: 5, read: false },
    { type: "stage_transition", title: "Lucia Fernandes avançou para Exames", body: null, daysAgo: 6, read: true },
    { type: "new_patient", title: "Novo paciente: Roberto Lima", body: "Jornada \"Ortodontia\" iniciada.", daysAgo: 7, read: true },
  ];

  const userIds = [actors.admin.id, actors.user.id];

  for (const sample of samples) {
    const createdAt = daysAgo(sample.daysAgo, 10);
    await prisma.notification.createMany({
      data: userIds.map((userId) => ({
        tenantId,
        userId,
        type: sample.type,
        title: sample.title,
        body: sample.body,
        readAt: sample.read ? daysAgo(Math.max(sample.daysAgo - 1, 0), 12) : null,
        createdAt,
      })),
    });
  }
}
