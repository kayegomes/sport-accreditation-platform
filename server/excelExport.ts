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
  access?: string;
  status?: string;
}

interface AccreditationExportData {
  collaboratorName: string;
  collaboratorCPF: string;
  supplierName: string;
  eventName: string;
  eventDate: string;
  location: string;
  confronto: string;
  jobFunctionName: string;
  access: string;
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

  if (accreditations.length > 0) {
    const first = accreditations[0];
    
    // Header Info (Rows 2-4)
    worksheet.getCell('B2').value = 'CAMPEONATO';
    worksheet.getCell('B2').font = { bold: true };
    worksheet.getCell('E2').value = first.eventName;
    
    worksheet.getCell('B3').value = 'CONFRONTO';
    worksheet.getCell('B3').font = { bold: true };
    worksheet.getCell('E3').value = first.confronto || '';
    
    worksheet.getCell('B4').value = 'LOCAL';
    worksheet.getCell('B4').font = { bold: true };
    worksheet.getCell('E4').value = first.location || '';
    
    // Table Headers (Row 6)
    const headerRow = worksheet.getRow(6);
    headerRow.values = [null, 'EMPRESA', 'NOME', 'CPF', 'FUNÇÃO', 'ACESSO', 'STATUS'];
    headerRow.font = { bold: true };
    
    // Style Table Headers
    ['B', 'C', 'D', 'E', 'F', 'G'].forEach(col => {
      const cell = worksheet.getCell(`${col}6`);
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFD9D9D9' }
      };
      cell.border = {
        top: { style: 'thin' },
        left: { style: 'thin' },
        bottom: { style: 'thin' },
        right: { style: 'thin' }
      };
    });

    // Add data starting from Row 7
    accreditations.forEach((acc, index) => {
      const rowIndex = 7 + index;
      const row = worksheet.getRow(rowIndex);
      row.values = [
        null,
        acc.supplierName,
        acc.collaboratorName,
        acc.collaboratorCPF,
        acc.jobFunctionName,
        acc.access || '',
        acc.status
      ];

      // Add borders to data cells
      ['B', 'C', 'D', 'E', 'F', 'G'].forEach(col => {
        const cell = worksheet.getCell(`${col}${rowIndex}`);
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      });
    });

    // Set column widths
    worksheet.getColumn('A').width = 5;
    worksheet.getColumn('B').width = 25;
    worksheet.getColumn('C').width = 35;
    worksheet.getColumn('D').width = 20;
    worksheet.getColumn('E').width = 25;
    worksheet.getColumn('F').width = 20;
    worksheet.getColumn('G').width = 15;
  }

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
