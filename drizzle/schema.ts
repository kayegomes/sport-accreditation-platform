import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, date, index } from "drizzle-orm/mysql-core";

/**
 * Sistema de Credenciamento SporTV
 * Schema completo para gestão de eventos, colaboradores e credenciamento
 */

// ============================================================================
// USUÁRIOS E PERFIS
// ============================================================================

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["admin", "fornecedor", "consulta"]).default("fornecedor").notNull(),
  supplierId: int("supplierId"), // Vínculo com fornecedor para usuários tipo "fornecedor"
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
}, (table) => ({
  supplierIdx: index("supplier_idx").on(table.supplierId),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// ============================================================================
// FORNECEDORES/EMPRESAS
// ============================================================================

export const suppliers = mysqlTable("suppliers", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  cnpj: varchar("cnpj", { length: 18 }),
  contactName: varchar("contactName", { length: 255 }),
  contactEmail: varchar("contactEmail", { length: 320 }),
  contactPhone: varchar("contactPhone", { length: 20 }),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  cnpjIdx: index("cnpj_idx").on(table.cnpj),
}));

export type Supplier = typeof suppliers.$inferSelect;
export type InsertSupplier = typeof suppliers.$inferInsert;

// ============================================================================
// FUNÇÕES DE COLABORADORES
// ============================================================================

export const jobFunctions = mysqlTable("job_functions", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull().unique(),
  description: text("description"),
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type JobFunction = typeof jobFunctions.$inferSelect;
export type InsertJobFunction = typeof jobFunctions.$inferInsert;

// ============================================================================
// EVENTOS ESPORTIVOS
// ============================================================================

export const events = mysqlTable("events", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  wo: varchar("wo", { length: 100 }), // Work Order
  eventDate: date("eventDate").notNull(),
  registrationDeadline: date("registrationDeadline").notNull(), // D-4
  credentialReleaseDate: date("credentialReleaseDate").notNull(), // D-3
  location: varchar("location", { length: 255 }),
  eventType: varchar("eventType", { length: 100 }), // Tipo de evento (futebol, vôlei, etc)
  federation: varchar("federation", { length: 100 }), // Federação responsável
  isConfidential: boolean("isConfidential").default(false).notNull(), // Eventos confidenciais exigem vínculo explícito
  status: mysqlEnum("status", [
    "aberto",           // D-10 até D-4: cadastro aberto
    "em_verificacao",   // D-4: verificação de dados
    "extraido",         // D-3 17h: dados extraídos
    "enviado",          // D-3 18h: credenciais enviadas
    "concluido"         // Evento finalizado
  ]).default("aberto").notNull(),
  notes: text("notes"),
  active: boolean("active").default(true).notNull(),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  woIdx: index("wo_idx").on(table.wo),
  eventDateIdx: index("event_date_idx").on(table.eventDate),
  statusIdx: index("status_idx").on(table.status),
  federationIdx: index("federation_idx").on(table.federation),
}));

export type Event = typeof events.$inferSelect;
export type InsertEvent = typeof events.$inferInsert;

// ============================================================================
// LIMITES DE FUNÇÃO POR EVENTO
// ============================================================================

export const eventFunctionLimits = mysqlTable("event_function_limits", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  jobFunctionId: int("jobFunctionId").notNull(),
  maxCount: int("maxCount").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  eventFunctionIdx: index("event_function_idx").on(table.eventId, table.jobFunctionId),
}));

export type EventFunctionLimit = typeof eventFunctionLimits.$inferSelect;
export type InsertEventFunctionLimit = typeof eventFunctionLimits.$inferInsert;

// ============================================================================
// COLABORADORES
// ============================================================================

export const collaborators = mysqlTable("collaborators", {
  id: int("id").autoincrement().primaryKey(),
  supplierId: int("supplierId").notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  cpf: varchar("cpf", { length: 14 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 20 }).notNull(),
  photoUrl: text("photoUrl"), // URL da foto no S3
  defaultJobFunctionId: int("defaultJobFunctionId"), // Função padrão do colaborador
  vehicleInfo: text("vehicleInfo"), // Informações de veículo (se aplicável)
  active: boolean("active").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  cpfIdx: index("cpf_idx").on(table.cpf),
  supplierIdx: index("supplier_idx").on(table.supplierId),
  emailIdx: index("email_idx").on(table.email),
}));

export type Collaborator = typeof collaborators.$inferSelect;
export type InsertCollaborator = typeof collaborators.$inferInsert;

// ============================================================================
// CREDENCIAMENTOS (Vínculo Colaborador-Evento)
// ============================================================================

export const accreditations = mysqlTable("accreditations", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  collaboratorId: int("collaboratorId").notNull(),
  jobFunctionId: int("jobFunctionId").notNull(), // Função específica para este evento
  status: mysqlEnum("status", [
    "pendente",       // Aguardando verificação
    "aprovado",       // Aprovado para credenciamento
    "rejeitado",      // Rejeitado
    "credenciado"     // Credencial liberada
  ]).default("pendente").notNull(),
  notes: text("notes"),
  approvedBy: int("approvedBy"),
  approvedAt: timestamp("approvedAt"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  eventCollaboratorIdx: index("event_collaborator_idx").on(table.eventId, table.collaboratorId),
  eventIdx: index("event_idx").on(table.eventId),
  collaboratorIdx: index("collaborator_idx").on(table.collaboratorId),
  statusIdx: index("status_idx").on(table.status),
}));

export type Accreditation = typeof accreditations.$inferSelect;
export type InsertAccreditation = typeof accreditations.$inferInsert;

// ============================================================================
// DOCUMENTOS ANEXADOS
// ============================================================================

export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  collaboratorId: int("collaboratorId").notNull(),
  documentType: varchar("documentType", { length: 50 }).notNull(), // RG, CNH, Comprovante, etc
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileUrl: text("fileUrl").notNull(), // URL do arquivo no S3
  fileKey: varchar("fileKey", { length: 500 }).notNull(), // Chave do arquivo no S3
  mimeType: varchar("mimeType", { length: 100 }),
  fileSize: int("fileSize"), // Tamanho em bytes
  uploadedBy: int("uploadedBy").notNull(),
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
}, (table) => ({
  collaboratorIdx: index("collaborator_idx").on(table.collaboratorId),
}));

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

// ============================================================================
// LOGS DE AUDITORIA
// ============================================================================

export const auditLogs = mysqlTable("audit_logs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  userName: varchar("userName", { length: 255 }),
  action: varchar("action", { length: 50 }).notNull(), // CREATE, UPDATE, DELETE, LOGIN, EXPORT, etc
  entityType: varchar("entityType", { length: 50 }).notNull(), // EVENT, COLLABORATOR, ACCREDITATION, etc
  entityId: int("entityId"),
  details: text("details"), // JSON com detalhes da alteração
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdx: index("user_idx").on(table.userId),
  entityIdx: index("entity_idx").on(table.entityType, table.entityId),
  actionIdx: index("action_idx").on(table.action),
  createdAtIdx: index("created_at_idx").on(table.createdAt),
}));

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;

// ============================================================================
// NOTIFICAÇÕES
// ============================================================================

export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId"),
  recipientEmail: varchar("recipientEmail", { length: 320 }).notNull(),
  recipientName: varchar("recipientName", { length: 255 }),
  subject: varchar("subject", { length: 500 }).notNull(),
  body: text("body").notNull(),
  notificationType: varchar("notificationType", { length: 50 }).notNull(), // D10_OPENING, D4_CLOSING, D3_RELEASE, STATUS_CHANGE
  status: mysqlEnum("status", ["pending", "sent", "failed"]).default("pending").notNull(),
  sentAt: timestamp("sentAt"),
  errorMessage: text("errorMessage"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  eventIdx: index("event_idx").on(table.eventId),
  statusIdx: index("status_idx").on(table.status),
  typeIdx: index("type_idx").on(table.notificationType),
}));

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

// ============================================================================
// IMPORTAÇÕES EM LOTE
// ============================================================================

export const batchImports = mysqlTable("batch_imports", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId"),
  supplierId: int("supplierId").notNull(),
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  status: mysqlEnum("status", ["pending", "processing", "completed", "failed"]).default("pending").notNull(),
  totalRows: int("totalRows"),
  successRows: int("successRows"),
  errorRows: int("errorRows"),
  errorDetails: text("errorDetails"), // JSON com erros detalhados
  processedBy: int("processedBy").notNull(),
  processedAt: timestamp("processedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  eventIdx: index("event_idx").on(table.eventId),
  supplierIdx: index("supplier_idx").on(table.supplierId),
  statusIdx: index("status_idx").on(table.status),
}));

export type BatchImport = typeof batchImports.$inferSelect;
export type InsertBatchImport = typeof batchImports.$inferInsert;

// ============================================================================
// EXPORTAÇÕES
// ============================================================================

export const exports = mysqlTable("exports", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId"),
  exportType: varchar("exportType", { length: 50 }).notNull(), // COLLABORATORS, CREDENTIALS, REPORT
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  filters: text("filters"), // JSON com filtros aplicados
  exportedBy: int("exportedBy").notNull(),
  exportedAt: timestamp("exportedAt").defaultNow().notNull(),
}, (table) => ({
  eventIdx: index("event_idx").on(table.eventId),
  exportedByIdx: index("exported_by_idx").on(table.exportedBy),
}));

export type Export = typeof exports.$inferSelect;
export type InsertExport = typeof exports.$inferInsert;

// ============================================================================
// VÍNCULOS EVENTO-FORNECEDOR (Controle de Acesso)
// ============================================================================

export const eventSuppliers = mysqlTable("event_suppliers", {
  id: int("id").autoincrement().primaryKey(),
  eventId: int("eventId").notNull(),
  supplierId: int("supplierId").notNull(),
  grantedBy: int("grantedBy").notNull(), // Usuário admin que concedeu o acesso
  grantedAt: timestamp("grantedAt").defaultNow().notNull(),
  revokedBy: int("revokedBy"),
  revokedAt: timestamp("revokedAt"),
  active: boolean("active").default(true).notNull(),
  notes: text("notes"), // Motivo da concessão/revogação
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  eventSupplierIdx: index("event_supplier_idx").on(table.eventId, table.supplierId),
  eventIdx: index("event_idx").on(table.eventId),
  supplierIdx: index("supplier_idx").on(table.supplierId),
  activeIdx: index("active_idx").on(table.active),
}));

export type EventSupplier = typeof eventSuppliers.$inferSelect;
export type InsertEventSupplier = typeof eventSuppliers.$inferInsert;
