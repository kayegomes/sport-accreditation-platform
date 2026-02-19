import ExcelJS from 'exceljs';
import { storagePut } from './storage';

interface CollaboratorExportData {
  id: number;
  name: string;
  cpf: string;
  email: string;
  phone: string;
  supplierName?: string;
  jobFunctionName?: string;
  eventName?: string;
  status?: string;
}

interface AccreditationExportData {
  collaboratorName: string;
  collaboratorCPF: string;
  eventName: string;
  jobFunctionName: string;
  status: string;
  createdAt: Date;
  approvedAt?: Date | null;
}

/**
 * Generate Excel file for collaborators list
 */
export async function generateCollaboratorsExcel(
  collaborators: CollaboratorExportData[],
  eventName?: string
): Promise<{ url: string; fileKey: string; fileName: string }> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Colaboradores');

  // Define columns
  worksheet.columns = [
    { header: 'ID', key: 'id', width: 10 },
    { header: 'Nome', key: 'name', width: 30 },
    { header: 'CPF', key: 'cpf', width: 15 },
    { header: 'Email', key: 'email', width: 30 },
    { header: 'Telefone', key: 'phone', width: 15 },
    { header: 'Fornecedor', key: 'supplierName', width: 25 },
    { header: 'Função', key: 'jobFunctionName', width: 20 },
    { header: 'Evento', key: 'eventName', width: 30 },
    { header: 'Status', key: 'status', width: 15 },
  ];

  // Style header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF4472C4' },
  };
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  // Add data
  collaborators.forEach(collab => {
    worksheet.addRow(collab);
  });

  // Auto-filter
  worksheet.autoFilter = {
    from: 'A1',
    to: `I${collaborators.length + 1}`,
  };

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();

  // Upload to S3
  const timestamp = Date.now();
  const fileName = eventName 
    ? `colaboradores_${eventName.replace(/\s+/g, '_')}_${timestamp}.xlsx`
    : `colaboradores_${timestamp}.xlsx`;
  const fileKey = `exports/${fileName}`;

  const { url } = await storagePut(fileKey, buffer as any, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

  return { url, fileKey, fileName };
}

/**
 * Generate Excel file for accreditations/credentials
 */
export async function generateAccreditationsExcel(
  accreditations: AccreditationExportData[],
  eventName: string
): Promise<{ url: string; fileKey: string; fileName: string }> {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Credenciamentos');

  // Define columns
  worksheet.columns = [
    { header: 'Nome', key: 'collaboratorName', width: 30 },
    { header: 'CPF', key: 'collaboratorCPF', width: 15 },
    { header: 'Evento', key: 'eventName', width: 30 },
    { header: 'Função', key: 'jobFunctionName', width: 20 },
    { header: 'Status', key: 'status', width: 15 },
    { header: 'Data de Cadastro', key: 'createdAt', width: 20 },
    { header: 'Data de Aprovação', key: 'approvedAt', width: 20 },
  ];

  // Style header row
  worksheet.getRow(1).font = { bold: true };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF70AD47' },
  };
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };

  // Add data with formatting
  accreditations.forEach(acc => {
    const row = worksheet.addRow({
      ...acc,
      createdAt: acc.createdAt,
      approvedAt: acc.approvedAt || '',
    });
    
    // Format dates
    if (acc.createdAt) {
      row.getCell('createdAt').numFmt = 'dd/mm/yyyy hh:mm';
    }
    if (acc.approvedAt) {
      row.getCell('approvedAt').numFmt = 'dd/mm/yyyy hh:mm';
    }
    
    // Color code by status
    const statusCell = row.getCell('status');
    switch (acc.status) {
      case 'aprovado':
      case 'credenciado':
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFC6EFCE' },
        };
        break;
      case 'rejeitado':
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFC7CE' },
        };
        break;
      case 'pendente':
        statusCell.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFFFEB9C' },
        };
        break;
    }
  });

  // Auto-filter
  worksheet.autoFilter = {
    from: 'A1',
    to: `G${accreditations.length + 1}`,
  };

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();

  // Upload to S3
  const timestamp = Date.now();
  const fileName = `credenciamentos_${eventName.replace(/\s+/g, '_')}_${timestamp}.xlsx`;
  const fileKey = `exports/${fileName}`;

  const { url } = await storagePut(fileKey, buffer as any, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');

  return { url, fileKey, fileName };
}

/**
 * Parse uploaded Excel file for batch import
 */
export async function parseCollaboratorsExcel(buffer: ArrayBuffer): Promise<{
  data: Array<{
    name: string;
    cpf: string;
    email: string;
    phone: string;
    jobFunction?: string;
    vehicleInfo?: string;
  }>;
  errors: Array<{ row: number; message: string }>;
}> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const worksheet = workbook.getWorksheet(1);
  if (!worksheet) {
    throw new Error('Planilha não encontrada');
  }

  const data: any[] = [];
  const errors: Array<{ row: number; message: string }> = [];

  // Expected columns: Nome, CPF, Email, Telefone, Função (optional), Veículo (optional)
  worksheet.eachRow((row, rowNumber) => {
    // Skip header row
    if (rowNumber === 1) return;

    const name = row.getCell(1).value?.toString().trim();
    const cpf = row.getCell(2).value?.toString().trim();
    const email = row.getCell(3).value?.toString().trim();
    const phone = row.getCell(4).value?.toString().trim();
    const jobFunction = row.getCell(5).value?.toString().trim();
    const vehicleInfo = row.getCell(6).value?.toString().trim();

    // Validate required fields
    if (!name || !cpf || !email || !phone) {
      errors.push({
        row: rowNumber,
        message: 'Campos obrigatórios faltando (Nome, CPF, Email, Telefone)',
      });
      return;
    }

    // Basic CPF validation (11 digits)
    const cpfClean = cpf.replace(/\D/g, '');
    if (cpfClean.length !== 11) {
      errors.push({
        row: rowNumber,
        message: 'CPF inválido (deve conter 11 dígitos)',
      });
      return;
    }

    // Basic email validation
    if (!email.includes('@')) {
      errors.push({
        row: rowNumber,
        message: 'Email inválido',
      });
      return;
    }

    data.push({
      name,
      cpf: cpfClean,
      email,
      phone,
      jobFunction: jobFunction || undefined,
      vehicleInfo: vehicleInfo || undefined,
    });
  });

  return { data, errors };
}
