const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const { db } = require('../database/db');

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(value);
}

function generateQuotationPDF(quotationData, outputPath) {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({
        size: 'A4',
        margin: 40
      });

      const stream = fs.createWriteStream(outputPath);
      doc.pipe(stream);

      // Header
      doc.fontSize(24).font('Helvetica-Bold').text('JARING METAL', { align: 'left' });
      doc.fontSize(12).font('Helvetica').text('Quotation Intelligence Platform', { align: 'left' });
      doc.moveDown(0.5);
      doc.fontSize(10).text('Singapore | Malaysia | Thailand', { align: 'left' });
      doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(1);

      // Quotation Header Info
      doc.fontSize(11).font('Helvetica-Bold').text('QUOTATION DETAILS', { underline: true });
      doc.moveDown(0.3);

      const quoteData = [
        ['Reference No:', quotationData.reference_no || 'N/A'],
        ['Date:', quotationData.quote_date || new Date().toISOString().split('T')[0]],
        ['Customer:', quotationData.customer_name || 'N/A'],
        ['Quotation Type:', quotationData.quotation_type || 'Spot'],
        ['Validity Period:', `${quotationData.validity_period || 30} days`],
        ['Status:', quotationData.status || 'Draft']
      ];

      doc.fontSize(10).font('Helvetica');
      const colWidth = 200;
      quoteData.forEach(([label, value]) => {
        doc.text(label, 50, doc.y, { width: 100 });
        doc.text(value, 150, doc.y - 15, { width: 400 });
        doc.moveDown(0.8);
      });

      doc.moveDown(0.5);
      doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(1);

      // Material Information
      doc.fontSize(11).font('Helvetica-Bold').text('MATERIAL INFORMATION', { underline: true });
      doc.moveDown(0.3);

      const materialInfo = [
        ['Category:', quotationData.category_name || 'Not confirmed'],
        ['Sample Description:', quotationData.sample_description || 'N/A'],
        ['Original Weight:', quotationData.original_weight || 'N/A'],
        ['Physical Appearance:', quotationData.physical_appearance || 'N/A']
      ];

      doc.fontSize(10).font('Helvetica');
      materialInfo.forEach(([label, value]) => {
        doc.text(label, 50, doc.y, { width: 100 });
        doc.text(value, 150, doc.y - 15, { width: 400 });
        doc.moveDown(0.8);
      });

      doc.moveDown(0.5);
      doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(1);

      // Pricing Breakdown
      if (quotationData.pricing_breakdown) {
        doc.fontSize(11).font('Helvetica-Bold').text('PRICING BREAKDOWN', { underline: true });
        doc.moveDown(0.3);

        const breakdown = quotationData.pricing_breakdown;

        doc.fontSize(10).font('Helvetica');
        if (breakdown.stepResults && breakdown.stepResults.length > 0) {
          breakdown.stepResults.forEach(step => {
            doc.text(`${step.name}: ${step.formatted}`, 50, doc.y);
            doc.moveDown(0.4);
          });
        }

        doc.moveDown(0.5);
        doc.fontSize(11).font('Helvetica-Bold').text(`Final Value: ${formatCurrency(breakdown.finalValue)}`, 50, doc.y);
        doc.moveDown(1);
      }

      doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(1);

      // Market Data / Benchmarks
      if (quotationData.benchmarks && quotationData.benchmarks.length > 0) {
        doc.fontSize(11).font('Helvetica-Bold').text('BENCHMARK PRICES (at time of quotation)', { underline: true });
        doc.moveDown(0.3);

        doc.fontSize(9).font('Helvetica');
        doc.text('Metal', 50, doc.y, { width: 80 });
        doc.text('Price', 130, doc.y - 0, { width: 100 });
        doc.text('Unit', 230, doc.y - 0, { width: 80 });
        doc.text('Source', 310, doc.y - 0, { width: 100 });
        doc.moveDown(0.4);

        quotationData.benchmarks.forEach(benchmark => {
          doc.text(benchmark.metal_code, 50, doc.y, { width: 80 });
          doc.text(formatCurrency(benchmark.value), 130, doc.y - 0, { width: 100 });
          doc.text(benchmark.source_name || 'N/A', 310, doc.y - 0, { width: 100 });
          doc.moveDown(0.4);
        });

        doc.moveDown(0.5);
      }

      doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
      doc.moveDown(1);

      // Approval Section
      doc.fontSize(11).font('Helvetica-Bold').text('APPROVALS & AUTHORIZATIONS', { underline: true });
      doc.moveDown(0.5);

      doc.fontSize(9).font('Helvetica').text('Prepared By: _________________________  Date: _______________', 50);
      doc.moveDown(0.8);
      doc.text('Approved By: _________________________  Date: _______________', 50);
      doc.moveDown(0.8);
      doc.text('Released By: _________________________   Date: _______________', 50);

      doc.moveDown(2);
      doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();

      // Footer
      doc.fontSize(8).font('Helvetica').text(
        `Generated on ${new Date().toLocaleString()} | Page 1 of 1 | Ref: ${quotationData.reference_no}`,
        40,
        doc.page.height - 30,
        { align: 'center' }
      );

      doc.end();

      stream.on('finish', () => {
        resolve({
          success: true,
          filePath: outputPath,
          filename: path.basename(outputPath)
        });
      });

      stream.on('error', (error) => {
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
}

function getQuotationPDFData(quotationId) {
  try {
    const quotationStmt = db.prepare(`
      SELECT
        qr.id,
        qr.reference_no,
        qr.customer_name,
        qr.quotation_type,
        qr.quote_date,
        qr.validity_period,
        qr.status,
        qr.pricing_result_json,
        mc.name as category_name,
        qr.notes
      FROM quotation_requests qr
      LEFT JOIN material_categories mc ON qr.category_id = mc.id
      WHERE qr.id = ?
    `);

    const quotation = quotationStmt.get(quotationId);
    if (!quotation) {
      throw new Error('Quotation not found');
    }

    const extractedMetalsStmt = db.prepare(`
      SELECT DISTINCT
        emr.metal_code,
        emr.value,
        emr.unit
      FROM extracted_metal_results emr
      WHERE emr.quotation_request_id = ?
    `);

    const benchmarksStmt = db.prepare(`
      SELECT DISTINCT
        bs.metal_code,
        bs.value,
        bs.source_name
      FROM benchmark_snapshots bs
      WHERE bs.quotation_request_id = ?
      ORDER BY bs.fetched_at DESC
    `);

    const pricingBreakdown = quotation.pricing_result_json ? JSON.parse(quotation.pricing_result_json) : null;

    return {
      reference_no: quotation.reference_no,
      customer_name: quotation.customer_name,
      quotation_type: quotation.quotation_type,
      quote_date: quotation.quote_date,
      validity_period: quotation.validity_period,
      status: quotation.status,
      category_name: quotation.category_name,
      pricing_breakdown: pricingBreakdown,
      benchmarks: benchmarksStmt.all(quotationId),
      extracted_metals: extractedMetalsStmt.all(quotationId),
      notes: quotation.notes
    };
  } catch (error) {
    console.error('Error getting quotation PDF data:', error);
    throw error;
  }
}

async function generateAndSaveQuotationPDF(quotationId, userId) {
  try {
    const pdfData = getQuotationPDFData(quotationId);
    const outputDir = path.join(__dirname, '../output');

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const filename = `quotation_${pdfData.reference_no}_${Date.now()}.pdf`;
    const filePath = path.join(outputDir, filename);

    await generateQuotationPDF(pdfData, filePath);

    const outputStmt = db.prepare(`
      INSERT INTO generated_outputs (quotation_request_id, output_type, filename, file_path, version)
      VALUES (?, ?, ?, ?, 1)
    `);

    outputStmt.run(quotationId, 'PDF', filename, filePath);

    return {
      success: true,
      filename,
      filePath
    };
  } catch (error) {
    console.error('Error generating PDF:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  generateQuotationPDF,
  getQuotationPDFData,
  generateAndSaveQuotationPDF
};
