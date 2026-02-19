import { describe, expect, it, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock authenticated user contexts
function createAdminContext(): TrpcContext {
  const user = {
    id: 1,
    openId: "admin-test",
    email: "admin@sportv.com",
    name: "Admin Test",
    loginMethod: "manus",
    role: "admin" as const,
    supplierId: null,
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
    } as any,
    res: {
      clearCookie: () => {},
    } as any,
  };
}

function createFornecedorContext(): TrpcContext {
  const user = {
    id: 2,
    openId: "fornecedor-test",
    email: "fornecedor@example.com",
    name: "Fornecedor Test",
    loginMethod: "manus",
    role: "fornecedor" as const,
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
    } as any,
    res: {
      clearCookie: () => {},
    } as any,
  };
}

function createConsultaContext(): TrpcContext {
  const user = {
    id: 3,
    openId: "consulta-test",
    email: "consulta@example.com",
    name: "Consulta Test",
    loginMethod: "manus",
    role: "consulta" as const,
    supplierId: null,
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
    } as any,
    res: {
      clearCookie: () => {},
    } as any,
  };
}

describe("Authentication", () => {
  it("should return user info for authenticated user", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.me();

    expect(result).toBeDefined();
    expect(result?.email).toBe("admin@sportv.com");
    expect(result?.role).toBe("admin");
  });

  it("should logout successfully", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.auth.logout();

    expect(result.success).toBe(true);
  });
});

describe("Role-Based Access Control", () => {
  it("admin should access supplier creation", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.suppliers.create({
      name: "Test Supplier",
      cnpj: "12345678000190",
      contactEmail: "contact@test.com",
    });

    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
  });

  it("fornecedor should NOT access supplier creation", async () => {
    const ctx = createFornecedorContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.suppliers.create({
        name: "Test Supplier",
        cnpj: "12345678000190",
      })
    ).rejects.toThrow("Acesso restrito a administradores");
  });

  it("consulta should NOT access supplier creation", async () => {
    const ctx = createConsultaContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.suppliers.create({
        name: "Test Supplier",
        cnpj: "12345678000190",
      })
    ).rejects.toThrow("Acesso restrito");
  });
});

describe("Dashboard Stats", () => {
  it("should return dashboard statistics", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const stats = await caller.dashboard.stats();

    expect(stats).toBeDefined();
    expect(stats.totalEvents).toBeGreaterThanOrEqual(0);
    expect(stats.activeEvents).toBeGreaterThanOrEqual(0);
    expect(stats.completedEvents).toBeGreaterThanOrEqual(0);
    expect(stats.totalCollaborators).toBeGreaterThanOrEqual(0);
  });
});

describe("Suppliers", () => {
  it("should list all suppliers", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const suppliers = await caller.suppliers.list();

    expect(Array.isArray(suppliers)).toBe(true);
  });

  it("should create and update supplier", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Create
    const created = await caller.suppliers.create({
      name: "New Supplier",
      cnpj: "98765432000100",
      contactEmail: "new@supplier.com",
    });

    expect(created.success).toBe(true);
    expect(created.id).toBeDefined();

    // Update
    const updated = await caller.suppliers.update({
      id: created.id,
      name: "Updated Supplier",
    });

    expect(updated.success).toBe(true);
  });
});

describe("Job Functions", () => {
  it("should list all job functions", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const functions = await caller.jobFunctions.list();

    expect(Array.isArray(functions)).toBe(true);
  });

  it("should create job function", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.jobFunctions.create({
      name: "Fotógrafo",
      description: "Responsável por fotografia",
    });

    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
  });
});

describe("Events", () => {
  it("should list all events", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const events = await caller.events.list();

    expect(Array.isArray(events)).toBe(true);
  });

  it("should create event", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.events.create({
      name: "Campeonato Brasileiro 2026",
      eventDate: "2026-06-15",
      registrationDeadline: "2026-06-05",
      credentialReleaseDate: "2026-06-12",
      location: "Maracanã",
      federation: "CBF",
    });

    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
  });

  it("should search events by filters", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const results = await caller.events.search({
      federation: "CBF",
      status: "aberto",
    });

    expect(Array.isArray(results)).toBe(true);
  });
});

describe("Collaborators", () => {
  it("admin should list all collaborators", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const collaborators = await caller.collaborators.list();

    expect(Array.isArray(collaborators)).toBe(true);
  });

  it("fornecedor should only list their own collaborators", async () => {
    const ctx = createFornecedorContext();
    const caller = appRouter.createCaller(ctx);

    const collaborators = await caller.collaborators.list();

    expect(Array.isArray(collaborators)).toBe(true);
    // All collaborators should belong to the fornecedor's supplier
    collaborators.forEach(collab => {
      expect(collab.supplierId).toBe(ctx.user!.supplierId);
    });
  });

  it("should create collaborator with CPF validation", async () => {
    const ctx = createFornecedorContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.collaborators.create({
      name: "João Silva",
      cpf: "12345678901",
      email: "joao@example.com",
      phone: "11999999999",
    });

    expect(result.success).toBe(true);
    expect(result.id).toBeDefined();
  });

  it("should prevent duplicate CPF", async () => {
    const ctx = createFornecedorContext();
    const caller = appRouter.createCaller(ctx);

    // First creation should succeed
    await caller.collaborators.create({
      name: "Maria Santos",
      cpf: "98765432100",
      email: "maria@example.com",
      phone: "11888888888",
    });

    // Second creation with same CPF should fail
    await expect(
      caller.collaborators.create({
        name: "Maria Duplicate",
        cpf: "98765432100",
        email: "maria2@example.com",
        phone: "11777777777",
      })
    ).rejects.toThrow("CPF já cadastrado");
  });
});

describe("Public Consultation", () => {
  it("should search accreditation by CPF", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const results = await caller.public.searchAccreditation({
      cpf: "12345678901",
    });

    expect(Array.isArray(results)).toBe(true);
  });

  it("should return empty array for non-existent CPF", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const results = await caller.public.searchAccreditation({
      cpf: "00000000000",
    });

    expect(results).toEqual([]);
  });
});

describe("Audit Logs", () => {
  it("admin should access audit logs", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const logs = await caller.auditLogs.list({
      limit: 10,
    });

    expect(Array.isArray(logs)).toBe(true);
  });

  it("fornecedor should NOT access audit logs", async () => {
    const ctx = createFornecedorContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.auditLogs.list({ limit: 10 })
    ).rejects.toThrow("Acesso restrito a administradores");
  });
});
