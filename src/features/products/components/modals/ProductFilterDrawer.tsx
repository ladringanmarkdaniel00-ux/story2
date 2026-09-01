import React, { useMemo } from 'react';
import { X, RotateCcw, DollarSign, Package, Layers } from 'lucide-react';
import { ProductFilters, INITIAL_FILTERS } from '../../types';
import { useProducts } from '../../ProductContext';

interface ProductFilterDrawerProps {
  filters: ProductFilters;
  onFilterChange: React.Dispatch<React.SetStateAction<ProductFilters>>;
  onClose: () => void;
}

const PRICE_PRESETS: Array<{ label: string; min: number | ''; max: number | '' }> = [
  { label: 'Under $25', min: '', max: 25 },
  { label: '$25 – $50', min: 25, max: 50 },
  { label: '$50 – $100', min: 50, max: 100 },
  { label: '$100+', min: 100, max: '' },
];

export function ProductFilterDrawer({
  filters,
  onFilterChange,
  onClose,
}: ProductFilterDrawerProps) {
  const { products } = useProducts();
  const storeDepartments: string[] = [];
  const storeCategories: string[] = [];
  const storeSubcategories: string[] = [];
  const storeProductTypes: string[] = [];
  const storeSeries: string[] = [];

  // Dynamically combine taxonomies from store and active products
  const departments = useMemo(() => {
    const set = new Set<string>(storeDepartments);
    products.forEach((p) => {
      if (p.taxonomy?.department?.trim()) set.add(p.taxonomy?.department.trim());
    });
    return Array.from(set).sort();
  }, [storeDepartments, products]);

  const categories = useMemo(() => {
    const set = new Set<string>(storeCategories);
    products.forEach((p) => {
      if (
        (filters.taxonomy.department === 'All' || p.taxonomy?.department === filters.taxonomy.department) &&
        p.taxonomy?.category?.trim()
      ) {
        set.add(p.taxonomy?.category.trim());
      }
    });
    return Array.from(set).sort();
  }, [storeCategories, products, filters.taxonomy.department]);

  const subcategories = useMemo(() => {
    const set = new Set<string>(storeSubcategories);
    products.forEach((p) => {
      const matchDept = filters.taxonomy.department === 'All' || p.taxonomy?.department === filters.taxonomy.department;
      const matchCat = filters.taxonomy.category === 'All' || p.taxonomy?.category === filters.taxonomy.category;
      if (matchDept && matchCat && p.taxonomy?.subcategory?.trim()) {
        set.add(p.taxonomy?.subcategory.trim());
      }
    });
    return Array.from(set).sort();
  }, [storeSubcategories, products, filters.taxonomy.department, filters.taxonomy.category]);

  const productTypes = useMemo(() => {
    const set = new Set<string>(storeProductTypes);
    products.forEach((p) => {
      if (p.taxonomy?.productType?.trim()) set.add(p.taxonomy?.productType.trim());
    });
    return Array.from(set).sort();
  }, [storeProductTypes, products]);

  const seriesList = useMemo(() => {
    const set = new Set<string>(storeSeries);
    products.forEach((p) => {
      if (p.taxonomy?.series?.trim()) set.add(p.taxonomy?.series.trim());
    });
    return Array.from(set).sort();
  }, [storeSeries, products]);

  // Count matching products
  const matchCount = useMemo(() => {
    return products.filter((p) => {
      const matchDept = filters.taxonomy.department === 'All' || p.taxonomy?.department === filters.taxonomy.department;
      const matchCat = filters.taxonomy.category === 'All' || p.taxonomy?.category === filters.taxonomy.category;
      const matchSub = filters.taxonomy.subcategory === 'All' || p.taxonomy?.subcategory === filters.taxonomy.subcategory;
      const matchType = filters.taxonomy.productType === 'All' || p.taxonomy?.productType === filters.taxonomy.productType;
      const matchSeries = filters.taxonomy.series === 'All' || p.taxonomy?.series === filters.taxonomy.series;

      const minP = filters.minPrice !== '' ? Number(filters.minPrice) : null;
      const maxP = filters.maxPrice !== '' ? Number(filters.maxPrice) : null;
      const matchMinPrice = minP === null || (p.price ?? 0) >= minP;
      const matchMaxPrice = maxP === null || (p.price ?? 0) <= maxP;

      const stockVal = p.stock ?? 0;
      const matchStockStatus =
        filters.stockStatus === 'all'
          ? true
          : filters.stockStatus === 'in_stock'
          ? stockVal > 0
          : stockVal === 0;

      const minStockNum = filters.minStock !== '' ? Number(filters.minStock) : null;
      const matchMinStock = minStockNum === null || stockVal >= minStockNum;

      const searchLower = filters.search.trim().toLowerCase();
      const matchSearch =
        !searchLower ||
        p.title?.toLowerCase().includes(searchLower) ||
        p.name?.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower);

      return (
        matchDept &&
        matchCat &&
        matchSub &&
        matchType &&
        matchSeries &&
        matchMinPrice &&
        matchMaxPrice &&
        matchStockStatus &&
        matchMinStock &&
        matchSearch
      );
    }).length;
  }, [products, filters]);

  const handleReset = () => {
    onFilterChange((prev) => ({
      ...INITIAL_FILTERS,
      search: prev.search,
    }));
  };

  const isPresetActive = (min: number | '', max: number | '') =>
    filters.minPrice === min && filters.maxPrice === max;

  return (
    <div className="fixed inset-0 z-[150] flex justify-end bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-sm sm:max-w-md h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
        {/* Drawer Header */}
        <div className="flex items-center justify-between p-5 border-b border-neutral-100">
          <div>
            <h3 className="text-lg font-bold text-neutral-900">Filters</h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              {matchCount} {matchCount === 1 ? 'product' : 'products'} found
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleReset}
              title="Reset all filters"
              aria-label="Reset all filters"
              className="flex items-center gap-1.5 text-xs text-neutral-500 hover:text-neutral-900 px-2 py-1 rounded-md hover:bg-neutral-100 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset
            </button>
            <button
              onClick={onClose}
              aria-label="Close filter drawer"
              className="text-neutral-500 hover:text-neutral-900 transition-colors p-1.5 rounded-full hover:bg-neutral-100"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Drawer Filters List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* Section: Taxonomies */}
          <div className="space-y-4">
            <div className="flex items-center gap-1.5 pb-1 border-b border-neutral-100">
              <Layers className="w-4 h-4 text-neutral-600" />
              <span className="text-xs font-bold tracking-wider text-neutral-700 uppercase">
                Taxonomies
              </span>
            </div>

            {/* Department */}
            <div>
              <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">
                Department
              </label>
              <select
                className="w-full text-sm border border-neutral-200 bg-neutral-50 rounded-lg py-2 px-3 focus:ring-2 focus:ring-black outline-none cursor-pointer"
                value={filters.taxonomy.department}
                onChange={(e) => {
                  onFilterChange((prev) => ({
                    ...prev,
                    department: e.target.value,
                    category: 'All',
                    subcategory: 'All',
                  }));
                }}
              >
                <option value="All">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            {/* Category */}
            <div>
              <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">
                Category
              </label>
              <select
                className="w-full text-sm border border-neutral-200 bg-neutral-50 rounded-lg py-2 px-3 focus:ring-2 focus:ring-black outline-none cursor-pointer"
                value={filters.taxonomy.category}
                onChange={(e) => {
                  onFilterChange((prev) => ({
                    ...prev,
                    category: e.target.value,
                    subcategory: 'All',
                  }));
                }}
              >
                <option value="All">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Subcategory */}
            <div>
              <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">
                Subcategory
              </label>
              <select
                className="w-full text-sm border border-neutral-200 bg-neutral-50 rounded-lg py-2 px-3 focus:ring-2 focus:ring-black outline-none cursor-pointer"
                value={filters.taxonomy.subcategory}
                onChange={(e) => {
                  onFilterChange((prev) => ({
                    ...prev,
                    subcategory: e.target.value,
                  }));
                }}
              >
                <option value="All">All Subcategories</option>
                {subcategories.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Product Type */}
            {productTypes.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">
                  Product Type
                </label>
                <select
                  className="w-full text-sm border border-neutral-200 bg-neutral-50 rounded-lg py-2 px-3 focus:ring-2 focus:ring-black outline-none cursor-pointer"
                  value={filters.taxonomy.productType}
                  onChange={(e) =>
                    onFilterChange((prev) => ({
                      ...prev,
                      productType: e.target.value,
                    }))
                  }
                >
                  <option value="All">All Types</option>
                  {productTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Series */}
            {seriesList.length > 0 && (
              <div>
                <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">
                  Series
                </label>
                <select
                  className="w-full text-sm border border-neutral-200 bg-neutral-50 rounded-lg py-2 px-3 focus:ring-2 focus:ring-black outline-none cursor-pointer"
                  value={filters.taxonomy.series}
                  onChange={(e) =>
                    onFilterChange((prev) => ({
                      ...prev,
                      series: e.target.value,
                    }))
                  }
                >
                  <option value="All">All Series</option>
                  {seriesList.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Section: Price Filter */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-1.5 pb-1 border-b border-neutral-100">
              <DollarSign className="w-4 h-4 text-neutral-600" />
              <span className="text-xs font-bold tracking-wider text-neutral-700 uppercase">
                Price Range
              </span>
            </div>

            {/* Quick Presets */}
            <div className="grid grid-cols-2 gap-1.5">
              {PRICE_PRESETS.map((preset) => {
                const active = isPresetActive(preset.min, preset.max);
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      if (active) {
                        onFilterChange((prev) => ({ ...prev, minPrice: '', maxPrice: '' }));
                      } else {
                        onFilterChange((prev) => ({
                          ...prev,
                          minPrice: preset.min,
                          maxPrice: preset.max,
                        }));
                      }
                    }}
                    className={`text-xs py-1.5 px-2.5 rounded-lg border font-medium transition-colors ${
                      active
                        ? 'bg-black text-white border-black'
                        : 'bg-neutral-50 text-neutral-700 border-neutral-200 hover:bg-neutral-100'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {/* Min / Max Inputs */}
            <div className="flex items-center gap-2 pt-1">
              <div className="flex-1 relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-neutral-400">
                  $
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Min"
                  value={filters.minPrice}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : Math.max(0, Number(e.target.value));
                    onFilterChange((prev) => ({ ...prev, minPrice: val }));
                  }}
                  className="w-full text-xs border border-neutral-200 bg-neutral-50 rounded-lg py-2 pl-6 pr-2 focus:ring-2 focus:ring-black outline-none"
                />
              </div>
              <span className="text-neutral-400 text-xs">—</span>
              <div className="flex-1 relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-neutral-400">
                  $
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Max"
                  value={filters.maxPrice}
                  onChange={(e) => {
                    const val = e.target.value === '' ? '' : Math.max(0, Number(e.target.value));
                    onFilterChange((prev) => ({ ...prev, maxPrice: val }));
                  }}
                  className="w-full text-xs border border-neutral-200 bg-neutral-50 rounded-lg py-2 pl-6 pr-2 focus:ring-2 focus:ring-black outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section: Stock Filter */}
          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-1.5 pb-1 border-b border-neutral-100">
              <Package className="w-4 h-4 text-neutral-600" />
              <span className="text-xs font-bold tracking-wider text-neutral-700 uppercase">
                Stock & Availability
              </span>
            </div>

            {/* Segmented Stock Status */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-neutral-100 rounded-lg">
              <button
                type="button"
                onClick={() => onFilterChange((prev) => ({ ...prev, stockStatus: 'all' }))}
                className={`text-xs py-1.5 px-2 rounded-md font-medium transition-all ${
                  filters.stockStatus === 'all'
                    ? 'bg-white text-neutral-900 shadow-sm font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => onFilterChange((prev) => ({ ...prev, stockStatus: 'in_stock' }))}
                className={`text-xs py-1.5 px-2 rounded-md font-medium transition-all ${
                  filters.stockStatus === 'in_stock'
                    ? 'bg-emerald-600 text-white shadow-sm font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                In Stock
              </button>
              <button
                type="button"
                onClick={() => onFilterChange((prev) => ({ ...prev, stockStatus: 'out_of_stock' }))}
                className={`text-xs py-1.5 px-2 rounded-md font-medium transition-all ${
                  filters.stockStatus === 'out_of_stock'
                    ? 'bg-rose-600 text-white shadow-sm font-semibold'
                    : 'text-neutral-600 hover:text-neutral-900'
                }`}
              >
                Out of Stock
              </button>
            </div>

            {/* Min Stock threshold */}
            <div>
              <label className="text-xs font-semibold text-neutral-600 mb-1.5 block">
                Minimum Stock Quantity
              </label>
              <input
                type="number"
                min="0"
                placeholder="e.g. 5"
                value={filters.minStock}
                onChange={(e) => {
                  const val = e.target.value === '' ? '' : Math.max(0, Number(e.target.value));
                  onFilterChange((prev) => ({ ...prev, minStock: val }));
                }}
                className="w-full text-xs border border-neutral-200 bg-neutral-50 rounded-lg py-2 px-3 focus:ring-2 focus:ring-black outline-none"
              />
            </div>
          </div>
        </div>

        {/* Drawer Footer */}
        <div className="p-5 border-t border-neutral-100 bg-neutral-50 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-black text-white font-medium rounded-lg hover:bg-neutral-800 transition-colors text-sm shadow-sm"
          >
            Apply Filters ({matchCount})
          </button>
        </div>
      </div>
    </div>
  );
}
