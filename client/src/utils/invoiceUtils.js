import html2pdf from 'html2pdf.js';

/**
 * Downloads the targeted HTML element as a PDF
 * @param {string} invoiceId - ID of the invoice (used for filename)
 */
export const downloadInvoiceAsPDF = (invoiceId) => {
  const element = document.getElementById('invoice-container');
  if (!element) {
    console.error('Invoice container not found');
    return;
  }

  const opt = {
    margin: [10, 10, 10, 10], // top, left, bottom, right
    filename: `RoadAssist-Invoice-${invoiceId || 'Download'}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  html2pdf().set(opt).from(element).save();
};
