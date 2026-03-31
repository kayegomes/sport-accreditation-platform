import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { exportRouter, batchImportRouter } from "./exportRouters";
import { eventSupplierRouter } from "./eventSupplierRouter";
import { sdk } from "./_core/sdk";
import crypto from "crypto";
import { nanoid } from "nanoid";

// ============================================================================
// MIDDLEWARE: Role-based Access Control
// ============================================================================

const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso restrito a administradores' });
  }
  return next({ ctx });
});

/**
 * managerProcedure: admin or gestor
 */
const managerProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'admin' && ctx.user.role !== 'gestor') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso restrito a administradores e gestores' });
  }
  return next({ ctx });
});

const fornecedorProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== 'fornecedor' && ctx.user.role !== 'admin' && ctx.user.role !== 'gestor') {
    throw new TRPCError({ code: 'FORBIDDEN', message: 'Acesso negado' });
  }
  return next({ ctx });
});

// ============================================================================
// HELPER: Audit Log
// ============================================================================

async function logAction(
  userId: number,
  userName: string | null,
  action: string,
  entityType: string,
  entityId?: number,
  details?: any,
  req?: any
) {
  await db.createAuditLog({
    userId,
    userName: userName || undefined,
    action,
    entityType,
    entityId,
    details: details ? JSON.stringify(details) : undefined,
    ipAddress: req?.ip || req?.headers?.['x-forwarded-for'] || undefined,
    userAgent: req?.headers?.['user-agent'] || undefined,
  });
}

// ============================================================================
// ROUTERS
// ============================================================================

export const appRouter = router({
  system: systemRouter,
  eventSuppliers: eventSupplierRouter,
  
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    login: publicProcedure
      .input(z.object({
        email: z.string().email(),
        password: z.string().min(6),
      }))
      .mutation(async ({ input, ctx }) => {
        const allUsers = await db.getAllUsers();
        const user = allUsers.find(u => u.email === input.email);
        
        if (!user || !user.password) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'E-mail ou senha inválidos' });
        }

        // Verify password
        const [salt, hash] = user.password.split(':');
        const derivedHash = crypto.scryptSync(input.password, salt, 64).toString('hex');
        
        if (hash !== derivedHash) {
          throw new TRPCError({ code: 'UNAUTHORIZED', message: 'E-mail ou senha inválidos' });
        }

        // Create session
        const sessionToken = await sdk.createSessionToken(user.openId, { name: user.name || '' });
        const cookieOptions = getSessionCookieOptions(ctx.req);
        ctx.res.cookie(COOKIE_NAME, sessionToken, cookieOptions);

        return { success: true, user };
      }),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  // ==========================================================================
  // SUPPLIERS
  // ==========================================================================
  
  suppliers: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllSuppliers();
    }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        return await db.getSupplierById(input.id);
      }),
    
    create: managerProcedure
      .input(z.object({
        name: z.string().min(1),
        cnpj: z.string().optional(),
        contactName: z.string().optional(),
        contactEmail: z.string().email().optional(),
        contactPhone: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await db.createSupplier({
          ...input,
          active: true,
        });
        
        await logAction(ctx.user.id, ctx.user.name, 'CREATE', 'SUPPLIER', undefined, input, ctx.req);
        
        return { success: true, id: Number(result[0].insertId) };
      }),
    
    update: managerProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        cnpj: z.string().optional(),
        contactName: z.string().optional(),
        contactEmail: z.string().email().optional(),
        contactPhone: z.string().optional(),
        active: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        await db.updateSupplier(id, data);
        
        await logAction(ctx.user.id, ctx.user.name, 'UPDATE', 'SUPPLIER', id, data, ctx.req);
        
        return { success: true };
      }),
    
    delete: managerProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.deleteSupplier(input.id);
        
        await logAction(ctx.user.id, ctx.user.name, 'DELETE', 'SUPPLIER', input.id, undefined, ctx.req);
        
        return { success: true };
      }),
  }),

  // ==========================================================================
  // JOB FUNCTIONS
  // ==========================================================================
  
  jobFunctions: router({
    list: protectedProcedure.query(async () => {
      return await db.getAllJobFunctions();
    }),
    
    create: managerProcedure
      .input(z.object({
        name: z.string().min(1),
        description: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await db.createJobFunction({
          ...input,
          active: true,
        });
        
        await logAction(ctx.user.id, ctx.user.name, 'CREATE', 'JOB_FUNCTION', undefined, input, ctx.req);
        
        return { success: true, id: Number(result[0].insertId) };
      }),
    
    update: managerProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        description: z.string().optional(),
        active: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        await db.updateJobFunction(id, data);
        
        await logAction(ctx.user.id, ctx.user.name, 'UPDATE', 'JOB_FUNCTION', id, data, ctx.req);
        
        return { success: true };
      }),
    
    delete: managerProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.deleteJobFunction(input.id);
        
        await logAction(ctx.user.id, ctx.user.name, 'DELETE', 'JOB_FUNCTION', input.id, undefined, ctx.req);
        
        return { success: true };
      }),
  }),


  // ==========================================================================
  // EVENTS
  // ==========================================================================
  
  events: router({
    list: protectedProcedure
      .input(z.object({ includePast: z.boolean().optional() }).optional())
      .query(async ({ input, ctx }) => {
        // Use access-controlled event listing
        return await db.getAccessibleEvents(ctx.user.id, input?.includePast ?? true);
      }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        // Check access before returning event
        const canAccess = await db.canUserAccessEvent(ctx.user.id, input.id);
        if (!canAccess) {
          throw new TRPCError({ 
            code: 'FORBIDDEN', 
            message: 'Acesso negado. Seu fornecedor não está vinculado a este evento.' 
          });
        }
        return await db.getEventById(input.id);
      }),
    
    getByStatus: protectedProcedure
      .input(z.object({ status: z.string() }))
      .query(async ({ input }) => {
        return await db.getEventsByStatus(input.status);
      }),
    
    search: protectedProcedure
      .input(z.object({
        wo: z.string().optional(),
        federation: z.string().optional(),
        status: z.string().optional(),
        eventType: z.string().optional(),
      }))
      .query(async ({ input }) => {
        return await db.searchEvents(input);
      }),
    
    create: managerProcedure
      .input(z.object({
        name: z.string().min(1),
        wo: z.string().optional(),
        eventDate: z.string(), // ISO date string
        registrationDeadline: z.string(),
        credentialReleaseDate: z.string(),
        location: z.string().optional(),
        eventType: z.string().optional(),
        federation: z.string().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await db.createEvent({
          ...input,
          eventDate: input.eventDate as any,
          registrationDeadline: input.registrationDeadline as any,
          credentialReleaseDate: input.credentialReleaseDate as any,
          status: 'aberto',
          active: true,
          createdBy: ctx.user.id,
        });
        
        await logAction(ctx.user.id, ctx.user.name, 'CREATE', 'EVENT', undefined, input, ctx.req);
        
        return { success: true, id: Number(result[0].insertId) };
      }),
    
    update: managerProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional().or(z.literal("")),
        wo: z.string().optional(),
        eventDate: z.string().optional().or(z.literal("")),
        registrationDeadline: z.string().optional().or(z.literal("")),
        credentialReleaseDate: z.string().optional().or(z.literal("")),
        location: z.string().optional(),
        eventType: z.string().optional(),
        federation: z.string().optional(),
        status: z.enum(['aberto', 'em_verificacao', 'extraido', 'enviado', 'concluido']).optional(),
        notes: z.string().optional(),
        active: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        
        // Convert date strings to proper format
        const updateData: any = { ...data };
        if (data.eventDate) updateData.eventDate = data.eventDate as any;
        if (data.registrationDeadline) updateData.registrationDeadline = data.registrationDeadline as any;
        if (data.credentialReleaseDate) updateData.credentialReleaseDate = data.credentialReleaseDate as any;
        
        await db.updateEvent(id, updateData);
        
        await logAction(ctx.user.id, ctx.user.name, 'UPDATE', 'EVENT', id, data, ctx.req);
        
        return { success: true };
      }),
    
    getFunctionLimits: protectedProcedure
      .input(z.object({ eventId: z.number() }))
      .query(async ({ input }) => {
        return await db.getEventFunctionLimits(input.eventId);
      }),
    
    setFunctionLimit: managerProcedure
      .input(z.object({
        eventId: z.number(),
        jobFunctionId: z.number(),
        maxCount: z.number().min(0),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await db.setEventFunctionLimit(input);
        
        await logAction(ctx.user.id, ctx.user.name, 'SET_LIMIT', 'EVENT_FUNCTION_LIMIT', undefined, input, ctx.req);
        
        return { success: true, id: Number(result[0].insertId) };
      }),
    
    delete: managerProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.deleteEvent(input.id);
        await logAction(ctx.user.id, ctx.user.name, 'DELETE', 'EVENT', input.id, {}, ctx.req);
        return { success: true };
      }),
  }),

  // ==========================================================================
  // COLLABORATORS
  // ==========================================================================
  
  collaborators: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      // Admin sees all, fornecedor sees only their own
      if (ctx.user.role === 'admin' || ctx.user.role === 'consulta') {
        return await db.getAllCollaborators();
      } else if (ctx.user.supplierId) {
        return await db.getCollaboratorsBySupplier(ctx.user.supplierId);
      }
      return [];
    }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const collaborator = await db.getCollaboratorById(input.id);
        
        // Fornecedor can only see their own collaborators
        if (ctx.user.role === 'fornecedor' && collaborator?.supplierId !== ctx.user.supplierId) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        
        return collaborator;
      }),
    
    getByCPF: protectedProcedure
      .input(z.object({ cpf: z.string() }))
      .query(async ({ input }) => {
        return await db.getCollaboratorByCPF(input.cpf);
      }),
    
    search: protectedProcedure
      .input(z.object({
        name: z.string().optional(),
        cpf: z.string().optional(),
        email: z.string().optional(),
      }))
      .query(async ({ input, ctx }) => {
        const filters = { ...input };
        
        // Fornecedor can only search their own collaborators
        if (ctx.user.role === 'fornecedor' && ctx.user.supplierId) {
          (filters as any).supplierId = ctx.user.supplierId;
        }
        
        return await db.searchCollaborators(filters);
      }),
    
    create: fornecedorProcedure
      .input(z.object({
        supplierId: z.number().optional(),
        name: z.string().min(1),
        cpf: z.string().min(11),
        email: z.string().email(),
        phone: z.string().min(1),
        photoUrl: z.string().optional(),
        jobFunctionId: z.number().optional(),
        access: z.string().optional(),
        vehicleInfo: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Fornecedor can only create for their own supplier
        let supplierId = input.supplierId;
        if (ctx.user.role === 'fornecedor') {
          if (!ctx.user.supplierId) {
            throw new TRPCError({ code: 'BAD_REQUEST', message: 'Usuário não vinculado a fornecedor' });
          }
          supplierId = ctx.user.supplierId;
        }
        
        if (!supplierId) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Fornecedor é obrigatório' });
        }
        
        // Check for duplicate CPF
        const existing = await db.getCollaboratorByCPF(input.cpf);
        if (existing) {
          throw new TRPCError({ code: 'CONFLICT', message: 'CPF já cadastrado' });
        }
        
        const result = await db.createCollaborator({
          ...input,
          supplierId,
          active: true,
        });
        
        await logAction(ctx.user.id, ctx.user.name, 'CREATE', 'COLLABORATOR', undefined, input, ctx.req);
        
        return { success: true, id: Number(result[0].insertId) };
      }),
    
    update: fornecedorProcedure
      .input(z.object({
        id: z.number(),
        name: z.string().min(1).optional(),
        cpf: z.string().min(11).optional(),
        email: z.string().email().optional(),
        phone: z.string().min(1).optional(),
        photoUrl: z.string().optional(),
        jobFunctionId: z.number().optional(),
        access: z.string().optional(),
        vehicleInfo: z.string().optional(),
        active: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        
        // Verify ownership for fornecedor
        if (ctx.user.role === 'fornecedor') {
          const collaborator = await db.getCollaboratorById(id);
          if (collaborator?.supplierId !== ctx.user.supplierId) {
            throw new TRPCError({ code: 'FORBIDDEN' });
          }
        }
        
        await db.updateCollaborator(id, data);
        
        await logAction(ctx.user.id, ctx.user.name, 'UPDATE', 'COLLABORATOR', id, data, ctx.req);
        
        return { success: true };
      }),
    
    delete: fornecedorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        // Verify ownership for fornecedor
        if (ctx.user.role === 'fornecedor') {
          const collaborator = await db.getCollaboratorById(input.id);
          if (collaborator?.supplierId !== ctx.user.supplierId) {
            throw new TRPCError({ code: 'FORBIDDEN' });
          }
        }
        
        await db.deleteCollaborator(input.id);
        await logAction(ctx.user.id, ctx.user.name, 'DELETE', 'COLLABORATOR', input.id, {}, ctx.req);
        return { success: true };
      }),
  }),

  // ==========================================================================
  // ACCREDITATIONS
  // ==========================================================================
  
  accreditations: router({
    listByEvent: protectedProcedure
      .input(z.object({ eventId: z.number() }))
      .query(async ({ input }) => {
        return await db.getAccreditationsByEvent(input.eventId);
      }),
    
    listByCollaborator: protectedProcedure
      .input(z.object({ collaboratorId: z.number() }))
      .query(async ({ input }) => {
        return await db.getAccreditationsByCollaborator(input.collaboratorId);
      }),
    
    create: fornecedorProcedure
      .input(z.object({
        eventId: z.number(),
        collaboratorId: z.number(),
        jobFunctionId: z.number(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Verify collaborator ownership for fornecedor
        if (ctx.user.role === 'fornecedor') {
          const collaborator = await db.getCollaboratorById(input.collaboratorId);
          if (collaborator?.supplierId !== ctx.user.supplierId) {
            throw new TRPCError({ code: 'FORBIDDEN' });
          }
        }
        
        // Fetch event to check status and deadline
        const event = await db.getEventById(input.eventId);
        if (!event) {
          throw new TRPCError({ code: 'NOT_FOUND', message: 'Evento não encontrado' });
        }

        // Check registration deadline (unless admin)
        if (ctx.user.role !== 'admin') {
          const now = new Date();
          const deadline = new Date(event.registrationDeadline);
          // Set deadline to end of day
          deadline.setHours(23, 59, 59, 999);
          
          if (now > deadline) {
            throw new TRPCError({ 
              code: 'BAD_REQUEST', 
              message: `Prazo de cadastro para este evento encerrou em ${deadline.toLocaleDateString('pt-BR')}` 
            });
          }

          if (event.status !== 'aberto') {
            throw new TRPCError({ 
              code: 'BAD_REQUEST', 
              message: 'Este evento não está mais aceitando novos cadastros' 
            });
          }
        }
        
        // Check function limit
        const limits = await db.getEventFunctionLimits(input.eventId);
        const limit = limits.find(l => l.jobFunctionId === input.jobFunctionId);
        
        if (limit) {
          const currentCount = await db.getAccreditationCountByEventAndFunction(input.eventId, input.jobFunctionId);
          if (currentCount >= limit.maxCount) {
            throw new TRPCError({ 
              code: 'BAD_REQUEST', 
              message: `Limite de ${limit.maxCount} colaboradores para esta função já atingido` 
            });
          }
        }
        
        const result = await db.createAccreditation({
          ...input,
          status: 'pendente',
          createdBy: ctx.user.id,
        });
        
        await logAction(ctx.user.id, ctx.user.name, 'CREATE', 'ACCREDITATION', undefined, input, ctx.req);
        
        return { success: true, id: Number(result[0].insertId) };
      }),
    
    update: protectedProcedure
      .input(z.object({
        id: z.number(),
        status: z.enum(['pendente', 'aprovado', 'rejeitado', 'credenciado']).optional(),
        notes: z.string().optional(),
        jobFunctionId: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        
        const accreditation = await db.getAccreditationById(id);
        if (!accreditation) {
          throw new TRPCError({ code: 'NOT_FOUND' });
        }
        
        // Only admin can approve/reject
        if (data.status && data.status !== 'pendente') {
          if (ctx.user.role !== 'admin') {
            throw new TRPCError({ code: 'FORBIDDEN' });
          }
          (data as any).approvedBy = ctx.user.id;
          (data as any).approvedAt = new Date();
        }
        
        await db.updateAccreditation(id, data);
        
        await logAction(ctx.user.id, ctx.user.name, 'UPDATE', 'ACCREDITATION', id, data, ctx.req);
        
        return { success: true };
      }),
    
    delete: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.deleteAccreditation(input.id);
        await logAction(ctx.user.id, ctx.user.name, 'DELETE', 'ACCREDITATION', input.id, {}, ctx.req);
        return { success: true };
      }),
  }),

  // ==========================================================================
  // DOCUMENTS
  // ==========================================================================
  
  documents: router({
    listByCollaborator: protectedProcedure
      .input(z.object({ collaboratorId: z.number() }))
      .query(async ({ input }) => {
        return await db.getDocumentsByCollaborator(input.collaboratorId);
      }),
    
    create: fornecedorProcedure
      .input(z.object({
        collaboratorId: z.number(),
        documentType: z.string(),
        fileName: z.string(),
        fileUrl: z.string(),
        fileKey: z.string(),
        mimeType: z.string().optional(),
        fileSize: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await db.createDocument({
          ...input,
          uploadedBy: ctx.user.id,
        });
        
        await logAction(ctx.user.id, ctx.user.name, 'UPLOAD', 'DOCUMENT', undefined, input, ctx.req);
        
        return { success: true, id: Number(result[0].insertId) };
      }),
    
    delete: fornecedorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        await db.deleteDocument(input.id);
        
        await logAction(ctx.user.id, ctx.user.name, 'DELETE', 'DOCUMENT', input.id, undefined, ctx.req);
        
        return { success: true };
      }),
  }),

  // ==========================================================================
  // AUDIT LOGS
  // ==========================================================================
  
  auditLogs: router({
    list: adminProcedure
      .input(z.object({
        userId: z.number().optional(),
        entityType: z.string().optional(),
        entityId: z.number().optional(),
        action: z.string().optional(),
        startDate: z.date().optional(),
        endDate: z.date().optional(),
        limit: z.number().optional(),
      }))
      .query(async ({ input }) => {
        return await db.getAuditLogs(input);
      }),
  }),

  // ==========================================================================
  // VEHICLES
  // ==========================================================================
  
  vehicles: router({
    list: protectedProcedure.query(async ({ ctx }) => {
      if (ctx.user.role === 'admin' || ctx.user.role === 'consulta') {
        return await db.getAllVehicles();
      } else if (ctx.user.supplierId) {
        return await db.getVehiclesBySupplier(ctx.user.supplierId);
      }
      return [];
    }),
    
    getById: protectedProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const vehicle = await db.getVehicleById(input.id);
        if (ctx.user.role === 'fornecedor' && vehicle?.supplierId !== ctx.user.supplierId) {
          throw new TRPCError({ code: 'FORBIDDEN' });
        }
        return vehicle;
      }),
    
    create: fornecedorProcedure
      .input(z.object({
        supplierId: z.number().optional(),
        model: z.string().min(1),
        plate: z.string().min(1),
        color: z.string().optional(),
        type: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        let supplierId = input.supplierId;
        if (ctx.user.role === 'fornecedor' || (ctx.user.role === 'gestor' && ctx.user.supplierId)) {
          supplierId = ctx.user.supplierId!;
        }
        
        if (!supplierId) {
          throw new TRPCError({ code: 'BAD_REQUEST', message: 'Fornecedor é obrigatório' });
        }
        
        const result = await db.createVehicle({
          ...input,
          supplierId,
          active: true,
        });
        
        await logAction(ctx.user.id, ctx.user.name, 'CREATE', 'VEHICLE', undefined, input, ctx.req);
        return { success: true, id: Number(result[0].insertId) };
      }),
    
    update: fornecedorProcedure
      .input(z.object({
        id: z.number(),
        model: z.string().min(1).optional(),
        plate: z.string().min(1).optional(),
        color: z.string().optional(),
        type: z.string().optional(),
        active: z.boolean().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        
        if (ctx.user.role === 'fornecedor' || (ctx.user.role === 'gestor' && ctx.user.supplierId)) {
          const vehicle = await db.getVehicleById(id);
          if (vehicle?.supplierId !== ctx.user.supplierId) {
            throw new TRPCError({ code: 'FORBIDDEN' });
          }
        }
        
        await db.updateVehicle(id, data);
        await logAction(ctx.user.id, ctx.user.name, 'UPDATE', 'VEHICLE', id, data, ctx.req);
        return { success: true };
      }),
    
    delete: fornecedorProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        if (ctx.user.role === 'fornecedor' || (ctx.user.role === 'gestor' && ctx.user.supplierId)) {
          const vehicle = await db.getVehicleById(input.id);
          if (vehicle?.supplierId !== ctx.user.supplierId) {
            throw new TRPCError({ code: 'FORBIDDEN' });
          }
        }
        
        await db.deleteVehicle(input.id);
        await logAction(ctx.user.id, ctx.user.name, 'DELETE', 'VEHICLE', input.id, {}, ctx.req);
        return { success: true };
      }),
  }),
  // ==========================================================================
  // USERS MANAGEMENT
  // ==========================================================================
  
  users: router({
    list: managerProcedure.query(async () => {
      return await db.getAllUsers();
    }),
    
    create: managerProcedure
      .input(z.object({
        name: z.string().min(1),
        email: z.string().email(),
        role: z.enum(['admin', 'gestor', 'fornecedor', 'consulta']),
        supplierId: z.number().nullable().optional(),
        password: z.string().min(6),
      }))
      .mutation(async ({ input, ctx }) => {
        // Hash password
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.scryptSync(input.password, salt, 64).toString('hex');
        const passwordHash = `${salt}:${hash}`;

        const openId = `local_${nanoid()}`;

        const result = await db.createUser({
          name: input.name,
          email: input.email,
          role: input.role,
          supplierId: input.supplierId,
          password: passwordHash,
          openId,
          loginMethod: 'password',
        });

        await logAction(ctx.user.id, ctx.user.name, 'CREATE', 'USER', undefined, { ...input, password: '[REDACTED]' }, ctx.req);
        
        return { success: true, id: Number(result[0].insertId) };
      }),

    update: managerProcedure
      .input(z.object({
        id: z.number(),
        role: z.enum(['admin', 'gestor', 'fornecedor', 'consulta']).optional(),
        supplierId: z.number().nullable().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...data } = input;
        await db.updateUser(id, data);
        await logAction(ctx.user.id, ctx.user.name, 'UPDATE', 'USER', id, data, ctx.req);
        return { success: true };
      }),
  }),

  // ==========================================================================
  // EXPORTS
  // ==========================================================================
  
  exports: exportRouter,
  
  // ==========================================================================
  // BATCH IMPORTS
  // ==========================================================================
  
  batchImports: batchImportRouter,
  
  // ==========================================================================
  // DASHBOARD
  // ==========================================================================
  
  dashboard: router({
    stats: protectedProcedure.query(async () => {
      const events = await db.getAllEvents();
      const collaborators = await db.getAllCollaborators();
      
      const activeEvents = events.filter(e => e.status === 'aberto' || e.status === 'em_verificacao');
      const completedEvents = events.filter(e => e.status === 'concluido');
      
      return {
        totalEvents: events.length,
        activeEvents: activeEvents.length,
        completedEvents: completedEvents.length,
        totalCollaborators: collaborators.length,
      };
    }),
  }),

  // ==========================================================================
  // PUBLIC CONSULTATION
  // ==========================================================================
  
  public: router({
    searchAccreditation: publicProcedure
      .input(z.object({
        cpf: z.string().optional(),
        name: z.string().optional(),
      }))
      .query(async ({ input }) => {
        if (!input.cpf && !input.name) {
          return [];
        }
        
        let collaborator;
        if (input.cpf) {
          collaborator = await db.getCollaboratorByCPF(input.cpf);
        } else if (input.name) {
          const results = await db.searchCollaborators({ name: input.name });
          collaborator = results[0];
        }
        
        if (!collaborator) {
          return [];
        }
        
        const accreditations = await db.getAccreditationsByCollaborator(collaborator.id);
        
        return accreditations.map(acc => ({
          collaboratorName: collaborator.name,
          collaboratorCPF: collaborator.cpf,
          eventId: acc.eventId,
          status: acc.status,
          createdAt: acc.createdAt,
        }));
      }),
  }),
});

export type AppRouter = typeof appRouter;
