import PDFDocument from 'pdfkit';
import { format } from 'date-fns';
import { formatMileage, formatCost } from '../../../frontend/src/utils/formatters.js';

export async function generateServiceRecordsPDF(doc, vehicle, services) {
  // Set document metadata
  doc.info.Title = `Service Records - ${vehicle.make} ${vehicle.model}`;
  doc.info.Author = 'Car Service Tracker';

  // Add header
  doc.fontSize(20)
     .text('Vehicle Service Records', { align: 'center' })
     .moveDown();

  // Add vehicle information
  doc.fontSize(12)
     .text('Vehicle Information', { underline: true })
     .moveDown(0.5);

  const vehicleInfo = [
    `Make: ${vehicle.make}`,
    `Model: ${vehicle.model}`,
    `Year: ${vehicle.year}`,
    `Engine: ${vehicle.engine || 'N/A'}`,
    `VIN: ${vehicle.vin || 'N/A'}`,
    `First Registration: ${vehicle.first_registration ? format(new Date(vehicle.first_registration), 'dd.MM.yyyy') : 'N/A'}`
  ];

  vehicleInfo.forEach(info => {
    doc.text(info).moveDown(0.2);
  });

  doc.moveDown();

  // Add service records
  doc.fontSize(12)
     .text('Service History', { underline: true })
     .moveDown(0.5);

  services.forEach((service, index) => {
    // Service date and mileage header
    doc.fontSize(11)
       .text(`${format(new Date(service.service_date), 'dd.MM.yyyy')} - ${formatMileage(service.mileage)}`, {
         underline: true
       })
       .moveDown(0.3);

    // Service details
    doc.fontSize(10);
    
    doc.text(`Type: ${service.service_type}`);
    if (service.description) {
      doc.text(`Description: ${service.description}`);
    }
    doc.text(`Location: ${service.location || 'N/A'}`);
    doc.text(`Cost: ${formatCost(service.cost)}`);
    
    if (service.next_service_mileage || service.next_service_notes) {
      doc.text('Next Service:');
      if (service.next_service_mileage) {
        doc.text(`  Mileage: ${formatMileage(service.next_service_mileage)}`);
      }
      if (service.next_service_notes) {
        doc.text(`  Notes: ${service.next_service_notes}`);
      }
    }

    // Add spacing between records
    doc.moveDown();
  });

  // Add footer with page numbers
  const pages = doc.bufferedPageRange();
  for (let i = 0; i < pages.count; i++) {
    doc.switchToPage(i);
    doc.fontSize(8)
       .text(
         `Page ${i + 1} of ${pages.count}`,
         doc.page.margins.left,
         doc.page.height - doc.page.margins.bottom - 20,
         { align: 'center' }
       );
  }
}