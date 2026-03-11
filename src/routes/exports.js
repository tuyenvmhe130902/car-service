import express from 'express';
import PDFDocument from 'pdfkit';
import { format } from 'date-fns';
import { getDb } from '../db/init.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FONT_PATH = path.join(__dirname, '..', 'fonts', 'OpenSans-Regular.ttf');

const router = express.Router();

// Helper functions for formatting
const formatValue = (value) => value || '/';
const formatCost = (cost) => cost ? `€${Number(cost).toFixed(2)}` : '/';
const formatMileage = (mileage) => mileage ? `${mileage.toLocaleString()} km` : '/';

// Function to write a service record
const writeServiceRecord = (doc, service) => {
    // Date and mileage header
    doc.fontSize(12)
       .text(`${format(new Date(service.service_date), 'dd.MM.yyyy')} - ${formatMileage(service.mileage)}`, 
           { underline: true })
       .moveDown(0.3);

    // Service details
    doc.text(`Type: ${formatValue(service.service_type)}`)
       .text(`Description: ${formatValue(service.description)}`, {
           width: doc.page.width - 100, // Ensure long descriptions wrap properly
           align: 'left'
       })
       .text(`Location: ${formatValue(service.location)}`)
       .text(`Cost: ${formatCost(service.cost)}`);

    // Next service information
    if (service.next_service_mileage || service.next_service_notes) {
        doc.moveDown(0.3)
           .text('Next Service:');
        
        if (service.next_service_mileage) {
            doc.text(`Mileage: ${formatMileage(service.next_service_mileage)}`);
        }
        
        if (service.next_service_notes) {
            doc.text(`Notes: ${formatValue(service.next_service_notes)}`);
        }
    }

    doc.moveDown();
};

router.get('/vehicle/:vehicleId/pdf', async (req, res) => {
    const vehicleId = req.params.vehicleId;
    console.log(`Starting PDF generation for vehicle ID: ${vehicleId}`);

    try {
        const db = await getDb();
        const vehicle = await db.get('SELECT * FROM vehicles WHERE id = ?', vehicleId);
        
        if (!vehicle) {
            return res.status(404).json({ error: 'Vehicle not found' });
        }

        const services = await db.all(`
            SELECT * FROM service_records 
            WHERE vehicle_id = ? 
            ORDER BY service_date DESC
        `, vehicleId);

        // Create PDF document with custom font
        const doc = new PDFDocument({
            size: 'A4',
            margin: 50,
            bufferPages: true // Enable page buffering for footer
        });

        // Register and use custom font
        doc.registerFont('OpenSans', FONT_PATH);
        doc.font('OpenSans');

        // Set response headers
        res.setHeader('Content-Type', 'application/pdf');

        // Format filename: only replace spaces with hyphens, keep special characters
        const formatForFilename = (text) => {
          return text
              .trim()
              .replace(/\s+/g, '-');     // Replace spaces with hyphens
          };

        const filename = `Service records for ${formatForFilename(vehicle.make)}-${formatForFilename(vehicle.model)}-${formatForFilename(vehicle.name)}.pdf`;
        
        // Encode the filename for HTTP headers while preserving UTF-8 characters
        const encodedFilename = encodeURIComponent(filename).replace(/['()]/g, escape);
        
        res.setHeader('Content-Disposition', 
            `attachment; filename*=UTF-8''${encodedFilename}`);

        doc.pipe(res);

        // Document title
        doc.fontSize(20)
           .text('Vehicle Service Records', {
               align: 'center'
           })
           .moveDown();

        // Vehicle information section
        doc.fontSize(16)
           .text('Vehicle Information')
           .moveDown(0.5);

        doc.fontSize(12)
           .text(`Make: ${vehicle.make}`)
           .text(`Model: ${vehicle.model}`)
           .text(`Year: ${vehicle.year || '/'}`)
           .text(`Engine: ${formatValue(vehicle.engine)}`)
           .text(`VIN: ${formatValue(vehicle.vin)}`)
           .text(`First Registration: ${vehicle.first_registration ? 
                format(new Date(vehicle.first_registration), 'dd.MM.yyyy') : '/'}`)
           .moveDown();

        // Service records section
        if (services.length > 0) {
            doc.fontSize(16)
               .text('Service History')
               .moveDown(0.5);

            services.forEach((service, index) => {
                // Calculate approximate height needed for this record
                const baseHeight = 120; // Base height for standard fields
                const descriptionLines = service.description ? 
                    Math.ceil(service.description.length / 80) : 0; // Estimate lines needed for description
                const notesLines = service.next_service_notes ? 
                    Math.ceil(service.next_service_notes.length / 80) : 0;
                const totalNeededHeight = baseHeight + 
                    (descriptionLines * 15) + // 15 points per line of description
                    (notesLines * 15) + // 15 points per line of notes
                    40; // Extra margin for safety

                // Check if we need a new page
                if (doc.y + totalNeededHeight > doc.page.height - 70) {
                    doc.addPage();
                }

                // Write the service record
                writeServiceRecord(doc, service);

                // Add space between records if not the last record
                if (index < services.length - 1) {
                    doc.moveDown();
                }
            });
        } else {
            doc.text('No service records found.');
        }

        // Add footer with generation date and page numbers on each page
        const pageCount = doc.bufferedPageRange().count;
        for (let i = 0; i < pageCount; i++) {
            doc.switchToPage(i);
            
            // Add footer
            doc.fontSize(8)
               .text(
                   `Generated on: ${format(new Date(), 'dd.MM.yyyy HH:mm')} | Page ${i + 1} of ${pageCount}`,
                   50,
                   doc.page.height - 50,
                   {
                       align: 'center',
                       width: doc.page.width - 100
                   }
               );
        }

        // Finalize the document
        doc.end();
        console.log('PDF generation completed successfully');

    } catch (error) {
        console.error('Error in PDF generation:', error);
        if (!res.headersSent) {
            res.status(500).json({ 
                error: 'Failed to generate PDF', 
                details: error.message 
            });
        }
    }
});

export default router;