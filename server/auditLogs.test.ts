import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@sportv.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
      ip: "127.0.0.1",
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

function createFornecedorContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "fornecedor-user",
    email: "fornecedor@example.com",
    name: "Fornecedor User",
    loginMethod: "manus",
    role: "fornecedor",
    supplierId: 1,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  return {
    user,
    req: {
      protocol: "https",
      headers: {},
      ip: "127.0.0.1",
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Audit Logs", () => {
  it("should list all audit logs as admin", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auditLogs.list({});
    expect(Array.isArray(result)).toBe(true);
  });

  it("should filter audit logs by action", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auditLogs.list({ action: "CREATE" });
    expect(Array.isArray(result)).toBe(true);
    // All results should have action = CREATE
    result.forEach(log => {
      expect(log.action).toBe("CREATE");
    });
  });

  it("should filter audit logs by entity type", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auditLogs.list({ entityType: "EVENT" });
    expect(Array.isArray(result)).toBe(true);
    // All results should have entityType = EVENT
    result.forEach(log => {
      expect(log.entityType).toBe("EVENT");
    });
  });

  it("should filter audit logs by user ID", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auditLogs.list({ userId: 1 });
    expect(Array.isArray(result)).toBe(true);
    // All results should have userId = 1
    result.forEach(log => {
      expect(log.userId).toBe(1);
    });
  });

  it("should filter audit logs by date range", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const startDate = new Date("2024-01-01");
    const endDate = new Date("2026-12-31");

    const result = await caller.auditLogs.list({ startDate, endDate });
    expect(Array.isArray(result)).toBe(true);
    // All results should be within date range
    result.forEach(log => {
      const logDate = new Date(log.createdAt);
      expect(logDate >= startDate).toBe(true);
      expect(logDate <= endDate).toBe(true);
    });
  });

  it("should limit number of audit logs returned", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auditLogs.list({ limit: 5 });
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it("should prevent non-admin from accessing audit logs", async () => {
    const ctx = createFornecedorContext();
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.auditLogs.list({});
      // Should not reach here
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.code).toBe("FORBIDDEN");
    }
  });

  it("should combine multiple filters", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auditLogs.list({
      action: "CREATE",
      entityType: "EVENT",
      limit: 10,
    });
    
    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBeLessThanOrEqual(10);
    
    result.forEach(log => {
      expect(log.action).toBe("CREATE");
      expect(log.entityType).toBe("EVENT");
    });
  });

  it("should return logs in descending order by creation date", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auditLogs.list({ limit: 10 });
    
    if (result.length > 1) {
      for (let i = 0; i < result.length - 1; i++) {
        const currentDate = new Date(result[i].createdAt);
        const nextDate = new Date(result[i + 1].createdAt);
        expect(currentDate >= nextDate).toBe(true);
      }
    }
  });
});
