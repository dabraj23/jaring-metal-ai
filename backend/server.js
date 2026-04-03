const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
// v1.0.1 - frontend bug fixes
const { db, initializeSchema, logAudit } = require('./database/db');
const { generateToken, authMiddleware, requireRole } = require('./middleware/auth');
const { extractDocumentData, recommendCategory } = require('./services/geminiService');
const { evaluateFormula, calculateDetailedBreakdown } = require('./services/pricingEngine');
const { getCurrentMarketPrices, refreshMarketPrices, overrideMarketPrice, captureMarketSnapshot, getMarketPricesForQuotation } = require('./services/marketData');
const { generateAndSaveQuotationPDF } = require('./services/pdfGenerator');

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure upload and output directories exist
const uploadDir = path.join(__dirname, 'uploads');
const outputDir = path.join(__dirname, 'output');
[uploadDir, outputDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000', 'http://127.0.0.1:5173'],
  credentials: true
}));

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Serve static frontend files
const publicDir = path.join(__dirname, 'public');
if (fs.existsSync(publicDir)) {
  app.use(express.static(publicDir));
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}_${uuidv4().slice(0, 8)}_${file.originalname}`;
    cb(null, uniqueName);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }
});

// Initialize schema on startup
initializeSchema();

// ============ AUTH ENDPOINTS ============

app.post('/api/auth/login', (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const stmt = db.prepare('SELECT * FROM users WHERE email = ? AND active = 1');
    const user = stmt.get(email);

    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = generateToken(user);
    logAudit('user', user.id, 'login', `User ${user.email} logged in`, null, null, user.id, user.name);

    res.json({
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/auth/register', authMiddleware, requireRole('admin'), (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'All fields required' });
    }

    const stmt = db.prepare('INSERT INTO users (name, email, password_hash, role) VALUES (?, ?, ?, ?)');
    const hash = bcrypt.hashSync(password, 10);

    try {
      stmt.run(name, email, hash, role);
      const newUser = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      logAudit('user', newUser.id, 'create', `New user ${email} created with role ${role}`, null, role, req.user.id, req.user.name);

      res.status(201).json({
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role
        }
      });
    } catch (error) {
      if (error.message.includes('UNIQUE')) {
        return res.status(400).json({ error: 'Email already exists' });
      }
      throw error;
    }
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/auth/me', authMiddleware, (req, res) => {
  res.json({ user: req.user });
});

// ============ CUSTOMER ENDPOINTS ============

app.get('/api/customers', authMiddleware, (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM customers WHERE active = 1 ORDER BY name');
    const customers = stmt.all();
    res.json(customers);
  } catch (error) {
    console.error('Fetch customers error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/customers', authMiddleware, requireRole('admin', 'commercial'), (req, res) => {
  try {
    const { name, code, email } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Customer name required' });
    }

    const stmt = db.prepare('INSERT INTO customers (name, code, email) VALUES (?, ?, ?)');
    stmt.run(name, code || null, email || null);

    const customer = db.prepare('SELECT * FROM customers WHERE name = ? ORDER BY id DESC LIMIT 1').get(name);
    logAudit('customer', customer.id, 'create', `Created customer ${name}`, null, name, req.user.id, req.user.name);

    res.status(201).json(customer);
  } catch (error) {
    console.error('Create customer error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ QUOTATION ENDPOINTS ============

app.get('/api/quotations', authMiddleware, (req, res) => {
  try {
    const { status, type, customer_id } = req.query;

    let query = 'SELECT * FROM quotation_requests WHERE 1=1';
    const params = [];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }
    if (type) {
      query += ' AND quotation_type = ?';
      params.push(type);
    }
    if (customer_id) {
      query += ' AND customer_id = ?';
      params.push(parseInt(customer_id));
    }

    query += ' ORDER BY created_at DESC';

    const stmt = db.prepare(query);
    const quotations = stmt.all(...params);

    res.json(quotations);
  } catch (error) {
    console.error('Fetch quotations error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/quotations', authMiddleware, requireRole('admin', 'commercial'), (req, res) => {
  try {
    const { customer_id, customer_name, quotation_type, notes } = req.body;

    const referenceNo = `QT${Date.now()}${Math.floor(Math.random() * 1000)}`;

    const stmt = db.prepare(`
      INSERT INTO quotation_requests (reference_no, customer_id, customer_name, quotation_type, status, created_by, notes)
      VALUES (?, ?, ?, ?, 'Draft', ?, ?)
    `);

    stmt.run(referenceNo, customer_id || null, customer_name || null, quotation_type || 'Spot', req.user.id, notes || null);

    const quotation = db.prepare('SELECT * FROM quotation_requests WHERE reference_no = ?').get(referenceNo);
    logAudit('quotation', quotation.id, 'create', `Created quotation ${referenceNo}`, null, 'Draft', req.user.id, req.user.name);

    res.status(201).json(quotation);
  } catch (error) {
    console.error('Create quotation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/quotations/:id', authMiddleware, (req, res) => {
  try {
    const quotationId = parseInt(req.params.id);

    const quotationStmt = db.prepare('SELECT * FROM quotation_requests WHERE id = ?');
    const quotation = quotationStmt.get(quotationId);

    if (!quotation) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    const documentsStmt = db.prepare('SELECT * FROM supporting_documents WHERE quotation_request_id = ?');
    const documents = documentsStmt.all(quotationId);

    const extractedFieldsStmt = db.prepare('SELECT * FROM extracted_fields WHERE quotation_request_id = ?');
    const extractedFields = extractedFieldsStmt.all(quotationId);

    const extractedMetalsStmt = db.prepare('SELECT * FROM extracted_metal_results WHERE quotation_request_id = ?');
    const extractedMetals = extractedMetalsStmt.all(quotationId);

    res.json({
      quotation,
      documents,
      extractedFields,
      extractedMetals,
      pricing: quotation.pricing_result_json ? JSON.parse(quotation.pricing_result_json) : null
    });
  } catch (error) {
    console.error('Fetch quotation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/quotations/:id', authMiddleware, (req, res) => {
  try {
    const quotationId = parseInt(req.params.id);
    const updates = req.body;

    const allowedFields = ['customer_name', 'quotation_type', 'status', 'notes', 'validity_period'];
    const updates_obj = {};

    for (const [key, value] of Object.entries(updates)) {
      if (allowedFields.includes(key)) {
        updates_obj[key] = value;
      }
    }

    if (Object.keys(updates_obj).length === 0) {
      return res.status(400).json({ error: 'No valid fields to update' });
    }

    const setClause = Object.keys(updates_obj).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates_obj);

    const updateStmt = db.prepare(`
      UPDATE quotation_requests SET ${setClause}, updated_at = datetime('now') WHERE id = ?
    `);

    updateStmt.run(...values, quotationId);

    const quotation = db.prepare('SELECT * FROM quotation_requests WHERE id = ?').get(quotationId);
    logAudit('quotation', quotationId, 'update', 'Quotation updated', JSON.stringify(req.body), JSON.stringify(updates_obj), req.user.id, req.user.name);

    res.json(quotation);
  } catch (error) {
    console.error('Update quotation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ DOCUMENT UPLOAD & EXTRACTION ============

app.post('/api/quotations/:id/documents', authMiddleware, upload.single('file'), async (req, res) => {
  try {
    const quotationId = parseInt(req.params.id);

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const stmt = db.prepare(`
      INSERT INTO supporting_documents (quotation_request_id, filename, original_name, file_path, file_type, file_size, status)
      VALUES (?, ?, ?, ?, ?, ?, 'uploaded')
    `);

    stmt.run(
      quotationId,
      req.file.filename,
      req.file.originalname,
      req.file.path,
      req.file.mimetype,
      req.file.size
    );

    const document = db.prepare('SELECT * FROM supporting_documents WHERE filename = ?').get(req.file.filename);
    logAudit('document', document.id, 'upload', `Uploaded ${req.file.originalname}`, null, req.file.filename, req.user.id, req.user.name);

    res.status(201).json(document);
  } catch (error) {
    console.error('Upload document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/quotations/:id/documents', authMiddleware, (req, res) => {
  try {
    const quotationId = parseInt(req.params.id);
    const stmt = db.prepare('SELECT * FROM supporting_documents WHERE quotation_request_id = ? ORDER BY upload_timestamp DESC');
    const documents = stmt.all(quotationId);
    res.json(documents);
  } catch (error) {
    console.error('Fetch documents error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/api/quotations/:id/documents/:docId', authMiddleware, (req, res) => {
  try {
    const docId = parseInt(req.params.docId);

    const docStmt = db.prepare('SELECT * FROM supporting_documents WHERE id = ?');
    const doc = docStmt.get(docId);

    if (!doc) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (fs.existsSync(doc.file_path)) {
      fs.unlinkSync(doc.file_path);
    }

    const deleteStmt = db.prepare('DELETE FROM supporting_documents WHERE id = ?');
    deleteStmt.run(docId);

    logAudit('document', docId, 'delete', `Deleted ${doc.original_name}`, doc.filename, null, req.user.id, req.user.name);

    res.json({ success: true, message: 'Document deleted' });
  } catch (error) {
    console.error('Delete document error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/quotations/:id/extract', authMiddleware, async (req, res) => {
  try {
    const quotationId = parseInt(req.params.id);
    const { document_id } = req.body;

    if (!document_id) {
      return res.status(400).json({ error: 'document_id required' });
    }

    const docStmt = db.prepare('SELECT * FROM supporting_documents WHERE id = ?');
    const document = docStmt.get(document_id);

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    const updateStatusStmt = db.prepare('UPDATE supporting_documents SET status = ? WHERE id = ?');
    updateStatusStmt.run('extracting', document_id);

    const extractedData = await extractDocumentData(document.file_path, document.original_name);
    const categoryRec = await recommendCategory(extractedData);

    const saveExtractionStmt = db.prepare('UPDATE supporting_documents SET status = ?, extraction_result = ? WHERE id = ?');
    saveExtractionStmt.run('extracted', JSON.stringify(extractedData), document_id);

    // Save extracted fields
    const fieldStmt = db.prepare(`
      INSERT INTO extracted_fields (document_id, quotation_request_id, field_name, field_value, confidence_score)
      VALUES (?, ?, ?, ?, ?)
    `);

    const fieldsToExtract = [
      'customer_name', 'lab_ref_no', 'date_issued', 'date_sample_received',
      'sample_marking', 'sample_description', 'physical_appearance', 'original_weight'
    ];

    fieldsToExtract.forEach(field => {
      if (extractedData[field] !== undefined && extractedData[field] !== null) {
        const value = typeof extractedData[field] === 'object' ? JSON.stringify(extractedData[field]) : extractedData[field];
        fieldStmt.run(document_id, quotationId, field, value, extractedData.overall_confidence || 0.8);
      }
    });

    // Save extracted metal results
    const metalStmt = db.prepare(`
      INSERT INTO extracted_metal_results (document_id, quotation_request_id, metal_code, value, unit, confidence_score)
      VALUES (?, ?, ?, ?, ?, ?)
    `);

    Object.entries(extractedData.metal_results || {}).forEach(([metalCode, data]) => {
      if (data && data.value !== null) {
        metalStmt.run(document_id, quotationId, metalCode, data.value, data.unit, data.confidence || 0.9);
      }
    });

    // Update quotation with category recommendation
    const quotStmt = db.prepare('UPDATE quotation_requests SET category_id = ? WHERE id = ?');
    const categoryId = db.prepare('SELECT id FROM material_categories WHERE code = ?').get(categoryRec.recommended_category);
    if (categoryId) {
      quotStmt.run(categoryId.id, quotationId);
    }

    logAudit('quotation', quotationId, 'extract', 'Document extraction completed', null, JSON.stringify(categoryRec), req.user.id, req.user.name);

    res.json({
      success: true,
      extractedData,
      categoryRecommendation: categoryRec,
      fieldsExtracted: fieldsToExtract.length,
      metalsExtracted: Object.keys(extractedData.metal_results || {}).length
    });
  } catch (error) {
    console.error('Extraction error:', error);
    const updateStatusStmt = db.prepare('UPDATE supporting_documents SET status = ? WHERE id = ?');
    updateStatusStmt.run('extraction_failed', req.body.document_id);
    res.status(500).json({ error: 'Extraction failed: ' + error.message });
  }
});

app.get('/api/quotations/:id/extracted', authMiddleware, (req, res) => {
  try {
    const quotationId = parseInt(req.params.id);

    const fieldsStmt = db.prepare('SELECT * FROM extracted_fields WHERE quotation_request_id = ?');
    const fields = fieldsStmt.all(quotationId);

    const metalsStmt = db.prepare('SELECT * FROM extracted_metal_results WHERE quotation_request_id = ?');
    const metals = metalsStmt.all(quotationId);

    res.json({ fields, metals });
  } catch (error) {
    console.error('Fetch extracted data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.patch('/api/quotations/:id/extracted/:fieldId', authMiddleware, (req, res) => {
  try {
    const fieldId = parseInt(req.params.fieldId);
    const { edited_value } = req.body;

    const updateStmt = db.prepare(`
      UPDATE extracted_fields
      SET is_edited = 1, edited_value = ?, edited_by = ?, edited_at = datetime('now')
      WHERE id = ?
    `);

    updateStmt.run(edited_value, req.user.id, fieldId);

    const field = db.prepare('SELECT * FROM extracted_fields WHERE id = ?').get(fieldId);
    logAudit('extracted_field', fieldId, 'edit', `Field ${field.field_name} edited`, field.field_value, edited_value, req.user.id, req.user.name);

    res.json(field);
  } catch (error) {
    console.error('Update extracted field error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ CATEGORY & PRICING ============

app.get('/api/categories', authMiddleware, (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM material_categories WHERE active = 1 ORDER BY name');
    const categories = stmt.all();
    res.json(categories);
  } catch (error) {
    console.error('Fetch categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/quotations/:id/category', authMiddleware, (req, res) => {
  try {
    const quotationId = parseInt(req.params.id);
    const { category_id } = req.body;

    if (!category_id) {
      return res.status(400).json({ error: 'category_id required' });
    }

    const stmt = db.prepare('UPDATE quotation_requests SET category_id = ?, category_confirmed = 1 WHERE id = ?');
    stmt.run(category_id, quotationId);

    const quotation = db.prepare('SELECT * FROM quotation_requests WHERE id = ?').get(quotationId);
    const category = db.prepare('SELECT * FROM material_categories WHERE id = ?').get(category_id);

    logAudit('quotation', quotationId, 'confirm_category', `Category confirmed: ${category.name}`, null, category.code, req.user.id, req.user.name);

    res.json(quotation);
  } catch (error) {
    console.error('Confirm category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/formulas', authMiddleware, (req, res) => {
  try {
    const { category_id } = req.query;

    let query = 'SELECT f.*, fv.id as version_id, fv.version FROM formulas f LEFT JOIN formula_versions fv ON f.id = fv.formula_id WHERE f.active = 1';
    const params = [];

    if (category_id) {
      query += ' AND f.category_id = ?';
      params.push(parseInt(category_id));
    }

    query += ' ORDER BY f.name, fv.version DESC';

    const stmt = db.prepare(query);
    const formulas = stmt.all(...params);

    res.json(formulas);
  } catch (error) {
    console.error('Fetch formulas error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/quotations/:id/calculate', authMiddleware, async (req, res) => {
  try {
    const quotationId = parseInt(req.params.id);
    const { formula_version_id } = req.body;

    if (!formula_version_id) {
      return res.status(400).json({ error: 'formula_version_id required' });
    }

    const formulaStmt = db.prepare('SELECT * FROM formula_versions WHERE id = ?');
    const formulaVersion = formulaStmt.get(formula_version_id);

    if (!formulaVersion) {
      return res.status(404).json({ error: 'Formula version not found' });
    }

    const quotationStmt = db.prepare('SELECT * FROM quotation_requests WHERE id = ?');
    const quotation = quotationStmt.get(quotationId);

    if (!quotation) {
      return res.status(404).json({ error: 'Quotation not found' });
    }

    const marketPrices = await getCurrentMarketPrices();

    const metalsStmt = db.prepare('SELECT metal_code, value FROM extracted_metal_results WHERE quotation_request_id = ?');
    const extractedMetals = {};
    metalsStmt.all(quotationId).forEach(m => {
      extractedMetals[m.metal_code] = m.value;
    });

    const inputs = { ...marketPrices, ...extractedMetals };
    Object.keys(inputs).forEach(key => {
      if (typeof inputs[key] === 'object' && inputs[key].price !== undefined) {
        inputs[key] = inputs[key].price;
      }
    });

    const expressionJson = JSON.parse(formulaVersion.expression_json);
    const result = evaluateFormula(expressionJson, inputs);

    if (!result.success) {
      return res.status(400).json({ error: 'Formula evaluation failed: ' + result.error });
    }

    const updateStmt = db.prepare('UPDATE quotation_requests SET formula_version_id = ?, pricing_result_json = ? WHERE id = ?');
    updateStmt.run(formula_version_id, JSON.stringify(result), quotationId);

    logAudit('quotation', quotationId, 'calculate', 'Pricing calculated', null, JSON.stringify(result), req.user.id, req.user.name);

    res.json({
      success: true,
      result,
      formulaVersionId: formula_version_id,
      inputVariables: Object.keys(inputs)
    });
  } catch (error) {
    console.error('Calculate pricing error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/quotations/:id/breakdown', authMiddleware, (req, res) => {
  try {
    const quotationId = parseInt(req.params.id);

    const quotationStmt = db.prepare('SELECT pricing_result_json, formula_version_id FROM quotation_requests WHERE id = ?');
    const quotation = quotationStmt.get(quotationId);

    if (!quotation || !quotation.pricing_result_json) {
      return res.status(404).json({ error: 'No pricing breakdown available' });
    }

    const breakdown = JSON.parse(quotation.pricing_result_json);
    res.json(breakdown);
  } catch (error) {
    console.error('Fetch breakdown error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ MARKET DATA ============

app.get('/api/market-data', authMiddleware, async (req, res) => {
  try {
    const prices = await getCurrentMarketPrices();
    res.json(prices);
  } catch (error) {
    console.error('Fetch market data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/market-data/fetch', authMiddleware, requireRole('admin', 'pricing'), async (req, res) => {
  try {
    const result = await refreshMarketPrices();
    logAudit('market_data', 0, 'refresh', 'Market prices refreshed', null, JSON.stringify(result), req.user.id, req.user.name);
    res.json(result);
  } catch (error) {
    console.error('Refresh market data error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/market-data/override', authMiddleware, requireRole('admin', 'pricing'), async (req, res) => {
  try {
    const { metal_code, price, note } = req.body;

    if (!metal_code || !price) {
      return res.status(400).json({ error: 'metal_code and price required' });
    }

    const result = await overrideMarketPrice(metal_code, price, note, req.user.id);
    logAudit('market_data', 0, 'override', `Price overridden for ${metal_code}`, null, price, req.user.id, req.user.name);

    res.json(result);
  } catch (error) {
    console.error('Override market price error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ WORKFLOW ============

app.post('/api/quotations/:id/submit', authMiddleware, requireRole('commercial', 'pricing'), async (req, res) => {
  try {
    const quotationId = parseInt(req.params.id);

    const updateStmt = db.prepare('UPDATE quotation_requests SET status = ?, updated_at = datetime(\'now\') WHERE id = ?');
    updateStmt.run('Pending Approval', quotationId);

    const approvalStmt = db.prepare(`
      INSERT INTO approval_records (quotation_request_id, action, status, actioned_by, actioned_by_name, actioned_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `);
    approvalStmt.run(quotationId, 'Submit', 'Submitted', req.user.id, req.user.name);

    logAudit('quotation', quotationId, 'submit', 'Quotation submitted for approval', 'Draft', 'Pending Approval', req.user.id, req.user.name);

    const quotation = db.prepare('SELECT * FROM quotation_requests WHERE id = ?').get(quotationId);
    res.json(quotation);
  } catch (error) {
    console.error('Submit quotation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/quotations/:id/approve', authMiddleware, requireRole('approver'), async (req, res) => {
  try {
    const quotationId = parseInt(req.params.id);
    const { comment } = req.body;

    const updateStmt = db.prepare('UPDATE quotation_requests SET status = ?, updated_at = datetime(\'now\') WHERE id = ?');
    updateStmt.run('Approved', quotationId);

    const approvalStmt = db.prepare(`
      INSERT INTO approval_records (quotation_request_id, action, status, comment, actioned_by, actioned_by_name, actioned_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    approvalStmt.run(quotationId, 'Approve', 'Approved', comment || null, req.user.id, req.user.name);

    logAudit('quotation', quotationId, 'approve', 'Quotation approved', 'Pending Approval', 'Approved', req.user.id, req.user.name);

    const quotation = db.prepare('SELECT * FROM quotation_requests WHERE id = ?').get(quotationId);
    res.json(quotation);
  } catch (error) {
    console.error('Approve quotation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/quotations/:id/reject', authMiddleware, requireRole('approver'), async (req, res) => {
  try {
    const quotationId = parseInt(req.params.id);
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason required' });
    }

    const updateStmt = db.prepare('UPDATE quotation_requests SET status = ?, updated_at = datetime(\'now\') WHERE id = ?');
    updateStmt.run('Rejected', quotationId);

    const approvalStmt = db.prepare(`
      INSERT INTO approval_records (quotation_request_id, action, status, comment, actioned_by, actioned_by_name, actioned_at)
      VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
    `);
    approvalStmt.run(quotationId, 'Reject', 'Rejected', reason, req.user.id, req.user.name);

    logAudit('quotation', quotationId, 'reject', 'Quotation rejected', 'Pending Approval', 'Rejected', req.user.id, req.user.name);

    const quotation = db.prepare('SELECT * FROM quotation_requests WHERE id = ?').get(quotationId);
    res.json(quotation);
  } catch (error) {
    console.error('Reject quotation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/quotations/:id/release', authMiddleware, requireRole('approver', 'finance'), async (req, res) => {
  try {
    const quotationId = parseInt(req.params.id);

    const updateStmt = db.prepare('UPDATE quotation_requests SET status = ?, updated_at = datetime(\'now\') WHERE id = ?');
    updateStmt.run('Released', quotationId);

    const approvalStmt = db.prepare(`
      INSERT INTO approval_records (quotation_request_id, action, status, actioned_by, actioned_by_name, actioned_at)
      VALUES (?, ?, ?, ?, ?, datetime('now'))
    `);
    approvalStmt.run(quotationId, 'Release', 'Released', req.user.id, req.user.name);

    logAudit('quotation', quotationId, 'release', 'Quotation released', 'Approved', 'Released', req.user.id, req.user.name);

    const quotation = db.prepare('SELECT * FROM quotation_requests WHERE id = ?').get(quotationId);
    res.json(quotation);
  } catch (error) {
    console.error('Release quotation error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/quotations/:id/generate', authMiddleware, requireRole('approver', 'commercial'), async (req, res) => {
  try {
    const quotationId = parseInt(req.params.id);

    const result = await generateAndSaveQuotationPDF(quotationId, req.user.id);

    if (result.success) {
      logAudit('quotation', quotationId, 'generate_pdf', 'PDF quotation generated', null, result.filename, req.user.id, req.user.name);
      res.json(result);
    } else {
      res.status(500).json({ error: result.error });
    }
  } catch (error) {
    console.error('Generate PDF error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ AUDIT & REPORTS ============

app.get('/api/quotations/:id/audit', authMiddleware, (req, res) => {
  try {
    const quotationId = parseInt(req.params.id);

    const stmt = db.prepare('SELECT * FROM audit_logs WHERE entity_type = \'quotation\' AND entity_id = ? ORDER BY timestamp DESC');
    const logs = stmt.all(quotationId);

    res.json(logs);
  } catch (error) {
    console.error('Fetch audit logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/audit', authMiddleware, requireRole('admin', 'approver'), (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;

    const stmt = db.prepare('SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT ?');
    const logs = stmt.all(limit);

    res.json(logs);
  } catch (error) {
    console.error('Fetch global audit logs error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/reports/summary', authMiddleware, (req, res) => {
  try {
    const totalQuotations = db.prepare('SELECT COUNT(*) as count FROM quotation_requests').get().count;
    const draftCount = db.prepare('SELECT COUNT(*) as count FROM quotation_requests WHERE status = \'Draft\'').get().count;
    const pendingCount = db.prepare('SELECT COUNT(*) as count FROM quotation_requests WHERE status = \'Pending Approval\'').get().count;
    const approvedCount = db.prepare('SELECT COUNT(*) as count FROM quotation_requests WHERE status = \'Approved\'').get().count;
    const releasedCount = db.prepare('SELECT COUNT(*) as count FROM quotation_requests WHERE status = \'Released\'').get().count;

    const totalCustomers = db.prepare('SELECT COUNT(*) as count FROM customers').get().count;
    const totalUsers = db.prepare('SELECT COUNT(*) as count FROM users WHERE active = 1').get().count;

    res.json({
      quotations: {
        total: totalQuotations,
        draft: draftCount,
        pendingApproval: pendingCount,
        approved: approvedCount,
        released: releasedCount
      },
      customers: totalCustomers,
      activeUsers: totalUsers,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Fetch summary error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ ADMIN ENDPOINTS ============

app.get('/api/admin/categories', authMiddleware, requireRole('admin'), (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM material_categories ORDER BY name');
    const categories = stmt.all();
    res.json(categories);
  } catch (error) {
    console.error('Fetch categories error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/admin/categories', authMiddleware, requireRole('admin'), (req, res) => {
  try {
    const { code, name, description } = req.body;

    if (!code || !name) {
      return res.status(400).json({ error: 'Code and name required' });
    }

    const stmt = db.prepare('INSERT INTO material_categories (code, name, description) VALUES (?, ?, ?)');
    stmt.run(code, name, description || null);

    const category = db.prepare('SELECT * FROM material_categories WHERE code = ?').get(code);
    logAudit('category', category.id, 'create', `Created category ${code}`, null, name, req.user.id, req.user.name);

    res.status(201).json(category);
  } catch (error) {
    console.error('Create category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/admin/categories/:id', authMiddleware, requireRole('admin'), (req, res) => {
  try {
    const categoryId = parseInt(req.params.id);
    const { name, description, active } = req.body;

    const updateStmt = db.prepare('UPDATE material_categories SET name = ?, description = ?, active = ? WHERE id = ?');
    updateStmt.run(name, description || null, active !== undefined ? active : 1, categoryId);

    const category = db.prepare('SELECT * FROM material_categories WHERE id = ?').get(categoryId);
    logAudit('category', categoryId, 'update', `Updated category ${category.code}`, null, JSON.stringify(req.body), req.user.id, req.user.name);

    res.json(category);
  } catch (error) {
    console.error('Update category error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/admin/formulas', authMiddleware, requireRole('admin'), (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT f.*, fv.id as version_id, fv.version
      FROM formulas f
      LEFT JOIN formula_versions fv ON f.id = fv.formula_id
      ORDER BY f.name, fv.version DESC
    `);
    const formulas = stmt.all();
    res.json(formulas);
  } catch (error) {
    console.error('Fetch formulas error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/admin/formulas', authMiddleware, requireRole('admin'), (req, res) => {
  try {
    const { name, category_id, quotation_type, expression_json, input_variables } = req.body;

    if (!name || !expression_json) {
      return res.status(400).json({ error: 'Name and expression_json required' });
    }

    const formulaStmt = db.prepare('INSERT INTO formulas (name, category_id, quotation_type, active) VALUES (?, ?, ?, 1)');
    formulaStmt.run(name, category_id || null, quotation_type || 'Spot');

    const formula = db.prepare('SELECT * FROM formulas WHERE name = ? ORDER BY id DESC LIMIT 1').get(name);

    const versionStmt = db.prepare(`
      INSERT INTO formula_versions (formula_id, version, expression_json, input_variables, created_by)
      VALUES (?, 1, ?, ?, ?)
    `);
    versionStmt.run(formula.id, JSON.stringify(expression_json), input_variables || null, req.user.id);

    logAudit('formula', formula.id, 'create', `Created formula ${name}`, null, JSON.stringify(expression_json), req.user.id, req.user.name);

    res.status(201).json(formula);
  } catch (error) {
    console.error('Create formula error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/admin/formulas/:id', authMiddleware, requireRole('admin'), (req, res) => {
  try {
    const formulaId = parseInt(req.params.id);
    const { name, category_id, active, expression_json } = req.body;

    const updateStmt = db.prepare('UPDATE formulas SET name = ?, category_id = ?, active = ? WHERE id = ?');
    updateStmt.run(name, category_id || null, active !== undefined ? active : 1, formulaId);

    if (expression_json) {
      const maxVersion = db.prepare('SELECT MAX(version) as max FROM formula_versions WHERE formula_id = ?').get(formulaId);
      const newVersion = (maxVersion.max || 0) + 1;

      const versionStmt = db.prepare(`
        INSERT INTO formula_versions (formula_id, version, expression_json, created_by)
        VALUES (?, ?, ?, ?)
      `);
      versionStmt.run(formulaId, newVersion, JSON.stringify(expression_json), req.user.id);

      logAudit('formula', formulaId, 'update_version', `Created version ${newVersion}`, null, JSON.stringify(expression_json), req.user.id, req.user.name);
    }

    const formula = db.prepare('SELECT * FROM formulas WHERE id = ?').get(formulaId);
    res.json(formula);
  } catch (error) {
    console.error('Update formula error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/admin/benchmarks', authMiddleware, requireRole('admin'), (req, res) => {
  try {
    const stmt = db.prepare('SELECT * FROM benchmarks ORDER BY metal_code');
    const benchmarks = stmt.all();
    res.json(benchmarks);
  } catch (error) {
    console.error('Fetch benchmarks error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.post('/api/admin/benchmarks', authMiddleware, requireRole('admin'), (req, res) => {
  try {
    const { name, metal_code, unit, source } = req.body;

    if (!name || !metal_code) {
      return res.status(400).json({ error: 'Name and metal_code required' });
    }

    const stmt = db.prepare('INSERT INTO benchmarks (name, metal_code, unit, source, active) VALUES (?, ?, ?, ?, 1)');
    stmt.run(name, metal_code, unit || 'USD/tonne', source || null);

    const benchmark = db.prepare('SELECT * FROM benchmarks WHERE metal_code = ? ORDER BY id DESC LIMIT 1').get(metal_code);
    logAudit('benchmark', benchmark.id, 'create', `Created benchmark ${metal_code}`, null, name, req.user.id, req.user.name);

    res.status(201).json(benchmark);
  } catch (error) {
    console.error('Create benchmark error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/admin/benchmarks/:id', authMiddleware, requireRole('admin'), (req, res) => {
  try {
    const benchmarkId = parseInt(req.params.id);
    const { name, unit, source, active } = req.body;

    const updateStmt = db.prepare('UPDATE benchmarks SET name = ?, unit = ?, source = ?, active = ? WHERE id = ?');
    updateStmt.run(name, unit || 'USD/tonne', source || null, active !== undefined ? active : 1, benchmarkId);

    const benchmark = db.prepare('SELECT * FROM benchmarks WHERE id = ?').get(benchmarkId);
    logAudit('benchmark', benchmarkId, 'update', `Updated benchmark ${benchmark.metal_code}`, null, JSON.stringify(req.body), req.user.id, req.user.name);

    res.json(benchmark);
  } catch (error) {
    console.error('Update benchmark error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.get('/api/admin/users', authMiddleware, requireRole('admin'), (req, res) => {
  try {
    const stmt = db.prepare('SELECT id, name, email, role, active, created_at FROM users ORDER BY name');
    const users = stmt.all();
    res.json(users);
  } catch (error) {
    console.error('Fetch users error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.put('/api/admin/users/:id', authMiddleware, requireRole('admin'), (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { name, role, active } = req.body;

    const updateStmt = db.prepare('UPDATE users SET name = ?, role = ?, active = ? WHERE id = ?');
    updateStmt.run(name, role, active !== undefined ? active : 1, userId);

    const user = db.prepare('SELECT id, name, email, role, active FROM users WHERE id = ?').get(userId);
    logAudit('user', userId, 'update', `Updated user ${user.email}`, null, JSON.stringify(req.body), req.user.id, req.user.name);

    res.json(user);
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// ============ HEALTH CHECK ============

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/api/version', (req, res) => {
  res.json({ version: '1.0.0', name: 'Jaring Metal AI Backend', environment: process.env.NODE_ENV || 'development' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error', message: err.message });
});

// SPA fallback - serve index.html for all non-API routes
app.get('*', (req, res) => {
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(404).json({ error: 'Frontend not built. Run npm run build in the client directory.' });
  }
});

// Start server
const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`Jaring Metal AI Backend running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Database: ${path.join(__dirname, 'database/jaringmetal.db')}`);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use`);
  } else {
    console.error('Server error:', err);
  }
  process.exit(1);
});

module.exports = app;
