const fs = require('fs');
const path = require('path');

class MockDatabase {
  constructor() {
    this.dbPath = path.join(__dirname, 'jaringmetal.json');
    this.data = this.loadData();
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
      market_data: [],
      _counters: {
        users: 0,
        customers: 0,
        material_categories: 0,
        formulas: 0,
        formula_versions: 0,
        benchmarks: 0,
        benchmark_snapshots: 0,
        quotation_requests: 0,
        supporting_documents: 0,
        extracted_fields: 0,
        extracted_metal_results: 0,
        override_logs: 0,
        approval_records: 0,
        generated_outputs: 0,
        audit_logs: 0,
        market_data: 0
      }
    };
  }

  saveData() {
    fs.writeFileSync(this.dbPath, JSON.stringify(this.data, null, 2), 'utf-8');
  }

  pragma() {
    return this;
  }

  exec() {
    return this;
  }

  prepare(sql) {
    const self = this;
    return {
      run(...params) {
        const lastId = Object.values(self.data._counters).reduce((a, b) => Math.max(a, b), 0) + 1;
        self.saveData();
        return { lastID: lastId, changes: 1 };
      },
      get(...params) {
        for (const table of Object.keys(self.data)) {
          if (table.startsWith('_')) continue;
          const rows = self.data[table];
          if (Array.isArray(rows) && rows.length > 0) {
            return rows[0];
          }
        }
        return null;
      },
      all(...params) {
        for (const table of Object.keys(self.data)) {
          if (table.startsWith('_')) continue;
          const rows = self.data[table];
          if (Array.isArray(rows)) {
            return rows;
          }
        }
        return [];
      }
    };
  }
}

let db = null;

function getDb() {
  if (!db) {
    db = new MockDatabase();
  }
  return db;
}

function initializeSchema() {
  const database = getDb();
  database.saveData();
}

function logAudit(entityType, entityId, action, description, oldValue, newValue, userId, userName) {
  try {
    const database = getDb();
    const audit = {
      id: (database.data.audit_logs.length || 0) + 1,
      entity_type: entityType,
      entity_id: entityId,
      action,
      description,
      old_value: oldValue || null,
      new_value: newValue || null,
      user_id: userId,
      user_name: userName,
      timestamp: new Date().toISOString()
    };
    database.data.audit_logs.push(audit);
    database.saveData();
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
  logAudit,
  MockDatabase
};
