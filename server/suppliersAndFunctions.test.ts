import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@example.com",
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

function createNonAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "user-123",
    email: "user@example.com",
    name: "Regular User",
    loginMethod: "manus",
    role: "user",
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

describe("Suppliers CRUD", () => {
  it("should list all suppliers as admin", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.suppliers.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should create a supplier as admin", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.suppliers.create({
      name: "Test Supplier",
      cnpj: "12.345.678/0001-90",
      contactName: "John Doe",
      contactEmail: "john@testsupplier.com",
      contactPhone: "(11) 98765-4321",
    });

    expect(result.success).toBe(true);
    expect(result.id).toBeTypeOf("number");
  });

  it("should update a supplier as admin", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Create first
    const created = await caller.suppliers.create({
      name: "Supplier to Update",
      cnpj: "98.765.432/0001-10",
    });

    // Update
    const result = await caller.suppliers.update({
      id: created.id,
      name: "Updated Supplier Name",
      contactEmail: "updated@supplier.com",
    });

    expect(result.success).toBe(true);
  });

  it("should delete a supplier as admin", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Create first
    const created = await caller.suppliers.create({
      name: "Supplier to Delete",
    });

    // Delete
    const result = await caller.suppliers.delete({ id: created.id });
    expect(result.success).toBe(true);
  });

  it("should prevent non-admin from creating supplier", async () => {
    const ctx = createNonAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.suppliers.create({
        name: "Unauthorized Supplier",
      })
    ).rejects.toThrow();
  });
});

describe("Job Functions CRUD", () => {
  it("should list all job functions", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.jobFunctions.list();
    expect(Array.isArray(result)).toBe(true);
  });

  it("should create a job function as admin", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    const result = await caller.jobFunctions.create({
      name: "Test Function",
      description: "Test function description",
      active: true,
    });

    expect(result.success).toBe(true);
    expect(result.id).toBeTypeOf("number");
  });

  it("should update a job function as admin", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Create first
    const created = await caller.jobFunctions.create({
      name: "Function to Update",
      description: "Original description",
    });

    // Update
    const result = await caller.jobFunctions.update({
      id: created.id,
      name: "Updated Function Name",
      description: "Updated description",
    });

    expect(result.success).toBe(true);
  });

  it("should delete a job function as admin", async () => {
    const ctx = createAdminContext();
    const caller = appRouter.createCaller(ctx);

    // Create first
    const created = await caller.jobFunctions.create({
      name: "Function to Delete",
    });

    // Delete
    const result = await caller.jobFunctions.delete({ id: created.id });
    expect(result.success).toBe(true);
  });

  it("should prevent non-admin from creating job function", async () => {
    const ctx = createNonAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.jobFunctions.create({
        name: "Unauthorized Function",
      })
    ).rejects.toThrow();
  });

  it("should prevent non-admin from deleting job function", async () => {
    const ctx = createNonAdminContext();
    const caller = appRouter.createCaller(ctx);

    await expect(
      caller.jobFunctions.delete({ id: 1 })
    ).rejects.toThrow();
  });
});
