import React, { ChangeEvent, FormEvent, RefObject } from 'react';
import { Loader2, Save, Plus } from 'lucide-react';
import { ProductHeader } from './ProductHeader';
import { ProductPricingSection } from './ProductPricingSection';
import { ProductTaxonomyGrid } from './ProductTaxonomyGrid';
import { ProductMediaManager, MediaItem } from './ProductMediaManager';
import type { DynamicGeoPricePayload } from '../../../../lib/pricing/geoPricingEngine';

interface ProductFormViewProps {
  mode: 'create' | 'edit';
  onClose: () => void;
  onSubmit: (e: FormEvent) => void;
  isSubmitting: boolean;
  
  // State from hook
  name: string;
  onChangeName: (e: ChangeEvent<HTMLInputElement>) => void;
  description: string;
  onChangeDescription: (e: ChangeEvent<HTMLTextAreaElement>) => void;
  price: string;
  onChangePrice: (e: ChangeEvent<HTMLInputElement>) => void;
  stock: string;
  onChangeStock: (e: ChangeEvent<HTMLInputElement>) => void;
  sku: string;
  onChangeSku: (e: ChangeEvent<HTMLInputElement>) => void;
  
  // Taxonomy
  department: string;
  category: string;
  subcategory: string;
  productType: string;
  departments: string[];
  categories: string[];
  subcategories: string[];
  productTypes: string[];
  onChangeTaxonomy: (e: ChangeEvent<HTMLSelectElement>) => void;
  
  // Media
  mediaItems: MediaItem[];
  fileInputRef: RefObject<HTMLInputElement>;
  onFilesChange: (files: FileList | null) => void;
  onRemoveFile: (index: number) => void;
  onSetThumbnail: (index: number) => void;
  
  // Geo Pricing
  isGeoLoading: boolean;
  geoPreview: DynamicGeoPricePayload | null;
}

export function ProductFormView({
  mode,
  onClose,
  onSubmit,
  isSubmitting,
  name, onChangeName,
  description, onChangeDescription,
  price, onChangePrice,
  stock, onChangeStock,
  sku, onChangeSku,
  department, category, subcategory, productType,
  departments, categories, subcategories, productTypes,
  onChangeTaxonomy,
  mediaItems, fileInputRef, onFilesChange, onRemoveFile, onSetThumbnail,
  isGeoLoading, geoPreview
}: ProductFormViewProps) {
  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-sm sm:p-4">
      <div className="w-full sm:w-auto sm:min-w-[600px] h-full sm:h-auto sm:max-h-[calc(100vh-32px)] bg-white sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right sm:slide-in-from-bottom-4 duration-300">
        <ProductHeader mode={mode} onClose={onClose} />

        <div className="flex-1 overflow-y-auto">
          <form id="product-form" onSubmit={onSubmit} className="p-6 space-y-8">
            <div className="space-y-5">
              <div>
                <label htmlFor="prod-name" className="block text-sm font-medium text-neutral-700 mb-1">
                  Product Name <span className="text-red-500">*</span>
                </label>
                <input
                  id="prod-name"
                  name="name"
                  type="text"
                  required
                  value={name}
                  onChange={onChangeName}
                  placeholder="e.g. Classic White T-Shirt"
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10"
                />
              </div>

              <div>
                <label htmlFor="prod-desc" className="block text-sm font-medium text-neutral-700 mb-1">
                  Description
                </label>
                <textarea
                  id="prod-desc"
                  name="description"
                  rows={3}
                  value={description}
                  onChange={onChangeDescription}
                  placeholder="Describe the product..."
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 resize-none"
                />
              </div>

              <div>
                <label htmlFor="prod-sku" className="block text-sm font-medium text-neutral-700 mb-1">
                  SKU (Optional)
                </label>
                <input
                  id="prod-sku"
                  name="sku"
                  type="text"
                  value={sku}
                  onChange={onChangeSku}
                  placeholder="Leave blank to auto-generate"
                  className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10 font-mono text-sm"
                />
              </div>
            </div>

            <hr className="border-neutral-100" />

            <ProductPricingSection
              price={price}
              stock={stock}
              isGeoLoading={isGeoLoading}
              geoPreview={geoPreview}
              onChange={(e) => {
                if (e.target.name === 'price') onChangePrice(e);
                if (e.target.name === 'stock') onChangeStock(e);
              }}
            />

            <hr className="border-neutral-100" />

            <ProductTaxonomyGrid
              department={department}
              category={category}
              subcategory={subcategory}
              productType={productType}
              departments={departments}
              categories={categories}
              subcategories={subcategories}
              productTypes={productTypes}
              onChange={onChangeTaxonomy}
            />

            <hr className="border-neutral-100" />

            <ProductMediaManager
              mediaItems={mediaItems}
              fileInputRef={fileInputRef}
              onFilesChange={onFilesChange}
              onRemoveFile={onRemoveFile}
              onSetThumbnail={onSetThumbnail}
            />
          </form>
        </div>

        <div className="p-4 border-t border-neutral-100 bg-neutral-50 flex justify-end gap-3 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-neutral-700 hover:text-neutral-900 bg-white hover:bg-neutral-50 border border-neutral-200 rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            form="product-form"
            disabled={isSubmitting}
            className="px-5 py-2.5 text-sm font-medium text-white bg-neutral-900 hover:bg-black rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {mode === 'create' ? 'Saving...' : 'Updating...'}
              </>
            ) : mode === 'create' ? (
              <>
                <Plus className="w-4 h-4" />
                Create Product
              </>
            ) : (
              <>
                <Save className="w-4 h-4" />
                Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
