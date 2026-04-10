const ExcelJS = require('exceljs');

/**
 * Export data to Excel format
 * @param {Array} data - Array of objects to export
 * @param {string} sheetName - Name of the worksheet
 * @param {Array} columns - Column definitions [{ header: 'Name', key: 'name', width: 20 }]
 * @returns {Buffer} - Excel file buffer
 */
async function exportToExcel(data, sheetName = 'Sheet1', columns = null) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet(sheetName);

  // If columns not provided, auto-generate from first row
  if (!columns && data.length > 0) {
    columns = Object.keys(data[0]).map(key => ({
      header: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
      key: key,
      width: 15
    }));
  }

  worksheet.columns = columns;

  // Style header row
  worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  worksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1e3a5f' }
  };
  worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
  worksheet.getRow(1).height = 25;

  // Add data rows
  worksheet.addRows(data);

  // Apply borders to all cells
  worksheet.eachRow((row, rowNumber) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
        right: { style: 'thin', color: { argb: 'FFD0D0D0' } }
      };

      // Align numbers to right
      if (typeof cell.value === 'number') {
        cell.alignment = { horizontal: 'right' };
      }
    });
  });

  // Generate buffer
  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

/**
 * Export multiple sheets to Excel
 * @param {Array} sheets - Array of { name, data, columns }
 * @returns {Buffer} - Excel file buffer
 */
async function exportMultiSheetExcel(sheets) {
  const workbook = new ExcelJS.Workbook();

  for (const sheet of sheets) {
    const worksheet = workbook.addWorksheet(sheet.name);

    let columns = sheet.columns;
    if (!columns && sheet.data.length > 0) {
      columns = Object.keys(sheet.data[0]).map(key => ({
        header: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        key: key,
        width: 15
      }));
    }

    worksheet.columns = columns;

    // Style header
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1e3a5f' }
    };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Add data
    worksheet.addRows(sheet.data);

    // Borders
    worksheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          left: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          bottom: { style: 'thin', color: { argb: 'FFD0D0D0' } },
          right: { style: 'thin', color: { argb: 'FFD0D0D0' } }
        };
      });
    });
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer;
}

module.exports = {
  exportToExcel,
  exportMultiSheetExcel
};
