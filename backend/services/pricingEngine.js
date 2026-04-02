function evaluateFormula(expressionJson, inputs) {
  try {
    const steps = expressionJson.steps || [];
    const results = {};
    const stepResults = [];

    for (const step of steps) {
      const allVariables = { ...inputs, ...results };
      const variableNames = Object.keys(allVariables);
      const variableValues = Object.values(allVariables);

      const fn = new Function(...variableNames, `return ${step.expr}`);
      const stepValue = fn(...variableValues);

      const key = step.name.replace(/\s+/g, '_');
      results[key] = stepValue;

      stepResults.push({
        name: step.name,
        expression: step.expr,
        value: stepValue,
        formatted: formatValue(stepValue)
      });
    }

    const finalValue = Object.values(results)[Object.keys(results).length - 1] || 0;

    return {
      success: true,
      steps: stepResults,
      finalValue: finalValue,
      finalFormatted: formatValue(finalValue),
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      steps: []
    };
  }
}

function formatValue(value) {
  if (typeof value !== 'number') return String(value);
  if (Number.isInteger(value)) return value.toString();
  return parseFloat(value.toFixed(2)).toString();
}

function roundToDecimals(value, decimals = 2) {
  return parseFloat((Math.round(value * Math.pow(10, decimals)) / Math.pow(10, decimals)).toFixed(decimals));
}

function applyRoundingRule(value, rule = 'round2') {
  if (rule === 'round2') return roundToDecimals(value, 2);
  if (rule === 'round0') return Math.round(value);
  if (rule === 'round4') return roundToDecimals(value, 4);
  if (rule === 'ceil') return Math.ceil(value);
  if (rule === 'floor') return Math.floor(value);
  return value;
}

function applyTaxRule(value, rule, taxRate = 0.06) {
  if (!rule) return value;
  if (rule === 'inclusive') return value / (1 + taxRate);
  if (rule === 'exclusive') return value * (1 + taxRate);
  return value;
}

function applyDeductions(value, deductionRules) {
  if (!deductionRules) return value;

  let remaining = value;
  const deductions = [];

  if (typeof deductionRules === 'string') {
    const rules = JSON.parse(deductionRules);
    for (const rule of rules) {
      let deductionAmount = 0;
      if (rule.type === 'percentage') {
        deductionAmount = remaining * (rule.value / 100);
      } else if (rule.type === 'fixed') {
        deductionAmount = rule.value;
      }
      deductions.push({
        name: rule.name,
        amount: deductionAmount,
        type: rule.type
      });
      remaining -= deductionAmount;
    }
  }

  return {
    original: value,
    deductions: deductions,
    final: remaining
  };
}

function calculateDetailedBreakdown(formulaVersion, metalPrices, extractedMetals) {
  try {
    const expressionJson = JSON.parse(formulaVersion.expression_json);
    const inputs = { ...metalPrices, ...extractedMetals };

    const formulaResult = evaluateFormula(expressionJson, inputs);

    if (!formulaResult.success) {
      return {
        success: false,
        error: formulaResult.error
      };
    }

    let finalValue = formulaResult.finalValue;

    const roundingRule = formulaVersion.rounding_rule || 'round2';
    finalValue = applyRoundingRule(finalValue, roundingRule);

    const taxRule = formulaVersion.tax_rule;
    if (taxRule) {
      finalValue = applyTaxRule(finalValue, taxRule);
    }

    const deductionResult = applyDeductions(finalValue, formulaVersion.deduction_rules);
    let displayValue = finalValue;
    let deductionDetails = [];

    if (typeof deductionResult === 'object' && deductionResult.deductions) {
      displayValue = deductionResult.final;
      deductionDetails = deductionResult.deductions;
    }

    return {
      success: true,
      breakdown: {
        formulaName: formulaVersion.formula ? formulaVersion.formula.name : 'Unknown',
        stepResults: formulaResult.steps,
        subtotal: formulaResult.finalValue,
        deductions: deductionDetails,
        finalValue: displayValue,
        outputUnit: formulaVersion.output_unit || 'USD',
        roundingRule: roundingRule,
        taxRule: taxRule || 'none'
      },
      inputVariables: inputs,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  evaluateFormula,
  formatValue,
  roundToDecimals,
  applyRoundingRule,
  applyTaxRule,
  applyDeductions,
  calculateDetailedBreakdown
};
