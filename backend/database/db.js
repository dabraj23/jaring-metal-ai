const fs = require('fs');
const path = require('path');

// Try to use better-sqlite3 if available, otherwise fall back to JSON-based storage
let useBetterSqlite = true;
let Database;

try {
  Database = require('better-sqlite3');
} catch (error) {
  console.warn('better-sqlite3 not available, using JSON-based storage');
  useBetterSqlite = false;
}

class JsonDatabase {
  constructor() {
    this.dbPath = path.join(__dirname, 'jaringmetal.json');
    this.data = this.loadData();
    this.statements = {};
  }

  loadData() {
    try {
      if (fs.existsSync(this.dbPath)) {
        const content = fs.readFileSync(this.dbPath, 'utf-8');
        return JSON.parse(content);
      }
    } catch (error) {
      console.warn('Could not load database file:', error.message);
    }

    return {
      users: [],
      customers: [],
      material_categories: [],
      formulas: [],
      formula_versions: [],
      benchmarks: [],
      benchmark_snapshots: [],
      quotation_requests: [],
      supporting_documents: [],
      extracted_fields: [],
      extracted_metal_results: [],
      override_logs: [],
      approval_records: [],
      generated_outputs: [],
      audit_logs: [],
      market_data: []
    };
  }

  saveData() {
    try {
      fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save database:', error);
    }
  }

  pragma(pragma) {
    return this;
  }

  exec(sql) {
    return this;
  }

  prepare(sql) {
    const self = this;
    const sqlLower = sql.toLowerCase();

    return {
      run(...params) {
        try {
          // Simple INSERT handler
          if (sqlLower.includes('insert')) {
            const tableMatch = sql.match(/INSERT INTO\s+(\w+)/i);
            if (tableMatch) {
              const table = tableMatch[1];
              if (self.data[table]) {
                const newId = Math.max(0, ...self.data[table].map(r => r.id || 0)) + 1;
                const obj = { id: newId };

                const columnsMatch = sql.match(/\((.*?)\)/);
                const valuesMatch = sql.match(/VALUES\s*\((.*?)\)/i);

                if (columnsMatch && valuesMatch) {
                  const columns = columnsMatch[1].split(',').map(c => c.trim());
                  columns.forEach((col, idx) => {
                    obj[col] = params[idx];
                  });
                }

                self.data[table].push(obj);
                self.saveData();
                return { lastID: newId, changes: 1 };
              }
            }
          }
          // Simple UPDATE handler
          else if (sqlLower.includes('update')) {
            const tableMatch = sql.match(/UPDATE\s+(\w+)/i);
            if (tableMatch) {
              const table = tableMatch[1];
              if (self.data[table]) {
                let updated = 0;
                const whereIdx = sql.indexOf('WHERE');
                if (whereIdx > -1) {
                  const whereClause = sql.substring(whereIdx + 5);
                  const idMatch = whereClause.match(/id\s*=\s*\?/);
                  const lastParam = params[params.length - 1];

                  if (idMatch && lastParam) {
                    const row = self.data[table].find(r => r.id === lastParam);
                    if (row) {
                      const setMatch = sql.match(/SET\s+(.*?)\s+WHERE/i);
                      if (setMatch) {
                        const setPairs = setMatch[1].split(',').map(p => p.trim());
                        setPairs.forEach((pair, idx) => {
                          const colName = pair.split('=')[0].trim();
                          row[colName] = params[idx];
                        });
                      }
                      updated = 1;
                      self.saveData();
                    }
                  }
                }
                return { changes: updated };
              }
            }
          }
          // Simple DELETE handler
          else if (sqlLower.includes('delete')) {
            const tableMatch = sql.match(/DELETE FROM\s+(\w+)/i);
            if (tableMatch) {
              const table = tableMatch[1];
              if (self.data[table]) {
                const whereMatch = sql.match(/WHERE\s+id\s*=\s*\?/i);
                if (whereMatch && params[0]) {
                  self.data[table] = self.data[table].filter(r => r.id !== params[0]);
                  self.saveData();
                  return { changes: 1 };
                } else {
                  const len = self.data[table].length;
                  self.data[table] = [];
                  self.saveData();
                  return { changes: len };
                }
              }
            }
          }
          return { changes: 0 };
        } catch (error) {
          console.error('run() error:', error);
          throw error;
        }
      },

      get(...params) {
        try {
          const tableMatch = sql.match(/FROM\s+(\w+)/i);
          if (!tableMatch) return null;

          const table = tableMatch[1];
          if (!self.data[table]) return null;

          // Handle WHERE email = ? for user lookups (check BEFORE generic id check)
          if (sql.includes('email') && sql.includes('WHERE')) {
            const emailParam = params[0];
            const result = self.data[table].find(r => r.email === emailParam && r.active !== 0);
            return result || null;
          }

          // Handle WHERE reference_no = ? for quotation lookups
          if (sql.includes('reference_no') && sql.includes('WHERE')) {
            return self.data[table].find(r => r.reference_no === params[0]) || null;
          }

          // Handle WHERE code = ? for category lookups
          if (sql.includes('code') && sql.includes('WHERE') && !sql.includes('metal_code')) {
            return self.data[table].find(r => r.code === params[0]) || null;
          }

          // Handle COUNT(*) queries
          if (sql.includes('COUNT(*)')) {
            const whereMatch = sql.match(/WHERE\s+(\w+)\s*=\s*\?/i);
            if (whereMatch && params.length > 0) {
              const field = whereMatch[1];
              const count = self.data[table].filter(r => String(r[field]) === String(params[0])).length;
              return { count };
            }
            return { count: self.data[table].length };
          }

          // Simple WHERE id = ? handler
          if (sql.includes('WHERE') && params.length > 0) {
            const whereIdMatch = sql.match(/WHERE\s+(?:\w+\.)?(\w+)\s*=\s*\?/i);
            if (whereIdMatch) {
              const field = whereIdMatch[1];
              const val = params[0];
              return self.data[table].find(r => String(r[field]) === String(val)) || null;
            }
            const whereId = params[params.length - 1];
            return self.data[table].find(r => r.id === whereId || String(r.id) === String(whereId)) || null;
          }

          return self.data[table][0] || null;
        } catch (error) {
          console.error('get() error:', error);
          return null;
        }
      },

      all(...params) {
        try {
          const tableMatch = sql.match(/FROM\s+(\w+)/i);
          if (!tableMatch) return [];

          let table = tableMatch[1];
          let rows = self.data[table] || [];

          // Handle WHERE clauses
          if (sql.includes('WHERE')) {
            const whereMatch = sql.match(/WHERE\s+(.*?)(?:ORDER|LIMIT|$)/i);
            if (whereMatch) {
              const whereClause = whereMatch[1];

              if (whereClause.includes('status')) {
                const statusIdx = sql.match(/status\s*=/) ? 0 : -1;
                if (statusIdx >= 0 && params[statusIdx]) {
                  rows = rows.filter(r => r.status === params[statusIdx]);
                }
              }

              if (whereClause.includes('quotation_type')) {
                rows = rows.filter(r => r.quotation_type === params[0]);
              }

              if (whereClause.includes('customer_id')) {
                rows = rows.filter(r => r.customer_id === parseInt(params[0]));
              }

              if (whereClause.includes('active')) {
                rows = rows.filter(r => r.active === 1);
              }

              if (whereClause.includes('quotation_request_id')) {
                rows = rows.filter(r => r.quotation_request_id === parseInt(params[0]));
              }
            }
          }

          // Handle ORDER BY
          if (sql.includes('ORDER BY')) {
            const orderMatch = sql.match(/ORDER BY\s+(\w+)\s*(DESC|ASC)?/i);
            if (orderMatch) {
              const orderField = orderMatch[1];
              const direction = (orderMatch[2] || 'ASC').toUpperCase();
              rows = rows.sort((a, b) => {
                const aVal = a[orderField];
                const bVal = b[orderField];
                const cmp = aVal < bVal ? -1 : aVal > bVal ? 1 : 0;
                return direction === 'DESC' ? -cmp : cmp;
              });
            }
          }

          // Handle LIMIT
          if (sql.includes('LIMIT')) {
            const limitMatch = sql.match(/LIMIT\s+(\d+)/i);
            if (limitMatch) {
              rows = rows.slice(0, parseInt(limitMatch[1]));
            }
          }

          return rows;
        } catch (error) {
          console.error('all() error:', error);
          return [];
        }
      }
    };
  }
}

let db;

function initializeDb() {
  if (useBetterSqlite && Database) {
    try {
      const dbPath = path.join(__dirname, 'jaringmetal.db');
      db = new Database(dbPath);
      db.pragma('journal_mode = WAL');
      db.pragma('foreign_keys = ON');
      return db;
    } catch (error) {
      console.warn('Failed to initialize better-sqlite3:', error.message);
      useBetterSqlite = false;
    }
  }

  if (!useBetterSqlite) {
    db = new JsonDatabase();
  }

  return db;
}

function getDb() {
  if (!db) {
    db = initializeDb();
  }
  return db;
}

function initializeSchema() {
  const database = getDb();

  database.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS customers (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      code TEXT UNIQUE,
      email TEXT,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS material_categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      code TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      quotation_type_compat TEXT,
      active INTEGER DEFAULT 1,
      effective_from TEXT,
      effective_to TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS formulas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category_id INTEGER,
      quotation_type TEXT,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS formula_versions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      formula_id INTEGER NOT NULL,
      version INTEGER NOT NULL,
      expression_json TEXT NOT NULL,
      input_variables TEXT,
      output_unit TEXT DEFAULT 'USD',
      rounding_rule TEXT DEFAULT 'round2',
      tax_rule TEXT,
      deduction_rules TEXT,
      effective_from TEXT,
      effective_to TEXT,
      created_by INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS benchmarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      metal_code TEXT NOT NULL,
      unit TEXT DEFAULT 'USD/tonne',
      source TEXT,
      spot_applicable INTEGER DEFAULT 1,
      forward_applicable INTEGER DEFAULT 1,
      fallback_manual INTEGER DEFAULT 1,
      active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS benchmark_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quotation_request_id INTEGER,
      benchmark_id INTEGER,
      metal_code TEXT,
      value REAL,
      currency TEXT DEFAULT 'USD',
      source_name TEXT,
      fetched_at TEXT,
      target_month TEXT,
      basis_type TEXT DEFAULT 'spot'
    );

    CREATE TABLE IF NOT EXISTS quotation_requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference_no TEXT UNIQUE NOT NULL,
      customer_id INTEGER,
      customer_name TEXT,
      quotation_type TEXT NOT NULL,
      quote_date TEXT,
      validity_period INTEGER DEFAULT 30,
      shipment_month TEXT,
      pricing_mode TEXT DEFAULT 'Spot',
      status TEXT DEFAULT 'Draft',
      category_id INTEGER,
      category_confirmed INTEGER DEFAULT 0,
      formula_version_id INTEGER,
      pricing_result_json TEXT,
      notes TEXT,
      created_by INTEGER,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS supporting_documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quotation_request_id INTEGER NOT NULL,
      filename TEXT NOT NULL,
      original_name TEXT,
      file_path TEXT,
      file_type TEXT,
      file_size INTEGER,
      status TEXT DEFAULT 'uploaded',
      is_primary INTEGER DEFAULT 0,
      upload_timestamp TEXT DEFAULT (datetime('now')),
      extraction_result TEXT
    );

    CREATE TABLE IF NOT EXISTS extracted_fields (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL,
      quotation_request_id INTEGER,
      field_name TEXT NOT NULL,
      field_value TEXT,
      confidence_score REAL DEFAULT 1.0,
      is_edited INTEGER DEFAULT 0,
      edited_value TEXT,
      edited_by INTEGER,
      edited_at TEXT
    );

    CREATE TABLE IF NOT EXISTS extracted_metal_results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      document_id INTEGER NOT NULL,
      quotation_request_id INTEGER,
      metal_code TEXT NOT NULL,
      value REAL,
      unit TEXT,
      confidence_score REAL DEFAULT 1.0
    );

    CREATE TABLE IF NOT EXISTS override_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quotation_request_id INTEGER,
      field_name TEXT,
      original_value TEXT,
      override_value TEXT,
      note TEXT NOT NULL,
      overridden_by INTEGER,
      overridden_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS approval_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quotation_request_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      status TEXT NOT NULL,
      comment TEXT,
      actioned_by INTEGER,
      actioned_by_name TEXT,
      actioned_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS generated_outputs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      quotation_request_id INTEGER NOT NULL,
      output_type TEXT,
      filename TEXT,
      file_path TEXT,
      version INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      entity_type TEXT,
      entity_id INTEGER,
      action TEXT,
      description TEXT,
      old_value TEXT,
      new_value TEXT,
      user_id INTEGER,
      user_name TEXT,
      timestamp TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS market_data (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      metal_code TEXT NOT NULL,
      price REAL NOT NULL,
      currency TEXT DEFAULT 'USD',
      unit TEXT DEFAULT 'tonne',
      source TEXT,
      is_manual INTEGER DEFAULT 0,
      manual_note TEXT,
      target_month TEXT,
      fetched_at TEXT DEFAULT (datetime('now'))
    );
  `);
}

function logAudit(entityType, entityId, action, description, oldValue, newValue, userId, userName) {
  try {
    const database = getDb();
    const stmt = database.prepare(`
      INSERT INTO audit_logs (entity_type, entity_id, action, description, old_value, new_value, user_id, user_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    stmt.run(entityType, entityId, action, description, oldValue || null, newValue || null, userId, userName);
  } catch (error) {
    console.error('Audit log error:', error);
  }
}

module.exports = {
  get db() {
    return getDb();
  },
  getDb,
  initializeSchema,
  logAudit
};
