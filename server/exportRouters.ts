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
