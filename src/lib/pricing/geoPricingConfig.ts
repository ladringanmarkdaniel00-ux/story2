// geoPricingConfig.ts

import type { TaxMode, RoundingRule } from './pricingEngine';

export interface RegionalPricingConfig {
  readonly countryCode: string;
  readonly currency: string;
  readonly taxMode: TaxMode;
  readonly fxRate: number;              // 1 PHP (Base) = X Target Currency
  readonly pppIndex: number;            // Purchasing Power Parity Multiplier (0.10 - 2.00)
  readonly statutoryTaxRate: number;    // Statutory Tax (VAT / GST / Sales Tax: 0.00 - 0.50)
  readonly fxRiskBuffer: number;        // Hedging & Payment Interchange Buffer (0.00 - 0.15)
  readonly competitiveIndex: number;    // Regional Elasticity Multiplier (0.50 - 1.50)
  readonly unitCostFactor: number;      // Regional Delivery / Hosting Overhead (0.00 - 0.30)
  readonly roundingRule: RoundingRule;  // Regional Charm Pricing Standard
  readonly arbitrageFloorPct: number;   // Minimum allowable baseline ratio (0.20 - 1.00)
}

/**
 * ISO 4217 Zero-Decimal Currencies
 * Prevents fractional cents from displaying on integer-only denominations.
 */
export const ZERO_DECIMAL_CURRENCIES: ReadonlySet<string> = new Set([
  'JPY', 'KRW', 'VND', 'CLP', 'IDR', 'PYG', 'UGX', 'RWF', 'BIF', 'DJF', 'GNF', 'KMF'
]);

/**
 * Global Domestic Anchor & Safe Fallback Configuration
 */
export const GLOBAL_FALLBACK_CONFIG: Readonly<RegionalPricingConfig> = Object.freeze({
  countryCode: 'PH',
  currency: 'PHP',
  taxMode: 'INCLUSIVE',
  fxRate: 1.0,
  pppIndex: 1.0,
  statutoryTaxRate: 0.12,
  fxRiskBuffer: 0.0,
  competitiveIndex: 1.0,
  unitCostFactor: 0.0,
  roundingRule: 'INTEGER_00',
  arbitrageFloorPct: 1.0,
});

/**
 * Regional Macroeconomic & Tax Registry
 */
export const GLOBAL_GEO_REGISTRY: Readonly<Record<string, RegionalPricingConfig>> = Object.freeze({
  // --- DOMESTIC STORE BASE (PHILIPPINES) ---
  PH: {
    countryCode: 'PH',
    currency: 'PHP',
    taxMode: 'INCLUSIVE',
    fxRate: 1.00,             // 1 PHP = 1 PHP
    pppIndex: 1.00,           // Standard domestic base (no discount)
    statutoryTaxRate: 0.12,   // 12% BIR VAT
    fxRiskBuffer: 0.00,       // No domestic FX risk
    competitiveIndex: 1.00,
    unitCostFactor: 0.00,
    roundingRule: 'INTEGER_00',
    arbitrageFloorPct: 1.00,  // Full price floor retention
  },

  // --- NORTH AMERICA ---
  US: {
    countryCode: 'US',
    currency: 'USD',
    taxMode: 'EXCLUSIVE',     // US State sales tax added at checkout
    fxRate: 0.0172,           // 1 PHP ≈ 0.0172 USD
    pppIndex: 1.00,
    statutoryTaxRate: 0.00,
    fxRiskBuffer: 0.02,
    competitiveIndex: 1.00,
    unitCostFactor: 0.02,
    roundingRule: 'CENTS_99',
    arbitrageFloorPct: 1.00,
  },

  // --- UNITED KINGDOM ---
  GB: {
    countryCode: 'GB',
    currency: 'GBP',
    taxMode: 'INCLUSIVE',     // 20% Standard UK VAT
    fxRate: 0.0134,           // 1 PHP ≈ 0.0134 GBP
    pppIndex: 1.00,
    statutoryTaxRate: 0.20,
    fxRiskBuffer: 0.02,
    competitiveIndex: 1.00,
    unitCostFactor: 0.02,
    roundingRule: 'CENTS_99',
    arbitrageFloorPct: 0.85,
  },

  // --- EUROPEAN UNION (GERMANY BENCHMARK) ---
  DE: {
    countryCode: 'DE',
    currency: 'EUR',
    taxMode: 'INCLUSIVE',     // 19% German MwSt
    fxRate: 0.0159,           // 1 PHP ≈ 0.0159 EUR
    pppIndex: 1.00,
    statutoryTaxRate: 0.19,
    fxRiskBuffer: 0.02,
    competitiveIndex: 1.00,
    unitCostFactor: 0.02,
    roundingRule: 'CENTS_99',
    arbitrageFloorPct: 0.85,
  },

  // --- ASIA-PACIFIC (JAPAN) ---
  JP: {
    countryCode: 'JP',
    currency: 'JPY',
    taxMode: 'INCLUSIVE',     // 10% JCT
    fxRate: 2.67,             // 1 PHP ≈ 2.67 JPY
    pppIndex: 0.85,
    statutoryTaxRate: 0.10,
    fxRiskBuffer: 0.02,
    competitiveIndex: 0.95,
    unitCostFactor: 0.01,
    roundingRule: 'INTEGER_00',
    arbitrageFloorPct: 0.50,
  },

  // --- ASIA-PACIFIC (INDIA) ---
  IN: {
    countryCode: 'IN',
    currency: 'INR',
    taxMode: 'INCLUSIVE',     // 18% GST
    fxRate: 1.44,             // 1 PHP ≈ 1.44 INR
    pppIndex: 0.85,
    statutoryTaxRate: 0.18,
    fxRiskBuffer: 0.04,
    competitiveIndex: 0.85,
    unitCostFactor: 0.02,
    roundingRule: 'INTEGER_00',
    arbitrageFloorPct: 0.50,
  },

  // --- LATIN AMERICA (BRAZIL) ---
  BR: {
    countryCode: 'BR',
    currency: 'BRL',
    taxMode: 'INCLUSIVE',     // 17% ICMS Standard
    fxRate: 0.095,            // 1 PHP ≈ 0.095 BRL
    pppIndex: 0.90,
    statutoryTaxRate: 0.17,
    fxRiskBuffer: 0.035,
    competitiveIndex: 0.90,
    unitCostFactor: 0.02,
    roundingRule: 'INTEGER_00',
    arbitrageFloorPct: 0.50,
  },
});

/**
 * Safe, case-insensitive configuration resolver with automatic fallback
 */
export function getRegionalPricingConfig(countryCode?: string | null): RegionalPricingConfig {
  if (!countryCode || typeof countryCode !== 'string') {
    return GLOBAL_FALLBACK_CONFIG;
  }
  const cleanCode = countryCode.trim().toUpperCase();
  return GLOBAL_GEO_REGISTRY[cleanCode] || GLOBAL_FALLBACK_CONFIG;
}
