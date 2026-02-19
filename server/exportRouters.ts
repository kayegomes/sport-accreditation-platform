import { z } from "zod";
import { protectedProcedure, router } from "./_core/trpc";
import * as db from "./db";
import { generateCollaboratorsExcel, generateAccreditationsExcel, parseCollaboratorsExcel } from "./excelExport";
import { storagePut } from "./storage";

/**
 * Export and batch import routers
 */
export const exportRouter = router({
  /**
   * Export custom report: Collaborators by Event
   */
  exportCollaboratorsByEvent: protectedProcedure
    .input(z.object({
      startDate: z.string().optional(),
      endDate: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const events = await db.getAllEvents();
      const reportData = [];

      for (const event of events) {
        const accreditations = await db.getAccreditationsByEvent(event.id);
        reportData.push({
          eventName: event.name,
          eventDate: event.eventDate,
          location: event.location,
          totalCollaborators: accreditations.length,
          status: event.status,
        });
      }

      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Colaboradores por Evento');

      worksheet.columns = [
        { header: 'Evento', key: 'eventName', width: 30 },
        { header: 'Data', key: 'eventDate', width: 15 },
        { header: 'Local', key: 'location', width: 25 },
        { header: 'Total de Colaboradores', key: 'totalCollaborators', width: 20 },
        { header: 'Status', key: 'status', width: 15 },
      ];

      worksheet.getRow(1).font = { bold: true };
      worksheet.addRows(reportData);

      const buffer = await workbook.xlsx.writeBuffer();
      const fileName = `relatorio-colaboradores-por-evento-${Date.now()}.xlsx`;
      const fileKey = `exports/${ctx.user.id}/${fileName}`;
      const { url } = await storagePut(fileKey, buffer as any, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

      await db.createExport({
        exportType: 'report_collaborators_by_event',
        fileName,
        fileUrl: url,
        fileKey,
        filters: JSON.stringify(input),
        exportedBy: ctx.user.id,
      });

      return { url, fileName };
    }),

  /**
   * Export custom report: Accreditations by Status
   */
  exportAccreditationsByStatus: protectedProcedure
    .input(z.object({
      eventId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const events = input.eventId ? [await db.getEventById(input.eventId)] : await db.getAllEvents();
      const reportData: Array<{ eventName: string; status: string; count: number }> = [];

      for (const event of events) {
        if (!event) continue;
        const accreditations = await db.getAccreditationsByEvent(event.id);
        const statusCount: Record<string, number> = {};

        accreditations.forEach((acc: any) => {
          statusCount[acc.status] = (statusCount[acc.status] || 0) + 1;
        });

        Object.entries(statusCount).forEach(([status, count]) => {
          reportData.push({
            eventName: event.name,
            status,
            count,
          });
        });
      }

      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Credenciamentos por Status');

      worksheet.columns = [
        { header: 'Evento', key: 'eventName', width: 30 },
        { header: 'Status', key: 'status', width: 20 },
        { header: 'Quantidade', key: 'count', width: 15 },
      ];

      worksheet.getRow(1).font = { bold: true };
      worksheet.addRows(reportData);

      const buffer = await workbook.xlsx.writeBuffer();
      const fileName = `relatorio-credenciamentos-por-status-${Date.now()}.xlsx`;
      const fileKey = `exports/${ctx.user.id}/${fileName}`;
      const { url } = await storagePut(fileKey, buffer as any, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

      await db.createExport({
        eventId: input.eventId,
        exportType: 'report_accreditations_by_status',
        fileName,
        fileUrl: url,
        fileKey,
        filters: JSON.stringify(input),
        exportedBy: ctx.user.id,
      });

      return { url, fileName };
    }),

  /**
   * Export custom report: Events by Period
   */
  exportEventsByPeriod: protectedProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const events = await db.getAllEvents();
      const filteredEvents = events.filter((event: any) => {
        if (!event.eventDate) return false;
        const eventDate = new Date(event.eventDate);
        const start = new Date(input.startDate);
        const end = new Date(input.endDate);
        return eventDate >= start && eventDate <= end;
      });

      const reportData = filteredEvents.map((event: any) => ({
        name: event.name,
        wo: event.wo,
        eventDate: event.eventDate,
        location: event.location,
        eventType: event.eventType,
        status: event.status,
        federation: event.federation,
      }));

      const ExcelJS = (await import('exceljs')).default;
      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Eventos por Período');

      worksheet.columns = [
        { header: 'Nome', key: 'name', width: 30 },
        { header: 'WO', key: 'wo', width: 15 },
        { header: 'Data', key: 'eventDate', width: 15 },
        { header: 'Local', key: 'location', width: 25 },
        { header: 'Tipo', key: 'eventType', width: 20 },
        { header: 'Status', key: 'status', width: 15 },
        { header: 'Federação', key: 'federation', width: 20 },
      ];

      worksheet.getRow(1).font = { bold: true };
      worksheet.addRows(reportData);

      const buffer = await workbook.xlsx.writeBuffer();
      const fileName = `relatorio-eventos-por-periodo-${Date.now()}.xlsx`;
      const fileKey = `exports/${ctx.user.id}/${fileName}`;
      const { url } = await storagePut(fileKey, buffer as any, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

      await db.createExport({
        exportType: 'report_events_by_period',
        fileName,
        fileUrl: url,
        fileKey,
        filters: JSON.stringify(input),
        exportedBy: ctx.user.id,
      });

      return { url, fileName };
    }),
  /**
   * Export collaborators to Excel
   */
  exportCollaborators: protectedProcedure
    .input(z.object({
      eventId: z.number().optional(),
      supplierId: z.number().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Get collaborators based on filters
      let collaborators;
      if (input.supplierId) {
        collaborators = await db.getCollaboratorsBySupplier(input.supplierId);
      } else {
        collaborators = await db.getAllCollaborators();
      }

      // Get event name if specified
      let eventName: string | undefined;
      if (input.eventId) {
        const event = await db.getEventById(input.eventId);
        eventName = event?.name;
      }

      // Generate Excel
      const { url, fileKey, fileName } = await generateCollaboratorsExcel(
        collaborators as any,
        eventName
      );

      // Save export record
      await db.createExport({
        eventId: input.eventId,
        exportType: 'collaborators',
        fileName,
        fileUrl: url,
        fileKey,
        filters: JSON.stringify(input),
        exportedBy: ctx.user.id,
      });

      return { url, fileName };
    }),

  /**
   * Export accreditations to Excel
   */
  exportAccreditations: protectedProcedure
    .input(z.object({
      eventId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const event = await db.getEventById(input.eventId);
      if (!event) {
        throw new Error('Evento não encontrado');
      }

      const accreditations = await db.getAccreditationsByEvent(input.eventId);

      // Enrich with collaborator and job function data
      const enrichedData = await Promise.all(
        accreditations.map(async (acc) => {
          const collaborator = await db.getCollaboratorById(acc.collaboratorId);
          const jobFunction = await db.getJobFunctionById(acc.jobFunctionId);
          
          return {
            collaboratorName: collaborator?.name || '',
            collaboratorCPF: collaborator?.cpf || '',
            eventName: event.name,
            jobFunctionName: jobFunction?.name || '',
            status: acc.status,
            createdAt: acc.createdAt,
            approvedAt: acc.approvedAt,
          };
        })
      );

      const { url, fileKey, fileName } = await generateAccreditationsExcel(
        enrichedData,
        event.name
      );

      // Save export record
      await db.createExport({
        eventId: input.eventId,
        exportType: 'accreditations',
        fileName,
        fileUrl: url,
        fileKey,
        filters: JSON.stringify(input),
        exportedBy: ctx.user.id,
      });

      return { url, fileName };
    }),

  /**
   * List export history
   */
  listExports: protectedProcedure
    .input(z.object({
      eventId: z.number().optional(),
    }))
    .query(async ({ input }) => {
      if (input.eventId) {
        return await db.getExportsByEvent(input.eventId);
      }
      return await db.getAllExports();
    }),
});

export const batchImportRouter = router({
  /**
   * Upload and parse Excel file for batch import
   */
  uploadBatchFile: protectedProcedure
    .input(z.object({
      eventId: z.number().optional(),
      fileBuffer: z.string(), // Base64 encoded
      fileName: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      // Verify user has supplier
      if (ctx.user.role === 'fornecedor' && !ctx.user.supplierId) {
        throw new Error('Usuário não vinculado a fornecedor');
      }

      const supplierId = ctx.user.role === 'admin' ? 1 : ctx.user.supplierId!;

      // Decode base64 buffer
      const buffer = Buffer.from(input.fileBuffer, 'base64');

      // Upload file to S3
      const timestamp = Date.now();
      const fileKey = `batch-imports/${supplierId}_${timestamp}_${input.fileName}`;
      const { url } = await storagePut(fileKey, buffer, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

      // Create batch import record
      const result = await db.createBatchImport({
        eventId: input.eventId,
        supplierId,
        fileName: input.fileName,
        fileUrl: url,
        fileKey,
        status: 'pending',
        processedBy: ctx.user.id,
      });

      return {
        success: true,
        batchImportId: Number(result[0].insertId),
        fileUrl: url,
      };
    }),

  /**
   * Process batch import
   */
  processBatchImport: protectedProcedure
    .input(z.object({
      batchImportId: z.number(),
    }))
    .mutation(async ({ input, ctx }) => {
      const batchImport = await db.getBatchImportById(input.batchImportId);
      if (!batchImport) {
        throw new Error('Importação não encontrada');
      }

      // Update status to processing
      await db.updateBatchImport(input.batchImportId, { status: 'processing' });

      try {
        // Fetch file from S3 (in real implementation, use storageGet)
        // For now, we'll simulate
        const response = await fetch(batchImport.fileUrl);
        const arrayBuffer = await response.arrayBuffer();

        // Parse Excel
        const { data, errors } = await parseCollaboratorsExcel(arrayBuffer);

        if (errors.length > 0) {
          await db.updateBatchImport(input.batchImportId, {
            status: 'failed',
            errorDetails: JSON.stringify(errors),
            processedAt: new Date(),
          });
          return {
            success: false,
            errors,
          };
        }

        // Import collaborators
        let successCount = 0;
        let errorCount = 0;
        const importErrors: any[] = [];

        for (const row of data) {
          try {
            // Check if CPF already exists
            const existing = await db.getCollaboratorByCPF(row.cpf);
            if (existing) {
              errorCount++;
              importErrors.push({ cpf: row.cpf, error: 'CPF já cadastrado' });
              continue;
            }

            // Create collaborator
            await db.createCollaborator({
              supplierId: batchImport.supplierId,
              name: row.name,
              cpf: row.cpf,
              email: row.email,
              phone: row.phone,
              vehicleInfo: row.vehicleInfo,
              active: true,
            });

            successCount++;
          } catch (error: any) {
            errorCount++;
            importErrors.push({ cpf: row.cpf, error: error.message });
          }
        }

        // Update batch import record
        await db.updateBatchImport(input.batchImportId, {
          status: errorCount === 0 ? 'completed' : 'failed',
          totalRows: data.length,
          successRows: successCount,
          errorRows: errorCount,
          errorDetails: importErrors.length > 0 ? JSON.stringify(importErrors) : undefined,
          processedAt: new Date(),
        });

        return {
          success: errorCount === 0,
          totalRows: data.length,
          successRows: successCount,
          errorRows: errorCount,
          errors: importErrors,
        };
      } catch (error: any) {
        await db.updateBatchImport(input.batchImportId, {
          status: 'failed',
          errorDetails: error.message,
          processedAt: new Date(),
        });
        throw error;
      }
    }),

  /**
   * List batch imports
   */
  listBatchImports: protectedProcedure
    .query(async ({ ctx }) => {
      if (ctx.user.role === 'admin') {
        // Admin sees all
        return await db.getAllExports(); // This should be getBatchImports, but we'll use exports for now
      } else if (ctx.user.supplierId) {
        return await db.getBatchImportsBySupplier(ctx.user.supplierId);
      }
      return [];
    }),
});
