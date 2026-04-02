const { db, initializeSchema } = require('./db');
const bcrypt = require('bcryptjs');

function seedDatabase() {
  try {
    initializeSchema();

    // Helper function to insert into any table
    function insertInto(table, columns, ...values) {
      const columnsStr = columns.join(', ');
      const placeholders = columns.map(() => '?').join(', ');
      const sql = `INSERT INTO ${table} (${columnsStr}) VALUES (${placeholders})`;
      const stmt = db.prepare(sql);
      const result = stmt.run(...values);
      return result.lastID;
    }

    // Seed users
    const users = [
      { name: 'Admin User', email: 'admin@jaringmetal.com', password: 'admin123', role: 'admin' },
      { name: 'Commercial Team', email: 'commercial@jaringmetal.com', password: 'pass123', role: 'commercial' },
      { name: 'Pricing Team', email: 'pricing@jaringmetal.com', password: 'pass123', role: 'pricing' },
      { name: 'Approver', email: 'approver@jaringmetal.com', password: 'pass123', role: 'approver' },
      { name: 'Finance', email: 'finance@jaringmetal.com', password: 'pass123', role: 'finance' }
    ];

    const userIds = {};
    users.forEach(user => {
      const hash = bcrypt.hashSync(user.password, 10);
      const id = insertInto('users', ['name', 'email', 'password_hash', 'role'], user.name, user.email, hash, user.role);
      userIds[user.email] = id;
    });

    // Seed customers
    const customers = [
      { name: 'Acme Electronics Sdn Bhd', code: 'ACC001', email: 'contact@acmeelec.my' },
      { name: 'TechVision Components', code: 'TVC002', email: 'sales@techvision.com' },
      { name: 'GlobalCircuit Industries', code: 'GCI003', email: 'info@globalcircuit.com' }
    ];

    const customerIds = {};
    customers.forEach(cust => {
      const id = insertInto('customers', ['name', 'code', 'email'], cust.name, cust.code, cust.email);
      customerIds[cust.code] = id;
    });

    // Seed material categories
    const categories = [
      { code: 'CU_AG', name: 'Cu/Ag Mixed Scrap', description: 'Copper and Silver mixed scrap materials' },
      { code: 'NI_PD_AU', name: 'Ni/Pd/Au/A194 Catalyst', description: 'Nickel, Palladium, Gold and A194 Catalyst' },
      { code: 'NI_PD_AG_AU', name: 'Ni/Pd/Ag/Au/A194 Mixed', description: 'Mixed precious metals catalyst' },
      { code: 'AU_SOL', name: 'Au Solution', description: 'Gold in solution form' },
      { code: 'PD_SOL', name: 'Pd Solution', description: 'Palladium in solution form' },
      { code: 'AG_PASTE', name: 'Silver Paste Remain on Syringe', description: 'Silver paste residue on syringe' }
    ];

    const categoryIds = {};
    categories.forEach(cat => {
      const id = insertInto('material_categories', ['code', 'name', 'description'], cat.code, cat.name, cat.description);
      categoryIds[cat.code] = id;
    });

    // Seed formulas and versions
    const formulas = [
      {
        name: 'Cu Base Formula',
        categoryCode: 'CU_AG',
        quotationType: 'Spot',
        expressionJson: {
          type: 'formula',
          steps: [
            { name: 'Cu_Value', expr: 'Cu * recovery_pct / 100 / 1000 * weight' },
            { name: 'Ag_Value', expr: 'Ag * ag_recovery / 100 / 32.15 * weight * ag_content / 100' },
            { name: 'Deductions', expr: 'charges' },
            { name: 'Total', expr: 'Cu_Value + Ag_Value - Deductions' }
          ]
        },
        inputVariables: 'Cu,Ag,weight,recovery_pct,ag_recovery,ag_content,charges'
      },
      {
        name: 'Composite Pd/Au Formula',
        categoryCode: 'NI_PD_AU',
        quotationType: 'Spot',
        expressionJson: {
          type: 'formula',
          steps: [
            { name: 'Pd_Value', expr: 'Pd * pd_purity / 100 * weight / 31.1' },
            { name: 'Au_Value', expr: 'Au * au_purity / 100 * weight / 31.1' },
            { name: 'Ni_Value', expr: 'Ni * ni_purity / 100 / 1000 * weight' },
            { name: 'Total', expr: 'Pd_Value + Au_Value + Ni_Value' }
          ]
        },
        inputVariables: 'Pd,Au,Ni,weight,pd_purity,au_purity,ni_purity'
      },
      {
        name: 'Au Solution Formula',
        categoryCode: 'AU_SOL',
        quotationType: 'Spot',
        expressionJson: {
          type: 'formula',
          steps: [
            { name: 'Au_Content', expr: 'Au * volume / 1000' },
            { name: 'Au_Value', expr: 'Au_Content / 31.1 * Au_Price' },
            { name: 'Processing_Fee', expr: 'Au_Content * 0.02' },
            { name: 'Total', expr: 'Au_Value - Processing_Fee' }
          ]
        },
        inputVariables: 'Au,volume,Au_Price'
      }
    ];

    formulas.forEach(formula => {
      const formulaId = insertInto('formulas', ['name', 'category_id', 'quotation_type'], formula.name, categoryIds[formula.categoryCode], formula.quotationType);
      insertInto('formula_versions', ['formula_id', 'version', 'expression_json', 'input_variables', 'output_unit', 'created_by'],
        formulaId, 1, JSON.stringify(formula.expressionJson), formula.inputVariables, 'USD', userIds['admin@jaringmetal.com']);
    });

    // Seed benchmarks
    const benchmarks = [
      { name: 'Copper (LME)', metalCode: 'Cu', unit: 'USD/tonne', source: 'LME' },
      { name: 'Silver (LBMA)', metalCode: 'Ag', unit: 'USD/troy oz', source: 'LBMA' },
      { name: 'Gold (LBMA)', metalCode: 'Au', unit: 'USD/troy oz', source: 'LBMA' },
      { name: 'Palladium (NYMEX)', metalCode: 'Pd', unit: 'USD/troy oz', source: 'NYMEX' },
      { name: 'Nickel (LME)', metalCode: 'Ni', unit: 'USD/tonne', source: 'LME' },
      { name: 'Tin (LME)', metalCode: 'Sn', unit: 'USD/tonne', source: 'LME' },
      { name: 'USD/MYR FX Rate', metalCode: 'FX_MYR', unit: 'MYR/USD', source: 'XE' }
    ];

    benchmarks.forEach(bench => {
      insertInto('benchmarks', ['name', 'metal_code', 'unit', 'source', 'spot_applicable', 'forward_applicable', 'active'],
        bench.name, bench.metalCode, bench.unit, bench.source, 1, 1, 1);
    });

    // Seed market data
    const marketData = [
      { metalCode: 'Cu', price: 9500, currency: 'USD', unit: 'tonne', source: 'LME' },
      { metalCode: 'Ag', price: 30.50, currency: 'USD', unit: 'troy oz', source: 'LBMA' },
      { metalCode: 'Au', price: 2280.00, currency: 'USD', unit: 'troy oz', source: 'LBMA' },
      { metalCode: 'Pd', price: 1060.00, currency: 'USD', unit: 'troy oz', source: 'NYMEX' },
      { metalCode: 'Ni', price: 17200, currency: 'USD', unit: 'tonne', source: 'LME' },
      { metalCode: 'Sn', price: 28500, currency: 'USD', unit: 'tonne', source: 'LME' },
      { metalCode: 'FX_MYR', price: 4.72, currency: 'MYR', unit: 'per USD', source: 'XE' }
    ];

    marketData.forEach(data => {
      insertInto('market_data', ['metal_code', 'price', 'currency', 'unit', 'source'],
        data.metalCode, data.price, data.currency, data.unit, data.source);
    });

    // Seed sample quotation requests
    const quotations = [
      {
        referenceNo: 'QT20260101001',
        customerId: customerIds['ACC001'],
        customerName: 'Acme Electronics Sdn Bhd',
        quotationType: 'Spot',
        status: 'Draft',
        categoryId: categoryIds['CU_AG']
      },
      {
        referenceNo: 'QT20260102002',
        customerId: customerIds['TVC002'],
        customerName: 'TechVision Components',
        quotationType: 'Spot',
        status: 'Extracted',
        categoryId: categoryIds['NI_PD_AU']
      },
      {
        referenceNo: 'QT20260103003',
        customerId: customerIds['GCI003'],
        customerName: 'GlobalCircuit Industries',
        quotationType: 'Spot',
        status: 'Pending Approval',
        categoryId: categoryIds['AU_SOL']
      },
      {
        referenceNo: 'QT20260104004',
        customerId: customerIds['ACC001'],
        customerName: 'Acme Electronics Sdn Bhd',
        quotationType: 'Spot',
        status: 'Approved',
        categoryId: categoryIds['NI_PD_AG_AU']
      }
    ];

    quotations.forEach(quot => {
      insertInto('quotation_requests', ['reference_no', 'customer_id', 'customer_name', 'quotation_type', 'status', 'category_id', 'category_confirmed', 'created_by'],
        quot.referenceNo, quot.customerId, quot.customerName, quot.quotationType, quot.status, quot.categoryId, 1, userIds['commercial@jaringmetal.com']);
    });

    console.log('Database seeding completed successfully!');
    console.log('\nDemo Users:');
    console.log('  admin@jaringmetal.com / admin123 (admin)');
    console.log('  commercial@jaringmetal.com / pass123 (commercial)');
    console.log('  pricing@jaringmetal.com / pass123 (pricing)');
    console.log('  approver@jaringmetal.com / pass123 (approver)');
    console.log('  finance@jaringmetal.com / pass123 (finance)');

  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
}

seedDatabase();
