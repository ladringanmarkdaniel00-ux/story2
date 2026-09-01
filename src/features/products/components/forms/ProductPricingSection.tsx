import React, { ChangeEvent } from 'react';
import { Loader2, Globe2 } from 'lucide-react';
import type { DynamicGeoPricePayload } from '../../../../lib/pricing/geoPricingEngine';

interface ProductPricingSectionProps {
  price: string;
  stock: string;
  isGeoLoading: boolean;
  geoPreview: DynamicGeoPricePayload | null;
  onChange: (e: ChangeEvent<HTMLInputElement>) => void;
}

export function ProductPricingSection({
  price,
  stock,
  isGeoLoading,
  geoPreview,
  onChange,
}: ProductPricingSectionProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
      <div className="flex flex-col">
        <label htmlFor="prod-price" className="block text-sm font-medium text-neutral-700 mb-1">
          Base Price (PHP) <span className="text-red-500">*</span>
        </label>
        <div className="relative">
          <span className="absolute left-4 top-2.5 text-neutral-500">₱</span>
          <input
            id="prod-price"
            name="price"
            type="number"
            min="0"
            step="0.01"
            required
            value={price}
            onChange={onChange}
            placeholder="0.00"
            className="w-full pl-8 pr-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10"
          />
        </div>

        {isGeoLoading ? (
          <div className="mt-3 flex items-center gap-2 text-xs text-neutral-400">
            <Loader2 className="w-3 h-3 animate-spin" />
            Calculating regional pricing...
          </div>
        ) : geoPreview ? (
          <div className="mt-3 p-3 bg-neutral-50 border border-neutral-100 rounded-lg flex flex-col gap-1.5">
            <div className="flex items-center gap-1.5 text-xs font-medium text-neutral-600 mb-1">
              <Globe2 className="w-3.5 h-3.5 text-blue-500" />
              Geo-Pricing Preview ({geoPreview.detectedCountry})
            </div>
            <div className="flex justify-between items-center text-sm">
              <span className="text-neutral-500">Local Price:</span>
              <span className="font-semibold text-neutral-900">{geoPreview.formattedDisplayPrice}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-neutral-400">Tax Mode:</span>
              <span className="text-neutral-500">{geoPreview.taxMode}</span>
            </div>
            {geoPreview.aiSentimentAnalysis && (
              <p className="text-[10px] text-neutral-400 mt-1 italic border-t border-neutral-200/50 pt-1.5">
                "{geoPreview.aiSentimentAnalysis}"
              </p>
            )}
          </div>
        ) : (
          <p className="mt-1.5 text-[11px] text-neutral-500 flex items-center gap-1">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500"></span>
            Multi-Currency Geo-Pricing Engine enabled
          </p>
        )}
      </div>

      <div>
        <label htmlFor="prod-stock" className="block text-sm font-medium text-neutral-700 mb-1">
          Initial Stock
        </label>
        <input
          id="prod-stock"
          name="stock"
          type="number"
          min="0"
          step="1"
          value={stock}
          onChange={onChange}
          className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10"
        />
      </div>
    </div>
  );
}
