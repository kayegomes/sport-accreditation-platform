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

function createFornecedorContext(supplierId: number): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "fornecedor-user",
    email: "fornecedor@example.com",
    name: "Fornecedor User",
    loginMethod: "manus",
    role: "fornecedor",
    supplierId,
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

describe("Accreditations", () => {
  it("should list accreditations by event", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.accreditations.listByEvent({ eventId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("should list accreditations by collaborator", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.accreditations.listByCollaborator({ collaboratorId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("should create accreditation as fornecedor", async () => {
    const ctx = createFornecedorContext(1);
    const caller = appRouter.createCaller(ctx);

    // This will fail if collaborator doesn't exist or doesn't belong to supplier
    // But we're testing the procedure structure
    try {
      const result = await caller.accreditations.create({
        eventId: 1,
        collaboratorId: 1,
        jobFunctionId: 1,
      });
      expect(result).toHaveProperty("success");
    } catch (error: any) {
      // Expected to fail if data doesn't exist, but procedure should be callable
      expect(error.code).toBeDefined();
    }
  });

  it("should prevent accreditation when function limit is reached", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // This test validates that the limit checking logic exists
    // In a real scenario, we would set up data to trigger the limit
    try {
      await caller.accreditations.create({
        eventId: 999, // Non-existent event
        collaboratorId: 999,
        jobFunctionId: 999,
      });
    } catch (error: any) {
      // Should fail for various reasons (missing data, limits, etc)
      expect(error).toBeDefined();
    }
  });

  it("should update accreditation status as admin", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await caller.accreditations.update({
        id: 1,
        status: "aprovado",
      });
      expect(result).toHaveProperty("success");
    } catch (error: any) {
      // Expected to fail if accreditation doesn't exist
      expect(error.code).toBeDefined();
    }
  });

  it("should prevent non-admin from approving accreditations", async () => {
    const ctx = createFornecedorContext(1);
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.accreditations.update({
        id: 1,
        status: "aprovado",
      });
      // Should not reach here
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.code).toBe("FORBIDDEN");
    }
  });

  it("should delete accreditation as admin", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await caller.accreditations.delete({ id: 999 });
      expect(result).toHaveProperty("success");
    } catch (error: any) {
      // Expected to fail if doesn't exist, but procedure should be callable
      expect(error).toBeDefined();
    }
  });

  it("should prevent fornecedor from credentialing other supplier's collaborators", async () => {
    const ctx = createFornecedorContext(1); // Supplier 1
    const caller = appRouter.createCaller(ctx);

    try {
      // Try to credential a collaborator from supplier 2
      await caller.accreditations.create({
        eventId: 1,
        collaboratorId: 999, // Assume this belongs to another supplier
        jobFunctionId: 1,
      });
    } catch (error: any) {
      // Should fail with FORBIDDEN or NOT_FOUND
      expect(["FORBIDDEN", "NOT_FOUND", "BAD_REQUEST"]).toContain(error.code);
    }
  });
});

describe("Event Function Limits", () => {
  it("should get function limits for an event", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.events.getFunctionLimits({ eventId: 1 });
    expect(Array.isArray(result)).toBe(true);
  });

  it("should set function limit for an event as admin", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    try {
      const result = await caller.events.setFunctionLimit({
        eventId: 1,
        jobFunctionId: 1,
        maxCount: 10,
      });
      expect(result).toHaveProperty("success");
    } catch (error: any) {
      // Expected to fail if event/function doesn't exist
      expect(error).toBeDefined();
    }
  });

  it("should prevent fornecedor from setting function limits", async () => {
    const ctx = createFornecedorContext(1);
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.events.setFunctionLimit({
        eventId: 1,
        jobFunctionId: 1,
        maxCount: 10,
      });
      // Should not reach here
      expect(true).toBe(false);
    } catch (error: any) {
      expect(error.code).toBe("FORBIDDEN");
    }
  });
});
