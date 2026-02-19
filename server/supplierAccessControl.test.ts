import { describe, expect, it } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-user",
    email: "admin@sportv.com",
    name: "Admin User",
    loginMethod: "manus",
    role: "admin",
    supplierId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

function createExternalUserContext(supplierId: number): { ctx: TrpcContext } {
  const user: AuthenticatedUser = {
    id: 2,
    openId: "external-user",
    email: "external@supplier.com",
    name: "External User",
    loginMethod: "manus",
    role: "fornecedor",
    supplierId,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };

  const ctx: TrpcContext = {
    user,
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {
      clearCookie: () => {},
    } as TrpcContext["res"],
  };

  return { ctx };
}

describe("Supplier Access Control", () => {
  describe("Event Access - Admin", () => {
    it("admin can access all events", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      const events = await caller.events.list();
      expect(events).toBeDefined();
      expect(Array.isArray(events)).toBe(true);
    });

    it("admin can grant supplier access to event", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      // Create test supplier
      const supplier = await caller.suppliers.create({
        name: "Test Supplier for Access",
        cnpj: "12345678000199",
        contact: "Contact Person",
        phone: "11999999999",
        email: "test@supplier.com",
      });

      // Create test event
      const event = await caller.events.create({
        name: "Test Event for Access Control",
        wo: "WO-TEST-001",
        eventDate: "2026-03-15",
        registrationDeadline: "2026-03-05",
        credentialReleaseDate: "2026-03-12",
        location: "Test Location",
        eventType: "Futebol",
        federation: "CBF",
        isConfidential: false,
      });

      // Grant access
      const result = await caller.eventSuppliers.grantAccess({
        eventId: event.id,
        supplierId: supplier.id,
        notes: "Test access grant",
      });

      expect(result.success).toBe(true);
      expect(result.id).toBeGreaterThan(0);
    });

    it("admin can revoke supplier access to event", async () => {
      const { ctx } = createAdminContext();
      const caller = appRouter.createCaller(ctx);

      // Assuming previous test created access
      const suppliers = await caller.suppliers.list();
      const events = await caller.events.list();

      if (suppliers.length > 0 && events.length > 0) {
        const result = await caller.eventSuppliers.revokeAccess({
          eventId: events[0]!.id,
          supplierId: suppliers[0]!.id,
        });

        expect(result.success).toBe(true);
      }
    });
  });

  describe("Event Access - External User", () => {
    it("external user can only see events their supplier has access to", async () => {
      // First, create supplier and event as admin
      const { ctx: adminCtx } = createAdminContext();
      const adminCaller = appRouter.createCaller(adminCtx);

      const supplier = await adminCaller.suppliers.create({
        name: "Limited Access Supplier",
        cnpj: "98765432000188",
        contact: "Limited User",
        phone: "11888888888",
        email: "limited@supplier.com",
      });

      const event1 = await adminCaller.events.create({
        name: "Accessible Event",
        wo: "WO-ACC-001",
        eventDate: "2026-04-01",
        registrationDeadline: "2026-03-22",
        credentialReleaseDate: "2026-03-29",
        location: "Stadium A",
        eventType: "Futebol",
        federation: "CBF",
        isConfidential: false,
      });

      const event2 = await adminCaller.events.create({
        name: "Restricted Event",
        wo: "WO-RES-001",
        eventDate: "2026-04-05",
        registrationDeadline: "2026-03-26",
        credentialReleaseDate: "2026-04-02",
        location: "Stadium B",
        eventType: "Vôlei",
        federation: "CBV",
        isConfidential: true,
      });

      // Grant access only to event1
      await adminCaller.eventSuppliers.grantAccess({
        eventId: event1.id,
        supplierId: supplier.id,
      });

      // Now test as external user
      const { ctx: externalCtx } = createExternalUserContext(supplier.id);
      const externalCaller = appRouter.createCaller(externalCtx);

      const accessibleEvents = await externalCaller.events.list();

      // Should only see event1
      expect(accessibleEvents.length).toBeGreaterThan(0);
      const eventIds = accessibleEvents.map(e => e.id);
      expect(eventIds).toContain(event1.id);
      expect(eventIds).not.toContain(event2.id);
    });

    it("external user cannot access event without supplier link", async () => {
      const { ctx: adminCtx } = createAdminContext();
      const adminCaller = appRouter.createCaller(adminCtx);

      const supplier = await adminCaller.suppliers.create({
        name: "No Access Supplier",
        cnpj: "11122233000144",
        contact: "No Access User",
        phone: "11777777777",
        email: "noaccess@supplier.com",
      });

      const restrictedEvent = await adminCaller.events.create({
        name: "Completely Restricted Event",
        wo: "WO-NOAC-001",
        eventDate: "2026-05-01",
        registrationDeadline: "2026-04-21",
        credentialReleaseDate: "2026-04-28",
        location: "Private Stadium",
        eventType: "Basquete",
        federation: "CBB",
        isConfidential: true,
      });

      // External user without access
      const { ctx: externalCtx } = createExternalUserContext(supplier.id);
      const externalCaller = appRouter.createCaller(externalCtx);

      // Try to access event directly
      try {
        await externalCaller.events.getById({ id: restrictedEvent.id });
        expect.fail("Should have thrown FORBIDDEN error");
      } catch (error: any) {
        expect(error.code).toBe("FORBIDDEN");
        expect(error.message).toContain("Acesso negado");
      }
    });
  });

  describe("Confidential Events", () => {
    it("confidential events require explicit access grant", async () => {
      const { ctx: adminCtx } = createAdminContext();
      const adminCaller = appRouter.createCaller(adminCtx);

      const supplier = await adminCaller.suppliers.create({
        name: "Confidential Test Supplier",
        cnpj: "55566677000133",
        contact: "Confidential User",
        phone: "11666666666",
        email: "confidential@supplier.com",
      });

      const confidentialEvent = await adminCaller.events.create({
        name: "Top Secret Event",
        wo: "WO-SECRET-001",
        eventDate: "2026-06-01",
        registrationDeadline: "2026-05-22",
        credentialReleaseDate: "2026-05-29",
        location: "Classified Location",
        eventType: "Futebol",
        federation: "FIFA",
        isConfidential: true,
      });

      // External user should not see it without explicit grant
      const { ctx: externalCtx } = createExternalUserContext(supplier.id);
      const externalCaller = appRouter.createCaller(externalCtx);

      const events = await externalCaller.events.list();
      const eventIds = events.map(e => e.id);
      expect(eventIds).not.toContain(confidentialEvent.id);

      // Grant access
      await adminCaller.eventSuppliers.grantAccess({
        eventId: confidentialEvent.id,
        supplierId: supplier.id,
        notes: "Granted access to confidential event",
      });

      // Now should see it
      const eventsAfterGrant = await externalCaller.events.list();
      const eventIdsAfterGrant = eventsAfterGrant.map(e => e.id);
      expect(eventIdsAfterGrant).toContain(confidentialEvent.id);
    });
  });

  describe("Access Logging", () => {
    it("unauthorized access attempts are logged", async () => {
      const { ctx: adminCtx } = createAdminContext();
      const adminCaller = appRouter.createCaller(adminCtx);

      const supplier = await adminCaller.suppliers.create({
        name: "Logging Test Supplier",
        cnpj: "99988877000166",
        contact: "Logging User",
        phone: "11555555555",
        email: "logging@supplier.com",
      });

      const event = await adminCaller.events.create({
        name: "Logging Test Event",
        wo: "WO-LOG-001",
        eventDate: "2026-07-01",
        registrationDeadline: "2026-06-21",
        credentialReleaseDate: "2026-06-28",
        location: "Test Stadium",
        eventType: "Futebol",
        federation: "CBF",
        isConfidential: false,
      });

      // External user tries to access without permission
      const { ctx: externalCtx } = createExternalUserContext(supplier.id);
      const externalCaller = appRouter.createCaller(externalCtx);

      try {
        await externalCaller.events.getById({ id: event.id });
      } catch (error) {
        // Expected to fail
      }

      // Check if access denial was logged
      const logs = await adminCaller.auditLogs.list({
        action: "ACCESS_DENIED",
        entityType: "EVENT",
      });

      expect(logs.length).toBeGreaterThan(0);
      const relevantLog = logs.find(log => 
        log.entityId === event.id && log.action === "ACCESS_DENIED"
      );
      expect(relevantLog).toBeDefined();
    });
  });

  describe("canUserAccessEvent Helper", () => {
    it("correctly validates user access to events", async () => {
      const { ctx: adminCtx } = createAdminContext();
      const adminCaller = appRouter.createCaller(adminCtx);

      const supplier = await adminCaller.suppliers.create({
        name: "Validation Test Supplier",
        cnpj: "44455566000177",
        contact: "Validation User",
        phone: "11444444444",
        email: "validation@supplier.com",
      });

      const event = await adminCaller.events.create({
        name: "Validation Test Event",
        wo: "WO-VAL-001",
        eventDate: "2026-08-01",
        registrationDeadline: "2026-07-22",
        credentialReleaseDate: "2026-07-29",
        location: "Validation Stadium",
        eventType: "Futebol",
        federation: "CBF",
        isConfidential: false,
      });

      // Before granting access
      const canAccessBefore = await db.canUserAccessEvent(2, event.id);
      expect(canAccessBefore).toBe(false);

      // Grant access
      await adminCaller.eventSuppliers.grantAccess({
        eventId: event.id,
        supplierId: supplier.id,
      });

      // After granting access
      const canAccessAfter = await db.canUserAccessEvent(2, event.id);
      expect(canAccessAfter).toBe(true);

      // Admin always has access
      const adminCanAccess = await db.canUserAccessEvent(1, event.id);
      expect(adminCanAccess).toBe(true);
    });
  });
});
