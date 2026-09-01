import React from 'react';
import { Settings, Plus, Search, Filter, X } from 'lucide-react';
import { ProductFilters, INITIAL_FILTERS } from '../../types';

export interface ProductToolbarProps {
  filters: ProductFilters;
  onFilterChange: React.Dispatch<React.SetStateAction<ProductFilters>>;
  onOpenFilters: () => void;
  onOpenManage: () => void;
  onOpenCreate: () => void;
}

export function ProductToolbar({
  filters,
  onFilterChange,
  onOpenFilters,
  onOpenManage,
  onOpenCreate,
}: ProductToolbarProps) {
  const activeTaxonomyCount = [
    filters.taxonomy.department !== 'All',
    filters.taxonomy.category !== 'All',
    filters.taxonomy.subcategory !== 'All',
    filters.taxonomy.productType !== 'All',
    filters.taxonomy.series !== 'All',
    filters.minPrice !== '' || filters.maxPrice !== '',
    filters.stockStatus !== 'all',
    filters.minStock !== '',
  ].filter(Boolean).length;

  const hasActiveFilters = activeTaxonomyCount > 0;

  return (
    <div className="w-full bg-white">
      {/* Top Admin Action Header */}
      <div className="w-full h-16 border-b border-neutral-100 flex items-center justify-end px-4 md:px-6 gap-3">
        <button
          type="button"
          title="Manage Taxonomy"
          aria-label="Manage Taxonomy"
          onClick={onOpenManage}
          className="flex items-center justify-center w-8 h-8 bg-neutral-100 text-neutral-700 rounded-full hover:bg-neutral-200 transition-colors cursor-pointer"
        >
          <Settings className="w-4 h-4" />
        </button>
        <button
          type="button"
          title="Add Product"
          aria-label="Add Product"
          onClick={onOpenCreate}
          className="flex items-center justify-center w-8 h-8 bg-black text-white rounded-full hover:bg-neutral-800 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      {/* Filter / Search Sub-header */}
      <div className="w-full border-b border-neutral-100 px-4 md:px-6 py-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-4 flex-1">
          {!hasActiveFilters && (
            <span className="font-medium text-sm text-neutral-900 border-b-2 border-black pb-1 whitespace-nowrap hidden sm:inline-block">
              All Products
            </span>
          )}

          <div className="relative flex-1 md:w-64 max-w-sm">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-400" />
            <input
              type="text"
              placeholder="Search products..."
              value={filters.search}
              onChange={(e) =>
                onFilterChange((prev) => ({ ...prev, search: e.target.value }))
              }
              className="w-full pl-9 pr-3 py-1.5 text-sm text-neutral-900 placeholder:text-neutral-500 border border-neutral-200 rounded-md focus:outline-none focus:ring-1 focus:ring-black bg-neutral-50 hover:bg-neutral-100/50 transition-colors"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto flex-wrap">
          {/* Active filter badges */}
          {hasActiveFilters && (
            <div className="flex items-center gap-1.5 mr-1 flex-wrap">
              {filters.taxonomy.department !== 'All' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-md">
                  <span className="text-neutral-400">Dept:</span> {filters.taxonomy.department}
                  <button
                    type="button"
                    onClick={() =>
                      onFilterChange((prev) => ({
                        ...prev,
                        department: 'All',
                        category: 'All',
                        subcategory: 'All',
                      }))
                    }
                    className="hover:text-black ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.taxonomy.category !== 'All' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-md">
                  <span className="text-neutral-400">Cat:</span> {filters.taxonomy.category}
                  <button
                    type="button"
                    onClick={() =>
                      onFilterChange((prev) => ({
                        ...prev,
                        category: 'All',
                        subcategory: 'All',
                      }))
                    }
                    className="hover:text-black ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.taxonomy.subcategory !== 'All' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-md">
                  <span className="text-neutral-400">Sub:</span> {filters.taxonomy.subcategory}
                  <button
                    type="button"
                    onClick={() =>
                      onFilterChange((prev) => ({
                        ...prev,
                        subcategory: 'All',
                      }))
                    }
                    className="hover:text-black ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.taxonomy.productType !== 'All' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-md">
                  <span className="text-neutral-400">Type:</span> {filters.taxonomy.productType}
                  <button
                    type="button"
                    onClick={() =>
                      onFilterChange((prev) => ({
                        ...prev,
                        productType: 'All',
                      }))
                    }
                    className="hover:text-black ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.taxonomy.series !== 'All' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-md">
                  <span className="text-neutral-400">Series:</span> {filters.taxonomy.series}
                  <button
                    type="button"
                    onClick={() =>
                      onFilterChange((prev) => ({
                        ...prev,
                        series: 'All',
                      }))
                    }
                    className="hover:text-black ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {(filters.minPrice !== '' || filters.maxPrice !== '') && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-md">
                  <span className="text-neutral-400">Price:</span>{' '}
                  {filters.minPrice !== '' && filters.maxPrice !== ''
                    ? `$${filters.minPrice} – $${filters.maxPrice}`
                    : filters.minPrice !== ''
                    ? `≥ $${filters.minPrice}`
                    : `≤ $${filters.maxPrice}`}
                  <button
                    type="button"
                    onClick={() =>
                      onFilterChange((prev) => ({
                        ...prev,
                        minPrice: '',
                        maxPrice: '',
                      }))
                    }
                    className="hover:text-black ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.stockStatus !== 'all' && (
                <span
                  className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-md ${
                    filters.stockStatus === 'in_stock'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : 'bg-rose-50 text-rose-700 border border-rose-200'
                  }`}
                >
                  {filters.stockStatus === 'in_stock' ? 'In Stock' : 'Out of Stock'}
                  <button
                    type="button"
                    onClick={() =>
                      onFilterChange((prev) => ({
                        ...prev,
                        stockStatus: 'all',
                      }))
                    }
                    className="hover:opacity-75 ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              {filters.minStock !== '' && (
                <span className="inline-flex items-center gap-1 text-[11px] font-medium bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded-md">
                  <span className="text-neutral-400">Min Stock:</span> {filters.minStock}
                  <button
                    type="button"
                    onClick={() =>
                      onFilterChange((prev) => ({
                        ...prev,
                        minStock: '',
                      }))
                    }
                    className="hover:text-black ml-0.5"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
              <button
                type="button"
                onClick={() => {
                  onFilterChange((prev) => ({
                    ...INITIAL_FILTERS,
                    search: prev.search,
                  }));
                }}
                className="text-[11px] uppercase tracking-wide font-medium text-rose-500 hover:text-rose-600 px-1.5 cursor-pointer"
              >
                Clear All
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={onOpenFilters}
            className={`flex items-center gap-2 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              hasActiveFilters
                ? 'bg-black text-white hover:bg-neutral-800'
                : 'text-neutral-700 bg-neutral-100 hover:bg-neutral-200'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && (
              <span className="w-5 h-5 rounded-full bg-white text-black text-xs font-bold flex items-center justify-center -mr-1">
                {activeTaxonomyCount}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
