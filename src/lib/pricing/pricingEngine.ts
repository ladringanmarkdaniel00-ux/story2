// pricingEngine.ts

export type TaxMode = 'INCLUSIVE' | 'EXCLUSIVE';
export type RoundingRule = 'CENTS_99' | 'CENTS_90' | 'INTEGER_00' | 'INTEGER_50' | 'RAW';
export type ValidationStatus = 'VALIDATED' | 'REJECTED_OUT_OF_BOUNDS';

export interface PricingTargetContext {
  readonly country_code: string;
  readonly currency_code: string;
  readonly tax_mode: TaxMode;
}

export interface PricingEvaluatedParameters {
  readonly fx_rate: number;
  readonly ppp_index: number;
  readonly statutory_tax_rate: number;
  readonly fx_risk_buffer: number;
  readonly competitive_index: number;
  readonly unit_cost_factor: number;
  readonly rounding_rule: RoundingRule;
  readonly arbitrage_floor_pct: number;
}

export interface PricingEngineInput {
  readonly sku: string;
  readonly base_price: number;
  readonly base_currency: string;
  readonly target_context: PricingTargetContext;
  readonly evaluated_parameters: PricingEvaluatedParameters;
}

export interface AuditLedger {
  readonly nominal_amount: number;
  readonly market_adjusted_amount: number;
  readonly cost_loaded_amount: number;
  readonly arbitrage_floor_limit: number;
  readonly arbitrage_floor_enforced: boolean;
  readonly rounding_delta: number;
}

export interface RuntimePricing {
  readonly pre_tax_amount: number;
  readonly tax_amount: number;
  readonly final_unit_price: number;
  readonly effective_discount_pct: number;
  readonly formatted_string: string;
}

export interface SecurityMetadata {
  readonly timestamp_utc: string;
  readonly status: ValidationStatus;
  readonly validation_errors: readonly string[];
}

export interface PricingEngineOutput {
  readonly schema_version: '1.1.0';
  readonly config_id: string;
  readonly sku: string;
  readonly base_price: number;
  readonly base_currency: string;
  readonly target_context: PricingTargetContext;
  readonly evaluated_parameters: PricingEvaluatedParameters;
  readonly audit_ledger: AuditLedger;
  readonly runtime_pricing: RuntimePricing;
  readonly security_metadata: SecurityMetadata;
}

/**
 * ISO-4217 Zero-Decimal Currencies
 */
export const ZERO_DECIMAL_CURRENCIES: ReadonlySet<string> = new Set([
  'JPY', 'KRW', 'VND', 'CLP', 'IDR', 'PYG', 'UGX', 'RWF', 'BIF', 'DJF', 'GNF', 'KMF'
]);

// Memoization Cache for Intl Formatters (Prevents Garbage Collector thrashing)
const formatterCache = new Map<string, Intl.NumberFormat>();

function getCachedFormatter(currencyCode: string): Intl.NumberFormat {
  const normalized = currencyCode.toUpperCase();
  let formatter = formatterCache.get(normalized);
  if (!formatter) {
    const isZeroDec = ZERO_DECIMAL_CURRENCIES.has(normalized);
    formatter = new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: normalized,
      minimumFractionDigits: isZeroDec ? 0 : 2,
      maximumFractionDigits: isZeroDec ? 0 : 2,
    });
    formatterCache.set(normalized, formatter);
  }
  return formatter;
}

/**
 * Precision Math Helper: Multiplies using micro-units (1e6) to prevent IEEE 754 floating-point drift.
 */
function safeMultiply(a: number, b: number): number {
  return Math.round((a * 1e6) * (b * 1e6) / 1e12) / 1e6;
}

/**
 * Validates inputs against strict predevelopment and structural constraints.
 */
function validatePricingInput(input: PricingEngineInput): string[] {
  const errors: string[] = [];

  // 1. Structural String & Price Validation
  if (!input.sku || typeof input.sku !== 'string' || input.sku.trim().length === 0) {
    errors.push('sku must be a non-empty string');
  }
  if (typeof input.base_price !== 'number' || !Number.isFinite(input.base_price) || input.base_price <= 0) {
    errors.push('base_price must be a positive finite number');
  }
  if (input.base_price > 1_000_000_000) {
    errors.push('base_price exceeds maximum allowable limit (1,000,000,000)');
  }
  if (!input.base_currency || typeof input.base_currency !== 'string' || input.base_currency.length < 3) {
    errors.push('base_currency must be a valid 3-letter currency code');
  }

  // 2. Target Context Validation
  if (!input.target_context || typeof input.target_context !== 'object') {
    errors.push('target_context object is required');
  } else {
    if (!input.target_context.currency_code || input.target_context.currency_code.length < 3) {
      errors.push('target_context.currency_code must be a valid 3-letter code');
    }
    if (!input.target_context.country_code || input.target_context.country_code.length < 2) {
      errors.push('target_context.country_code must be a valid 2-letter ISO code');
    }
  }

  // 3. Evaluated Macroeconomic Parameter Bounds
  const params = input.evaluated_parameters;
  if (!params || typeof params !== 'object') {
    errors.push('evaluated_parameters object is required');
  } else {
    if (typeof params.fx_rate !== 'number' || params.fx_rate <= 0.000001) errors.push('fx_rate must be > 0.000001');
    if (typeof params.ppp_index !== 'number' || params.ppp_index < 0.10 || params.ppp_index > 2.00) errors.push('ppp_index must be between 0.10 and 2.00');
    if (typeof params.statutory_tax_rate !== 'number' || params.statutory_tax_rate < 0.00 || params.statutory_tax_rate > 0.50) errors.push('statutory_tax_rate must be between 0.00 and 0.50');
    if (typeof params.fx_risk_buffer !== 'number' || params.fx_risk_buffer < 0.00 || params.fx_risk_buffer > 0.15) errors.push('fx_risk_buffer must be between 0.00 and 0.15');
    if (typeof params.competitive_index !== 'number' || params.competitive_index < 0.50 || params.competitive_index > 1.50) errors.push('competitive_index must be between 0.50 and 1.50');
    if (typeof params.unit_cost_factor !== 'number' || params.unit_cost_factor < 0.00 || params.unit_cost_factor > 0.30) errors.push('unit_cost_factor must be between 0.00 and 0.30');
    if (typeof params.arbitrage_floor_pct !== 'number' || params.arbitrage_floor_pct < 0.20 || params.arbitrage_floor_pct > 1.00) errors.push('arbitrage_floor_pct must be between 0.20 and 1.00');
  }

  return errors;
}

/**
 * Applies regional charm rounding rules with strict zero-decimal and arbitrage floor enforcement.
 */
function applyRoundingRule(
  amount: number,
  rule: RoundingRule,
  currencyCode: string,
  minFloor: number
): number {
  const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.has(currencyCode.toUpperCase());
  let rounded = amount;

  if (isZeroDecimal) {
    rounded = Math.round(amount);
  } else {
    const baseInteger = Math.floor(amount);
    const decimal = Number((amount - baseInteger).toFixed(4));

    switch (rule) {
      case 'CENTS_99':
        rounded = baseInteger + 0.99;
        break;
      case 'CENTS_90':
        rounded = baseInteger + 0.90;
        break;
      case 'INTEGER_00':
        rounded = Math.round(amount);
        break;
      case 'INTEGER_50':
        rounded = decimal < 0.5 ? baseInteger + 0.50 : baseInteger + 1.50;
        break;
      case 'RAW':
      default:
        rounded = Number(amount.toFixed(2));
        break;
    }
  }

  // Enforce arbitrage floor protection after charm rounding
  const floorProtected = Math.max(
    rounded,
    isZeroDecimal ? Math.ceil(minFloor) : Number(minFloor.toFixed(2))
  );

  return isZeroDecimal ? Math.round(floorProtected) : Number(floorProtected.toFixed(2));
}

/**
 * Generates a standard UUID string
 */
function generateConfigId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === 'x' ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Core Pricing Engine Execution pipeline.
 * Calculates multi-currency geo-pricing with arbitrage defense, tax modeling, and charm rounding.
 */
export function executePricingPipeline(input: PricingEngineInput): PricingEngineOutput {
  const errors = validatePricingInput(input);
  const isRejected = errors.length > 0;
  const configId = generateConfigId();
  const timestampUtc = new Date().toISOString();

  // Fail-Safe Fallback State
  if (isRejected) {
    return {
      schema_version: '1.1.0',
      config_id: configId,
      sku: input?.sku || 'UNKNOWN_SKU',
      base_price: typeof input?.base_price === 'number' && Number.isFinite(input.base_price) ? input.base_price : 0,
      base_currency: input?.base_currency || 'PHP',
      target_context: input?.target_context || {
        country_code: 'PH',
        currency_code: 'PHP',
        tax_mode: 'INCLUSIVE',
      },
      evaluated_parameters: input?.evaluated_parameters || {
        fx_rate: 1.0,
        ppp_index: 1.0,
        statutory_tax_rate: 0.12,
        fx_risk_buffer: 0.0,
        competitive_index: 1.0,
        unit_cost_factor: 0.0,
        rounding_rule: 'INTEGER_00',
        arbitrage_floor_pct: 1.0,
      },
      audit_ledger: {
        nominal_amount: 0,
        market_adjusted_amount: 0,
        cost_loaded_amount: 0,
        arbitrage_floor_limit: 0,
        arbitrage_floor_enforced: false,
        rounding_delta: 0,
      },
      runtime_pricing: {
        pre_tax_amount: 0,
        tax_amount: 0,
        final_unit_price: 0,
        effective_discount_pct: 0,
        formatted_string: '₱0.00',
      },
      security_metadata: {
        timestamp_utc: timestampUtc,
        status: 'REJECTED_OUT_OF_BOUNDS',
        validation_errors: errors,
      },
    };
  }

  const {
    fx_rate,
    ppp_index,
    competitive_index,
    fx_risk_buffer,
    unit_cost_factor,
    arbitrage_floor_pct,
    statutory_tax_rate,
    rounding_rule,
  } = input.evaluated_parameters;

  const targetCurrency = input.target_context.currency_code.toUpperCase();
  const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.has(targetCurrency);

  // 1. Nominal FX Conversion (Micro-unit precision)
  const pNominal = safeMultiply(input.base_price, fx_rate);

  // 2. Regional Market Adjustment
  const pMarket = safeMultiply(pNominal, safeMultiply(ppp_index, competitive_index));

  // 3. Operational Risk & Infrastructure Overhead
  const operationalOverhead = 1.0 + fx_risk_buffer + unit_cost_factor;
  const pLoaded = safeMultiply(pMarket, operationalOverhead);

  // 4. Hard Arbitrage Floor Evaluation
  const pFloor = safeMultiply(pNominal, arbitrage_floor_pct);
  const isFloorTriggered = pLoaded < pFloor;
  const pGuarded = Math.max(pLoaded, pFloor);

  // 5. Statutory Tax Execution
  let preTaxAmount = 0;
  let taxAmount = 0;
  let grossAmount = 0;

  if (input.target_context.tax_mode === 'INCLUSIVE') {
    taxAmount = pGuarded - (pGuarded / (1.0 + statutory_tax_rate));
    preTaxAmount = pGuarded - taxAmount;
    grossAmount = pGuarded;
  } else {
    taxAmount = pGuarded * statutory_tax_rate;
    preTaxAmount = pGuarded;
    grossAmount = pGuarded + taxAmount;
  }

  // 6. Charm Denomination & Floor-Guarded Rounding
  const finalUnitPrice = applyRoundingRule(grossAmount, rounding_rule, targetCurrency, pFloor);
  const roundingDelta = Number((finalUnitPrice - grossAmount).toFixed(4));

  // 7. Effective Discount Calculation (Zero-division safe)
  const effectiveDiscountPct = pNominal > 0 ? (1.0 - (finalUnitPrice / pNominal)) * 100 : 0;

  // 8. Memoized Localized Display String Formatting
  const formatter = getCachedFormatter(targetCurrency);
  const formattedString = formatter.format(finalUnitPrice);

  return {
    schema_version: '1.1.0',
    config_id: configId,
    sku: input.sku.trim(),
    base_price: input.base_price,
    base_currency: input.base_currency.toUpperCase(),
    target_context: {
      country_code: input.target_context.country_code.toUpperCase(),
      currency_code: targetCurrency,
      tax_mode: input.target_context.tax_mode,
    },
    evaluated_parameters: input.evaluated_parameters,
    audit_ledger: {
      nominal_amount: Number(pNominal.toFixed(4)),
      market_adjusted_amount: Number(pMarket.toFixed(4)),
      cost_loaded_amount: Number(pLoaded.toFixed(4)),
      arbitrage_floor_limit: Number(pFloor.toFixed(4)),
      arbitrage_floor_enforced: isFloorTriggered,
      rounding_delta: roundingDelta,
    },
    runtime_pricing: {
      pre_tax_amount: isZeroDecimal ? Math.round(preTaxAmount) : Number(preTaxAmount.toFixed(2)),
      tax_amount: isZeroDecimal ? Math.round(taxAmount) : Number(taxAmount.toFixed(2)),
      final_unit_price: finalUnitPrice,
      effective_discount_pct: Math.max(0, Number(effectiveDiscountPct.toFixed(2))),
      formatted_string: formattedString,
    },
    security_metadata: {
      timestamp_utc: timestampUtc,
      status: 'VALIDATED',
      validation_errors: [],
    },
  };
}
