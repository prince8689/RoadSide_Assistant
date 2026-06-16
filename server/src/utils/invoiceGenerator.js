const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

const generateInvoice = async (request, invoicePath) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      const stream = fs.createWriteStream(invoicePath);
      
      doc.pipe(stream);

      // Header
      doc.fontSize(25).font('Helvetica-Bold').text('RoadAssist Invoice', { align: 'center' });
      doc.moveDown();
      doc.fontSize(12).font('Helvetica').text(`Invoice Date: ${new Date().toLocaleDateString()}`, { align: 'right' });
      doc.text(`Request ID: ${request.id}`, { align: 'right' });
      doc.moveDown(2);

      // Customer Info
      doc.fontSize(14).font('Helvetica-Bold').text('Customer Details:');
      doc.fontSize(12).font('Helvetica').text(`Name: ${request.user_name || 'Customer'}`);
      doc.text(`Phone: ${request.user_phone || 'N/A'}`);
      doc.text(`Vehicle: ${request.vehicle_make} ${request.vehicle_model} (${request.vehicle_year})`);
      doc.text(`License Plate: ${request.vehicle_license_plate}`);
      doc.moveDown();

      // Mechanic Info
      doc.fontSize(14).font('Helvetica-Bold').text('Mechanic Details:');
      doc.fontSize(12).font('Helvetica').text(`Name: ${request.mechanic_name || 'Mechanic'}`);
      doc.text(`Phone: ${request.mechanic_phone || 'N/A'}`);
      doc.moveDown(2);

      // Service Details
      doc.fontSize(14).font('Helvetica-Bold').text('Service Summary:');
      doc.moveDown(0.5);
      
      // Table-like structure
      const tableTop = doc.y;
      doc.font('Helvetica-Bold');
      doc.text('Service', 50, tableTop);
      doc.text('Amount', 400, tableTop, { width: 100, align: 'right' });
      
      doc.moveTo(50, tableTop + 15).lineTo(500, tableTop + 15).stroke();
      
      const itemY = tableTop + 25;
      doc.font('Helvetica');
      doc.text(request.category_name, 50, itemY);
      doc.text(`Rs. ${request.category_base_price}`, 400, itemY, { width: 100, align: 'right' });

      doc.moveTo(50, itemY + 20).lineTo(500, itemY + 20).stroke();

      const totalY = itemY + 30;
      doc.font('Helvetica-Bold');
      doc.text('Total Paid:', 300, totalY);
      doc.text(`Rs. ${request.category_base_price}`, 400, totalY, { width: 100, align: 'right' });
      
      doc.moveDown(3);
      doc.font('Helvetica').text(`Payment Method: ${request.payment_method?.toUpperCase() || 'CASH'}`);
      doc.text(`Payment Status: PAID`);

      // Footer
      doc.moveDown(5);
      doc.fontSize(10).font('Helvetica-Oblique').text('Thank you for using RoadAssist!', { align: 'center' });

      doc.end();

      stream.on('finish', () => resolve(true));
      stream.on('error', (err) => reject(err));
    } catch (error) {
      reject(error);
    }
  });
};

module.exports = { generateInvoice };
