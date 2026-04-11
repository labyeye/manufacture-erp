




const COMPANY_HEADER = `
<div style="border-bottom:2px solid #1e3a5f;padding-bottom:14px;margin-bottom:20px;display:flex;justify-content:space-between;align-items:flex-start">
  <div>
    <div style="font-size:20px;font-weight:900;color:#1e3a5f;letter-spacing:-0.5px;margin-bottom:3px">AARAY PACKAGING PRIVATE LIMITED</div>
    <div style="font-size:10px;color:#666;margin-bottom:1px">Unit I: A7/64 & A7/65, South Side GT Road Industrial Area, Ghaziabad</div>
    <div style="font-size:10px;color:#666">Unit II: 27MI & 28MI, South Side GT Road Industrial Area, Ghaziabad</div>
  </div>
  <div style="text-align:right;font-size:10px;color:#444">
    <div>www.rapackaging.in</div>
    <div>orders@rapackaging.in</div>
    <div>+91 9311802540</div>
  </div>
</div>
`;




const BASE_STYLES = `
  body { font-family: Arial, sans-serif; font-size: 12px; color: #000; margin: 30px; }
  h1 { font-size: 20px; margin-bottom: 4px; color: #1e3a5f; }
  h2 { font-size: 16px; margin: 16px 0 8px 0; color: #1e3a5f; }
  table { width: 100%; border-collapse: collapse; margin-top: 16px; }
  th { background: #f0f0f0; padding: 8px 12px; text-align: left; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 2px solid #ddd; }
  th.right { text-align: right; }
  td { padding: 7px 12px; border-bottom: 1px solid #eee; font-size: 12px; }
  .right { text-align: right; }
  .bold { font-weight: bold; }
  .summary { display: flex; gap: 24px; margin: 16px 0; padding: 14px 18px; background: #f8f8f8; border-radius: 6px; border: 1px solid #e0e0e0; }
  .stat { text-align: center; }
  .stat-val { font-size: 22px; font-weight: 800; font-family: monospace; color: #1a1a1a; }
  .stat-lbl { font-size: 10px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-top: 2px; }
  .footer { margin-top: 24px; padding-top: 10px; border-top: 1px solid #eee; display: flex; justify-content: space-between; font-size: 11px; color: #888; }
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; margin: 16px 0; }
  .info-row { display: flex; }
  .info-label { font-weight: 600; width: 120px; color: #555; }
  .info-value { color: #000; }
  @media print { body { margin: 15px; } }
`;







async function generatePDF(html, title = 'Document') {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();
    const fullHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8"/>
        <title>${title}</title>
        <style>${BASE_STYLES}</style>
      </head>
      <body>
        ${html}
      </body>
      </html>
    `;

    await page.setContent(fullHtml, { waitUntil: 'networkidle0' });

    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: '20px',
        right: '20px',
        bottom: '20px',
        left: '20px'
      }
    });

    return pdf;
  } finally {
    await browser.close();
  }
}




async function generateJobCardPDF(jobOrder) {
  const html = `
    ${COMPANY_HEADER}
    <h1>Job Card</h1>
    <div style="color:#666;font-size:12px;margin-bottom:16px">
      JO No: <strong>${jobOrder.joNo}</strong> &nbsp;·&nbsp; Date: ${new Date(jobOrder.jobcardDate).toLocaleDateString('en-IN')}
    </div>

    <div class="info-grid">
      <div class="info-row"><div class="info-label">Client:</div><div class="info-value">${jobOrder.clientName || '—'}</div></div>
      <div class="info-row"><div class="info-label">Item:</div><div class="info-value">${jobOrder.itemName || jobOrder.product || '—'}</div></div>
      <div class="info-row"><div class="info-label">Order Qty:</div><div class="info-value">${(jobOrder.orderQty || 0).toLocaleString('en-IN')}</div></div>
      <div class="info-row"><div class="info-label">Delivery Date:</div><div class="info-value">${jobOrder.deliveryDate ? new Date(jobOrder.deliveryDate).toLocaleDateString('en-IN') : '—'}</div></div>
      <div class="info-row"><div class="info-label">SO Ref:</div><div class="info-value">${jobOrder.soRef || '—'}</div></div>
      <div class="info-row"><div class="info-label">Status:</div><div class="info-value">${jobOrder.status || 'Open'}</div></div>
    </div>

    <h2>Paper Specification</h2>
    <div class="info-grid">
      <div class="info-row"><div class="info-label">Paper Type:</div><div class="info-value">${jobOrder.paperType || '—'}</div></div>
      <div class="info-row"><div class="info-label">GSM:</div><div class="info-value">${jobOrder.paperGsm || '—'}</div></div>
      ${jobOrder.sheetSize ? `<div class="info-row"><div class="info-label">Sheet Size:</div><div class="info-value">${jobOrder.sheetSize}</div></div>` : ''}
      ${jobOrder.noOfUps ? `<div class="info-row"><div class="info-label">No. of Ups:</div><div class="info-value">${jobOrder.noOfUps}</div></div>` : ''}
      ${jobOrder.noOfSheets ? `<div class="info-row"><div class="info-label">No. of Sheets:</div><div class="info-value">${jobOrder.noOfSheets.toLocaleString('en-IN')}</div></div>` : ''}
    </div>

    <h2>Process List</h2>
    <table>
      <thead>
        <tr>
          <th>Stage</th>
          <th>Machine</th>
          <th>Status</th>
          <th>Qty Completed</th>
        </tr>
      </thead>
      <tbody>
        ${(jobOrder.process || []).map(proc => {
          const completed = (jobOrder.completedProcesses || []).includes(proc);
          const machineId = jobOrder.machineAssignments ? jobOrder.machineAssignments.get(proc) : null;
          const qty = jobOrder.stageQtyMap ? jobOrder.stageQtyMap.get(proc) || 0 : 0;
          return `
            <tr>
              <td>${proc}</td>
              <td>${machineId || '—'}</td>
              <td>${completed ? '✓ Completed' : 'Pending'}</td>
              <td class="right">${qty > 0 ? qty.toLocaleString('en-IN') : '—'}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>

    ${jobOrder.remarks ? `
      <h2>Remarks</h2>
      <div style="padding:10px;background:#f9f9f9;border-left:3px solid #1e3a5f;margin-top:10px">${jobOrder.remarks}</div>
    ` : ''}

    <div class="footer">
      <span>Generated on ${new Date().toLocaleDateString('en-IN')}</span>
      <span>This is a computer generated document</span>
    </div>
  `;

  return await generatePDF(html, `JobCard_${jobOrder.joNo}`);
}

module.exports = {
  generatePDF,
  generateJobCardPDF,
  COMPANY_HEADER,
  BASE_STYLES
};
