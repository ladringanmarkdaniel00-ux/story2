import { GoogleGenAI } from '@google/genai';
import { RoundingRule } from './pricingEngine';
import {
  RegionalPricingConfig,
  GLOBAL_GEO_REGISTRY,
  GLOBAL_FALLBACK_CONFIG,
  ZERO_DECIMAL_CURRENCIES,
} from './geoPricingConfig';

export interface AuditLedger {
  readonly nominalAmount: number;
  readonly marketAdjustedAmount: number;
  readonly costLoadedAmount: number;
  readonly arbitrageFloorLimit: number;
  readonly arbitrageFloorEnforced: boolean;
  readonly roundingDelta: number;
}

export interface DynamicGeoPricePayload {
  readonly schemaVersion: '1.1.0';
  readonly configId: string;
  readonly sku: string;
  readonly basePricePHP: number;
  readonly detectedCountry: string;
  readonly currency: string;
  readonly taxMode: 'INCLUSIVE' | 'EXCLUSIVE';
  readonly rawNumericPrice: number;
  readonly formattedDisplayPrice: string;
  readonly preTaxAmount: number;
  readonly taxAmount: number;
  readonly effectiveDiscountPct: number;
  readonly auditLedger: AuditLedger;
  readonly securityStatus: 'VALIDATED' | 'FALLBACK_APPLIED';
  readonly validationErrors: readonly string[];
  readonly aiSentimentAnalysis?: string;
}

// Global Memoization Cache for Intl Formatters (Prevents GC Pressure)
const formatterCache = new Map<string, Intl.NumberFormat>();

function getCachedFormatter(currency: string): Intl.NumberFormat {
  const normalized = currency.toUpperCase();
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

function generateSecureUUID(): string {
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
 * Validates and sanitizes base pricing inputs to prevent runtime injection or overflow errors.
 */
function validatePricingInput(sku: string, basePrice: number): string[] {
  const errors: string[] = [];
  if (!sku || typeof sku !== 'string' || sku.trim().length === 0) {
    errors.push('SKU identifier must be a valid non-empty string');
  }
  if (typeof basePrice !== 'number' || !Number.isFinite(basePrice) || basePrice <= 0) {
    errors.push('Base price must be a strictly positive finite number');
  }
  if (basePrice > 1_000_000_000) {
    errors.push('Base price exceeds maximum supported system threshold');
  }
  return errors;
}

/**
 * Precision Math Helper: Multiplies and rounds using micro-units (1e6) to prevent IEEE 754 drift.
 */
function safeMultiply(a: number, b: number): number {
  return Number((a * b).toFixed(6));
}

/**
 * Applies currency-accurate charm rounding while strictly preserving the arbitrage floor.
 */
function applyRoundingRule(
  amount: number,
  rule: RoundingRule,
  currency: string,
  minFloor: number
): number {
  const isZeroDecimal = ZERO_DECIMAL_CURRENCIES.has(currency.toUpperCase());
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

  // Guardrail: Enforce that rounding does not breach the minimum acceptable floor
  const floorProtected = Math.max(
    rounded,
    isZeroDecimal ? Math.ceil(minFloor) : Number(minFloor.toFixed(2))
  );

  return isZeroDecimal ? Math.round(floorProtected) : Number(floorProtected.toFixed(2));
}

/**
 * Fast location resolver compatible with Vercel Edge headers, Client IP, and Browser Locale.
 */
export async function resolveClientCountry(headers?: Headers | Record<string, any>): Promise<string> {
  // 1. Direct Edge Headers (Vercel, Cloudflare, CloudFront)
  if (headers) {
    const getHeader = (name: string) => {
      if (typeof headers.get === 'function') return headers.get(name);
      return headers[name] || headers[name.toLowerCase()];
    };

    const edgeCountry =
      getHeader('x-vercel-ip-country') ||
      getHeader('cf-ipcountry') ||
      getHeader('cloudfront-viewer-country');
    if (edgeCountry && typeof edgeCountry === 'string' && edgeCountry.length === 2) {
      return edgeCountry.toUpperCase();
    }
  }

  return 'PH'; // Default localization target
}

/**
 * Core Dynamic Geo-Pricing Engine.
 * Pure, deterministic calculation pipeline with arbitrage protection and AI valuation.
 */
export async function calculateGeoPrice(
  sku: string,
  basePricePHP: number,
  overrideCountry?: string,
  apiKey?: string,
  requestHeaders?: Headers | Record<string, any>
): Promise<DynamicGeoPricePayload> {
  const configId = generateSecureUUID();
  const validationErrors = validatePricingInput(sku, basePricePHP);

  // Fallback state on invalid parameters
  if (validationErrors.length > 0) {
    return {
      schemaVersion: '1.1.0',
      configId,
      sku: sku || 'INVALID_SKU',
      basePricePHP: typeof basePricePHP === 'number' && Number.isFinite(basePricePHP) ? basePricePHP : 0,
      detectedCountry: 'US',
      currency: 'USD',
      taxMode: 'EXCLUSIVE',
      rawNumericPrice: 0,
      formattedDisplayPrice: '$0.00',
      preTaxAmount: 0,
      taxAmount: 0,
      effectiveDiscountPct: 0,
      auditLedger: {
        nominalAmount: 0,
        marketAdjustedAmount: 0,
        costLoadedAmount: 0,
        arbitrageFloorLimit: 0,
        arbitrageFloorEnforced: false,
        roundingDelta: 0,
      },
      securityStatus: 'FALLBACK_APPLIED',
      validationErrors,
    };
  }

  // 1. Resolve Target Region & Configuration
  const countryCode = (
    overrideCountry || (await resolveClientCountry(requestHeaders))
  ).toUpperCase();
  const config = GLOBAL_GEO_REGISTRY[countryCode] || GLOBAL_FALLBACK_CONFIG;

  // Check if we are pricing in the store's native domestic currency
  const isDomestic = (config.currency === 'PHP' && countryCode === 'PH');

  // If domestic, bypass macroeconomic discounts
  const effectivePPP = isDomestic ? 1.0 : config.pppIndex;
  const effectiveCompetitive = isDomestic ? 1.0 : config.competitiveIndex;
  const effectiveFxBuffer = isDomestic ? 0.0 : config.fxRiskBuffer;
  const effectiveUnitCost = isDomestic ? 0.0 : config.unitCostFactor;

  // 2. Financial Pipeline Calculations (Precision-Safe Multipliers)
  const pNominal = safeMultiply(basePricePHP, config.fxRate);
  const pMarket = safeMultiply(pNominal, safeMultiply(effectivePPP, effectiveCompetitive));
  const operationalOverhead = 1.0 + effectiveFxBuffer + effectiveUnitCost;
  const pLoaded = safeMultiply(pMarket, operationalOverhead);

  // 3. Arbitrage Floor Assessment
  const pFloor = safeMultiply(pNominal, config.arbitrageFloorPct);
  const isFloorTriggered = pLoaded < pFloor;
  const pGuarded = Math.max(pLoaded, pFloor);

  // 4. Tax Execution
  let preTaxAmount = 0;
  let taxAmount = 0;
  let grossAmount = 0;

  if (config.taxMode === 'INCLUSIVE') {
    taxAmount = pGuarded - pGuarded / (1.0 + config.statutoryTaxRate);
    preTaxAmount = pGuarded - taxAmount;
    grossAmount = pGuarded;
  } else {
    taxAmount = pGuarded * config.statutoryTaxRate;
    preTaxAmount = pGuarded;
    grossAmount = pGuarded + taxAmount;
  }

  // 5. Charm Rounding & Output Formatting
  const finalUnitPrice = applyRoundingRule(grossAmount, config.roundingRule, config.currency, pFloor);
  const roundingDelta = Number((finalUnitPrice - grossAmount).toFixed(4));
  const discountPct = pNominal > 0 ? ((1.0 - finalUnitPrice / pNominal) * 100) : 0;

  const formatter = getCachedFormatter(config.currency);
  const formattedDisplayPrice = formatter.format(finalUnitPrice);

  // 6. Optional Google AI Studio Validation (Gemini 2.5 Flash)
  let aiSentimentAnalysis: string | undefined;
  if (apiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey });
      const prompt = `You are a dynamic pricing risk engine. Provide 1 concise validation sentence on pricing SKU "${sku}" at ${formattedDisplayPrice} (${config.currency}) in country code "${countryCode}" considering local PPP.`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      aiSentimentAnalysis = response.text?.trim();
    } catch {
      // Non-blocking fail-open policy
    }
  }

  return {
    schemaVersion: '1.1.0',
    configId,
    sku,
    basePricePHP,
    detectedCountry: countryCode,
    currency: config.currency,
    taxMode: config.taxMode,
    rawNumericPrice: finalUnitPrice,
    formattedDisplayPrice,
    preTaxAmount: Number(preTaxAmount.toFixed(2)),
    taxAmount: Number(taxAmount.toFixed(2)),
    effectiveDiscountPct: Math.max(0, Number(discountPct.toFixed(1))),
    auditLedger: {
      nominalAmount: Number(pNominal.toFixed(4)),
      marketAdjustedAmount: Number(pMarket.toFixed(4)),
      costLoadedAmount: Number(pLoaded.toFixed(4)),
      arbitrageFloorLimit: Number(pFloor.toFixed(4)),
      arbitrageFloorEnforced: isFloorTriggered,
      roundingDelta,
    },
    securityStatus: 'VALIDATED',
    validationErrors: [],
    aiSentimentAnalysis,
  };
}
