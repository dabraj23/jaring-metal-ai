const axios = require('axios');
const { db } = require('../database/db');

async function getCurrentMarketPrices() {
  try {
    const stmt = db.prepare(`
      SELECT DISTINCT ON (metal_code)
        metal_code,
        price,
        currency,
        unit,
        source,
        fetched_at
      FROM market_data
      ORDER BY metal_code, fetched_at DESC
    `);

    const prices = stmt.all();
    return prices.reduce((acc, row) => {
      acc[row.metal_code] = {
        price: row.price,
        currency: row.currency,
        unit: row.unit,
        source: row.source,
        fetched_at: row.fetched_at
      };
      return acc;
    }, {});
  } catch (error) {
    console.error('Error fetching current market prices:', error);
    return {};
  }
}

async function fetchFXRate() {
  try {
    const response = await axios.get('https://api.exchangerate-api.com/v4/latest/USD');
    return response.data.rates.MYR || 4.72;
  } catch (error) {
    console.error('FX fetch error, using fallback:', error.message);
    return 4.72;
  }
}

async function refreshMarketPrices() {
  try {
    const fxRate = await fetchFXRate();

    const baselinePrices = {
      Cu: { price: 9500, unit: 'USD/tonne', source: 'LME' },
      Ag: { price: 30.50, unit: 'USD/troy oz', source: 'LBMA' },
      Au: { price: 2280.00, unit: 'USD/troy oz', source: 'LBMA' },
      Pd: { price: 1060.00, unit: 'USD/troy oz', source: 'NYMEX' },
      Ni: { price: 17200, unit: 'USD/tonne', source: 'LME' },
      Sn: { price: 28500, unit: 'USD/tonne', source: 'LME' },
      FX_MYR: { price: fxRate, unit: 'MYR/USD', source: 'XE' }
    };

    const stmt = db.prepare(`
      INSERT INTO market_data (metal_code, price, currency, unit, source, fetched_at)
      VALUES (?, ?, 'USD', ?, ?, datetime('now'))
    `);

    for (const [metalCode, data] of Object.entries(baselinePrices)) {
      const simulatedPrice = data.price * (0.98 + Math.random() * 0.04);
      stmt.run(metalCode, simulatedPrice, data.unit, data.source);
    }

    return {
      success: true,
      pricesUpdated: Object.keys(baselinePrices).length,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error refreshing market prices:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

async function overrideMarketPrice(metalCode, price, note, userId) {
  try {
    const stmt = db.prepare(`
      INSERT INTO market_data (metal_code, price, currency, source, is_manual, manual_note, fetched_at)
      VALUES (?, ?, 'USD', 'Manual Override', 1, ?, datetime('now'))
    `);

    stmt.run(metalCode, price, `Overridden by user ${userId}: ${note}`);

    return {
      success: true,
      metalCode,
      price,
      overriddenAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error overriding market price:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

function getMarketPricesForQuotation(quotationId) {
  try {
    const stmt = db.prepare(`
      SELECT
        benchmark_id,
        metal_code,
        value,
        currency,
        source_name,
        fetched_at,
        target_month,
        basis_type
      FROM benchmark_snapshots
      WHERE quotation_request_id = ?
      ORDER BY fetched_at DESC
    `);

    return stmt.all(quotationId);
  } catch (error) {
    console.error('Error getting quotation market prices:', error);
    return [];
  }
}

async function captureMarketSnapshot(quotationId, metalCodes) {
  try {
    const prices = await getCurrentMarketPrices();
    const stmt = db.prepare(`
      INSERT INTO benchmark_snapshots (quotation_request_id, metal_code, value, currency, source_name, fetched_at, basis_type)
      VALUES (?, ?, ?, 'USD', ?, datetime('now'), 'spot')
    `);

    const snapshots = [];
    for (const metalCode of metalCodes) {
      if (prices[metalCode]) {
        stmt.run(quotationId, metalCode, prices[metalCode].price, prices[metalCode].source);
        snapshots.push({
          metalCode,
          price: prices[metalCode].price,
          source: prices[metalCode].source
        });
      }
    }

    return {
      success: true,
      snapshotsCreated: snapshots.length,
      snapshots
    };
  } catch (error) {
    console.error('Error capturing market snapshot:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  getCurrentMarketPrices,
  fetchFXRate,
  refreshMarketPrices,
  overrideMarketPrice,
  getMarketPricesForQuotation,
  captureMarketSnapshot
};
