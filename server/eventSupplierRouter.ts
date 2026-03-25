import { z } from "zod";
import { router, protectedProcedure } from "./_core/trpc";
import * as db from "./db";
import { requireAdmin } from "./supplierAccessControl";
import { TRPCError } from "@trpc/server";

export const eventSupplierRouter = router({
  /**
   * Grant supplier access to event (admin only)
   */
  grantAccess: protectedProcedure
    .input(z.object({
      eventId: z.number(),
      supplierId: z.number(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await requireAdmin(ctx);

      // Check if access already exists
      const existing = await db.getEventSupplierAccess(input.eventId, input.supplierId);
      if (existing) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Fornecedor já possui acesso a este evento",
        });
      }

      const id = await db.grantEventAccess({
        eventId: input.eventId,
        supplierId: input.supplierId,
        grantedBy: ctx.user.id,
        notes: input.notes,
      });

      // Log the action
      await db.createAuditLog({
        userId: ctx.user.id,
        userName: ctx.user.name || "Unknown",
        action: "GRANT_ACCESS",
        entityType: "EVENT_SUPPLIER",
        entityId: id,
        details: JSON.stringify({
          eventId: input.eventId,
          supplierId: input.supplierId,
          notes: input.notes,
        }),
        ipAddress: ctx.req.headers["x-forwarded-for"] as string || "unknown",
        userAgent: ctx.req.headers["user-agent"] || "unknown",
      });

      return { id, success: true };
    }),

  /**
   * Revoke supplier access to event (admin only)
   */
  revokeAccess: protectedProcedure
    .input(z.object({
      eventId: z.number(),
      supplierId: z.number(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await requireAdmin(ctx);

      await db.revokeEventAccess(input.eventId, input.supplierId, ctx.user.id);

      // Log the action
      await db.createAuditLog({
        userId: ctx.user.id,
        userName: ctx.user.name || "Unknown",
        action: "REVOKE_ACCESS",
        entityType: "EVENT_SUPPLIER",
        details: JSON.stringify({
          eventId: input.eventId,
          supplierId: input.supplierId,
          notes: input.notes,
        }),
        ipAddress: ctx.req.headers["x-forwarded-for"] as string || "unknown",
        userAgent: ctx.req.headers["user-agent"] || "unknown",
      });

      return { success: true };
    }),

  /**
   * Get all suppliers with access to an event (admin only)
   */
  getEventSuppliers: protectedProcedure
    .input(z.object({
      eventId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      await requireAdmin(ctx);

      const eventSuppliers = await db.getEventSuppliers(input.eventId);
      
      // Enrich with supplier data
      const enriched = await Promise.all(
        eventSuppliers.map(async (es) => {
          const supplier = await db.getSupplierById(es.supplierId);
          const grantedByUser = await db.getUserById(es.grantedBy);
          const revokedByUser = es.revokedBy ? await db.getUserById(es.revokedBy) : null;
          
          return {
            ...es,
            supplier,
            grantedByUser,
            revokedByUser,
          };
        })
      );

      return enriched;
    }),

  /**
   * Get all events accessible by a supplier
   */
  getSupplierEvents: protectedProcedure
    .input(z.object({
      supplierId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      // Admin can query any supplier, others can only query their own
      if (ctx.user.role !== "admin" && ctx.user.supplierId !== input.supplierId) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "Acesso negado",
        });
      }

      const supplierEvents = await db.getSupplierEvents(input.supplierId);
      
      // Enrich with event data
      const enriched = await Promise.all(
        supplierEvents.map(async (se) => {
          const event = await db.getEventById(se.eventId);
          return {
            ...se,
            event,
          };
        })
      );

      return enriched;
    }),

  /**
   * Check if current user can access an event
   */
  canAccessEvent: protectedProcedure
    .input(z.object({
      eventId: z.number(),
    }))
    .query(async ({ input, ctx }) => {
      const canAccess = await db.canUserAccessEvent(ctx.user.id, input.eventId);
      return { canAccess };
    }),
});
