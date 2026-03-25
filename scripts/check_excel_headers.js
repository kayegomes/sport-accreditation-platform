const ExcelJS = require('exceljs');
const path = require('path');

async function checkExcel() {
    try {
        const workbook = new ExcelJS.Workbook();
        const filePath = path.join('c:', 'Users', 'ligomes', 'Downloads', 'esporte-credenciamento', 'CREDENCIAMENTO ORIGINAL II.xlsx');
        await workbook.xlsx.readFile(filePath);
        const worksheet = workbook.getWorksheet(1);
        const headerRow = worksheet.getRow(1);
        console.log('Headers:', headerRow.values);
        
        // Let's also check the second row to see sample data format
        const secondRow = worksheet.getRow(2);
        console.log('Sample data:', secondRow.values);
    } catch (err) {
        console.error(err);
    }
}

checkExcel();
