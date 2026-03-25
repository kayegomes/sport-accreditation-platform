import { TRPCError } from "@trpc/server";
import { canUserAccessEvent, createAuditLog } from "./db";
import type { TrpcContext } from "./_core/context";

/**
 * Middleware to check if user can access a specific event
 * Throws FORBIDDEN error if access is denied
 * Logs unauthorized access attempts
 */
export async function checkEventAccess(ctx: TrpcContext, eventId: number) {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Usuário não autenticado",
    });
  }

  const hasAccess = await canUserAccessEvent(ctx.user.id, eventId);

  if (!hasAccess) {
    // Log unauthorized access attempt
    await createAuditLog({
      userId: ctx.user.id,
      userName: ctx.user.name || "Unknown",
      action: "ACCESS_DENIED",
      entityType: "EVENT",
      entityId: eventId,
      details: JSON.stringify({
        reason: "Supplier not granted access to event",
        supplierId: ctx.user.supplierId,
        userRole: ctx.user.role,
      }),
      ipAddress: ctx.req.headers["x-forwarded-for"] as string || ctx.req.headers["x-real-ip"] as string || "unknown",
      userAgent: ctx.req.headers["user-agent"] || "unknown",
    });

    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Acesso negado. Seu fornecedor não está vinculado a este evento.",
    });
  }

  return true;
}

/**
 * Check if user can access event data (collaborators, accreditations, etc.)
 * For collaborators: users can only see their own supplier's collaborators
 * For accreditations: users can only see accreditations for events they have access to
 */
export async function checkCollaboratorAccess(ctx: TrpcContext, collaboratorId: number) {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Usuário não autenticado",
    });
  }

  // Admin can access all collaborators
  if (ctx.user.role === "admin") {
    return true;
  }

  // External users can only access their own supplier's collaborators
  const { getCollaboratorById } = await import("./db");
  const collaborator = await getCollaboratorById(collaboratorId);

  if (!collaborator) {
    throw new TRPCError({
      code: "NOT_FOUND",
      message: "Colaborador não encontrado",
    });
  }

  if (collaborator.supplierId !== ctx.user.supplierId) {
    await createAuditLog({
      userId: ctx.user.id,
      userName: ctx.user.name || "Unknown",
      action: "ACCESS_DENIED",
      entityType: "COLLABORATOR",
      entityId: collaboratorId,
      details: JSON.stringify({
        reason: "User trying to access collaborator from different supplier",
        userSupplierId: ctx.user.supplierId,
        collaboratorSupplierId: collaborator.supplierId,
      }),
      ipAddress: ctx.req.headers["x-forwarded-for"] as string || ctx.req.headers["x-real-ip"] as string || "unknown",
      userAgent: ctx.req.headers["user-agent"] || "unknown",
    });

    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Acesso negado. Este colaborador pertence a outro fornecedor.",
    });
  }

  return true;
}

/**
 * Check if user is admin
 */
export async function requireAdmin(ctx: TrpcContext) {
  if (!ctx.user) {
    throw new TRPCError({
      code: "UNAUTHORIZED",
      message: "Usuário não autenticado",
    });
  }

  if (ctx.user.role !== "admin") {
    await createAuditLog({
      userId: ctx.user.id,
      userName: ctx.user.name || "Unknown",
      action: "ACCESS_DENIED",
      entityType: "ADMIN_FUNCTION",
      details: JSON.stringify({
        reason: "Non-admin user trying to access admin function",
        userRole: ctx.user.role,
      }),
      ipAddress: ctx.req.headers["x-forwarded-for"] as string || ctx.req.headers["x-real-ip"] as string || "unknown",
      userAgent: ctx.req.headers["user-agent"] || "unknown",
    });

    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Acesso negado. Apenas administradores podem executar esta ação.",
    });
  }

  return true;
}
