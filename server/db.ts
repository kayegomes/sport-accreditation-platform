import { eq, and, desc, sql, inArray, like, or } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { 
  InsertUser, users,
  suppliers, InsertSupplier,
  jobFunctions, InsertJobFunction,
  events, InsertEvent,
  eventFunctionLimits, InsertEventFunctionLimit,
  collaborators, InsertCollaborator,
  accreditations, InsertAccreditation,
  documents, InsertDocument,
  auditLogs, InsertAuditLog,
  notifications, InsertNotification,
  batchImports, InsertBatchImport,
  exports as exportsTable, InsertExport,
  eventSuppliers, InsertEventSupplier,
  vehicles, InsertVehicle
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && ENV.databaseUrl) {
    try {
      console.log("[Database] Connecting to:", ENV.databaseUrl.split('@')[1]); // Log host only for security
      _db = drizzle(ENV.databaseUrl);
    } catch (error) {
      console.error("[Database] Failed to initialize Drizzle:", error);
      _db = null;
    }
  }
  return _db;
}

// ============================================================================
// USER MANAGEMENT
// ============================================================================

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }
    if (user.supplierId !== undefined) {
      values.supplierId = user.supplierId;
      updateSet.supplierId = user.supplierId;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(users).orderBy(desc(users.createdAt));
}

export async function updateUserRole(userId: number, role: 'admin' | 'gestor' | 'fornecedor' | 'consulta') {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set({ role }).where(eq(users.id, userId));
}

export async function updateUser(id: number, data: Partial<InsertUser>) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(data).where(eq(users.id, id));
}

export async function createUser(user: InsertUser) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(users).values(user);
  return result;
}

// ============================================================================
// SUPPLIERS
// ============================================================================

export async function createSupplier(supplier: InsertSupplier) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(suppliers).values(supplier);
  return result;
}

export async function getSupplierById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(suppliers).where(eq(suppliers.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllSuppliers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(suppliers).where(eq(suppliers.active, true)).orderBy(suppliers.name);
}

export async function updateSupplier(id: number, data: Partial<InsertSupplier>) {
  const db = await getDb();
  if (!db) return;
  await db.update(suppliers).set(data).where(eq(suppliers.id, id));
}

export async function deleteSupplier(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(suppliers).set({ active: false }).where(eq(suppliers.id, id));
}

// ============================================================================
// JOB FUNCTIONS
// ============================================================================

export async function createJobFunction(jobFunction: InsertJobFunction) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(jobFunctions).values(jobFunction);
  return result;
}

export async function getJobFunctionById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(jobFunctions).where(eq(jobFunctions.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllJobFunctions() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(jobFunctions).where(eq(jobFunctions.active, true)).orderBy(jobFunctions.name);
}

export async function updateJobFunction(id: number, data: Partial<InsertJobFunction>) {
  const db = await getDb();
  if (!db) return;
  await db.update(jobFunctions).set(data).where(eq(jobFunctions.id, id));
}

export async function deleteJobFunction(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(jobFunctions).set({ active: false }).where(eq(jobFunctions.id, id));
}

// ============================================================================
// EVENTS
// ============================================================================

export async function createEvent(event: InsertEvent) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(events).values(event);
  return result;
}

export async function getEventById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(events).where(eq(events.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllEvents() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(events).where(eq(events.active, true)).orderBy(desc(events.eventDate));
}

export async function getEventsByStatus(status: string) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(events)
    .where(and(
      eq(events.active, true),
      eq(events.status, status as any)
    ))
    .orderBy(desc(events.eventDate));
}

export async function updateEvent(id: number, data: Partial<InsertEvent>) {
  const db = await getDb();
  if (!db) return;
  await db.update(events).set(data).where(eq(events.id, id));
}

export async function deleteEvent(id: number) {
  const db = await getDb();
  if (!db) return;
  // Soft delete by setting active to false
  await db.update(events).set({ active: false }).where(eq(events.id, id));
}

export async function searchEvents(filters: {
  wo?: string;
  federation?: string;
  status?: string;
  eventType?: string;
}) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(events.active, true)];
  
  if (filters.wo) {
    conditions.push(like(events.wo, `%${filters.wo}%`));
  }
  if (filters.federation) {
    conditions.push(eq(events.federation, filters.federation));
  }
  if (filters.status) {
    conditions.push(eq(events.status, filters.status as any));
  }
  if (filters.eventType) {
    conditions.push(eq(events.eventType, filters.eventType));
  }
  
  return await db.select().from(events).where(and(...conditions)).orderBy(desc(events.eventDate));
}

// ============================================================================
// EVENT FUNCTION LIMITS
// ============================================================================

export async function setEventFunctionLimit(limit: InsertEventFunctionLimit) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(eventFunctionLimits).values(limit);
  return result;
}

export async function getEventFunctionLimits(eventId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(eventFunctionLimits).where(eq(eventFunctionLimits.eventId, eventId));
}

export async function updateEventFunctionLimit(id: number, maxCount: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(eventFunctionLimits).set({ maxCount }).where(eq(eventFunctionLimits.id, id));
}

// ============================================================================
// COLLABORATORS
// ============================================================================

export async function createCollaborator(collaborator: InsertCollaborator) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(collaborators).values(collaborator);
  return result;
}

export async function getCollaboratorById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(collaborators).where(eq(collaborators.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getCollaboratorByCPF(cpf: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(collaborators).where(eq(collaborators.cpf, cpf)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getCollaboratorsBySupplier(supplierId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(collaborators)
    .where(and(
      eq(collaborators.supplierId, supplierId),
      eq(collaborators.active, true)
    ))
    .orderBy(collaborators.name);
}

export async function getAllCollaborators() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(collaborators)
    .where(eq(collaborators.active, true))
    .orderBy(collaborators.name);
}

export async function updateCollaborator(id: number, data: Partial<InsertCollaborator>) {
  const db = await getDb();
  if (!db) return;
  await db.update(collaborators).set(data).where(eq(collaborators.id, id));
}

export async function deleteCollaborator(id: number) {
  const db = await getDb();
  if (!db) return;
  // Soft delete by setting active to false
  await db.update(collaborators).set({ active: false }).where(eq(collaborators.id, id));
}

export async function searchCollaborators(filters: {
  supplierId?: number;
  name?: string;
  cpf?: string;
  email?: string;
}) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(collaborators.active, true)];
  
  if (filters.supplierId) {
    conditions.push(eq(collaborators.supplierId, filters.supplierId));
  }
  if (filters.name) {
    conditions.push(like(collaborators.name, `%${filters.name}%`));
  }
  if (filters.cpf) {
    conditions.push(like(collaborators.cpf, `%${filters.cpf}%`));
  }
  if (filters.email) {
    conditions.push(like(collaborators.email, `%${filters.email}%`));
  }
  
  return await db.select().from(collaborators).where(and(...conditions)).orderBy(collaborators.name);
}

// ============================================================================
// VEHICLES
// ============================================================================

export async function createVehicle(vehicle: InsertVehicle) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(vehicles).values(vehicle);
  return result;
}

export async function getVehicleById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(vehicles).where(eq(vehicles.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getVehiclesBySupplier(supplierId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(vehicles)
    .where(and(
      eq(vehicles.supplierId, supplierId),
      eq(vehicles.active, true)
    ))
    .orderBy(desc(vehicles.createdAt));
}

export async function getAllVehicles() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(vehicles)
    .where(eq(vehicles.active, true))
    .orderBy(desc(vehicles.createdAt));
}

export async function updateVehicle(id: number, data: Partial<InsertVehicle>) {
  const db = await getDb();
  if (!db) return;
  await db.update(vehicles).set(data).where(eq(vehicles.id, id));
}

export async function deleteVehicle(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(vehicles).set({ active: false }).where(eq(vehicles.id, id));
}

export async function searchVehicles(filters: {
  supplierId?: number;
  plate?: string;
  model?: string;
}) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [eq(vehicles.active, true)];
  
  if (filters.supplierId) {
    conditions.push(eq(vehicles.supplierId, filters.supplierId));
  }
  if (filters.plate) {
    conditions.push(like(vehicles.plate, `%${filters.plate}%`));
  }
  if (filters.model) {
    conditions.push(like(vehicles.model, `%${filters.model}%`));
  }
  
  return await db.select().from(vehicles).where(and(...conditions)).orderBy(desc(vehicles.createdAt));
}

// ============================================================================
// ACCREDITATIONS
// ============================================================================

export async function createAccreditation(accreditation: InsertAccreditation) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(accreditations).values(accreditation);
  return result;
}

export async function getAccreditationById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(accreditations).where(eq(accreditations.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAccreditationsByEvent(eventId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(accreditations)
    .where(eq(accreditations.eventId, eventId))
    .orderBy(desc(accreditations.createdAt));
}

export async function getAccreditationsByCollaborator(collaboratorId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(accreditations)
    .where(eq(accreditations.collaboratorId, collaboratorId))
    .orderBy(desc(accreditations.createdAt));
}

export async function updateAccreditation(id: number, data: Partial<InsertAccreditation>) {
  const db = await getDb();
  if (!db) return;
  await db.update(accreditations).set(data).where(eq(accreditations.id, id));
}

export async function deleteAccreditation(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(accreditations).where(eq(accreditations.id, id));
}

export async function getAccreditationCountByEventAndFunction(eventId: number, jobFunctionId: number) {
  const db = await getDb();
  if (!db) return 0;
  
  const result = await db.select({ count: sql<number>`count(*)` })
    .from(accreditations)
    .where(and(
      eq(accreditations.eventId, eventId),
      eq(accreditations.jobFunctionId, jobFunctionId),
      inArray(accreditations.status, ['pendente', 'aprovado', 'credenciado'])
    ));
  
  return result[0]?.count || 0;
}

// ============================================================================
// DOCUMENTS
// ============================================================================

export async function createDocument(document: InsertDocument) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(documents).values(document);
  return result;
}

export async function getDocumentsByCollaborator(collaboratorId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(documents)
    .where(eq(documents.collaboratorId, collaboratorId))
    .orderBy(desc(documents.uploadedAt));
}

export async function deleteDocument(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(documents).where(eq(documents.id, id));
}

// ============================================================================
// AUDIT LOGS
// ============================================================================

export async function createAuditLog(log: InsertAuditLog) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(auditLogs).values(log);
  } catch (error) {
    console.error("[Database] Failed to create audit log:", error);
  }
}

export async function getAuditLogs(filters?: {
  userId?: number;
  entityType?: string;
  entityId?: number;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  
  const conditions = [];
  
  if (filters?.userId) {
    conditions.push(eq(auditLogs.userId, filters.userId));
  }
  if (filters?.entityType) {
    conditions.push(eq(auditLogs.entityType, filters.entityType));
  }
  if (filters?.entityId) {
    conditions.push(eq(auditLogs.entityId, filters.entityId));
  }
  if (filters?.action) {
    conditions.push(eq(auditLogs.action, filters.action));
  }
  if (filters?.startDate) {
    conditions.push(sql`${auditLogs.createdAt} >= ${filters.startDate}`);
  }
  if (filters?.endDate) {
    conditions.push(sql`${auditLogs.createdAt} <= ${filters.endDate}`);
  }
  
  let query = db.select().from(auditLogs);
  
  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as any;
  }
  
  query = query.orderBy(desc(auditLogs.createdAt)) as any;
  
  if (filters?.limit) {
    query = query.limit(filters.limit) as any;
  }
  
  return await query;
}

// ============================================================================
// NOTIFICATIONS
// ============================================================================

export async function createNotification(notification: InsertNotification) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(notifications).values(notification);
  return result;
}

export async function getPendingNotifications() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(notifications)
    .where(eq(notifications.status, 'pending'))
    .orderBy(notifications.createdAt);
}

export async function updateNotificationStatus(id: number, status: 'sent' | 'failed', errorMessage?: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({
    status,
    sentAt: status === 'sent' ? new Date() : undefined,
    errorMessage
  }).where(eq(notifications.id, id));
}

// ============================================================================
// BATCH IMPORTS
// ============================================================================

export async function createBatchImport(batchImport: InsertBatchImport) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(batchImports).values(batchImport);
  return result;
}

export async function getBatchImportById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(batchImports).where(eq(batchImports.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function updateBatchImport(id: number, data: Partial<InsertBatchImport>) {
  const db = await getDb();
  if (!db) return;
  await db.update(batchImports).set(data).where(eq(batchImports.id, id));
}

export async function getBatchImportsBySupplier(supplierId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(batchImports)
    .where(eq(batchImports.supplierId, supplierId))
    .orderBy(desc(batchImports.createdAt));
}

// ============================================================================
// EXPORTS
// ============================================================================

export async function createExport(exportRecord: InsertExport) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(exportsTable).values(exportRecord);
  return result;
}

export async function getExportsByEvent(eventId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(exportsTable)
    .where(eq(exportsTable.eventId, eventId))
    .orderBy(desc(exportsTable.exportedAt));
}

export async function getAllExports() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(exportsTable)
    .orderBy(desc(exportsTable.exportedAt))
    .limit(100);
}


// ============================================================================
// EVENT SUPPLIER ACCESS CONTROL
// ============================================================================

export async function grantEventAccess(eventSupplier: InsertEventSupplier) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.insert(eventSuppliers).values(eventSupplier);
  return Number((result as any).insertId);
}

export async function revokeEventAccess(eventId: number, supplierId: number, revokedBy: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  await db.update(eventSuppliers)
    .set({ 
      active: false, 
      revokedBy,
      revokedAt: new Date()
    })
    .where(
      and(
        eq(eventSuppliers.eventId, eventId),
        eq(eventSuppliers.supplierId, supplierId)
      )
    );
}

export async function getEventSupplierAccess(eventId: number, supplierId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const result = await db.select()
    .from(eventSuppliers)
    .where(
      and(
        eq(eventSuppliers.eventId, eventId),
        eq(eventSuppliers.supplierId, supplierId),
        eq(eventSuppliers.active, true)
      )
    )
    .limit(1);
  
  return result.length > 0 ? result[0] : null;
}

export async function getEventSuppliers(eventId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.select()
    .from(eventSuppliers)
    .where(eq(eventSuppliers.eventId, eventId))
    .orderBy(desc(eventSuppliers.createdAt));
}

export async function getSupplierEvents(supplierId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  return await db.select()
    .from(eventSuppliers)
    .where(
      and(
        eq(eventSuppliers.supplierId, supplierId),
        eq(eventSuppliers.active, true)
      )
    )
    .orderBy(desc(eventSuppliers.createdAt));
}

/**
 * Check if a user can access an event
 * Rules:
 * - Admin can access all events
 * - External users (fornecedor) can only access events where their supplier is granted access
 * - Confidential events require explicit access grant
 */
export async function canUserAccessEvent(userId: number, eventId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  // Get user
  const user = await getUserById(userId);
  if (!user) return false;
  
  // Admin can access all events
  if (user.role === 'admin') return true;
  
  // Get event
  const event = await getEventById(eventId);
  if (!event || !event.active) return false;
  
  // External user must have supplier
  if (!user.supplierId) return false;
  
  // Check if supplier has access to this event
  const access = await getEventSupplierAccess(eventId, user.supplierId);
  return access !== null;
}

/**
 * Get accessible events for a user
 * Rules:
 * - Admin sees all active events
 * - External users see only events their supplier has access to
 * - Past events are excluded from default listing
 */
export async function getAccessibleEvents(userId: number, includePast: boolean = false) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  
  const user = await getUserById(userId);
  if (!user) return [];
  
  // Admin sees all events
  if (user.role === 'admin') {
    const conditions = [eq(events.active, true)];
    
    // Filter out past events unless explicitly requested
    if (!includePast) {
      conditions.push(sql`${events.eventDate} >= CURDATE()`);
    }
    
    return await db.select()
      .from(events)
      .where(and(...conditions))
      .orderBy(desc(events.eventDate));
  }
  
  // External user - get events their supplier has access to
  if (!user.supplierId) return [];
  
  const supplierAccess = await getSupplierEvents(user.supplierId);
  if (supplierAccess.length === 0) return [];
  
  const eventIds = supplierAccess.map(access => access.eventId);
  
  const conditions = [
    eq(events.active, true),
    inArray(events.id, eventIds)
  ];
  
  // Filter out past events unless explicitly requested
  if (!includePast) {
    conditions.push(sql`${events.eventDate} >= CURDATE()`);
  }
  
  return await db.select()
    .from(events)
    .where(and(...conditions))
    .orderBy(desc(events.eventDate));
}
