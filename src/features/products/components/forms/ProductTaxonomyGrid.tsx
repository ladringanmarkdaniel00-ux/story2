import React, { ChangeEvent } from 'react';

interface ProductTaxonomyGridProps {
  department: string;
  category: string;
  subcategory: string;
  productType: string;
  seriesValue?: string;
  departments: string[];
  categories: string[];
  subcategories: string[];
  productTypes: string[];
  seriesList?: string[];
  onChange: (e: ChangeEvent<HTMLSelectElement>) => void;
}

export function ProductTaxonomyGrid({
  department,
  category,
  subcategory,
  productType,
  seriesValue,
  departments,
  categories,
  subcategories,
  productTypes,
  seriesList,
  onChange,
}: ProductTaxonomyGridProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">Department</label>
        <select
          name="department"
          value={department}
          onChange={onChange}
          className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10"
        >
          <option value="">Select...</option>
          {departments.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">Category</label>
        <select
          name="category"
          value={category}
          onChange={onChange}
          className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10"
        >
          <option value="">Select...</option>
          {categories.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">Subcategory</label>
        <select
          name="subcategory"
          value={subcategory}
          onChange={onChange}
          className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10"
        >
          <option value="">Select...</option>
          {subcategories.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-1">Product Type</label>
        <select
          name="productType"
          value={productType}
          onChange={onChange}
          className="w-full px-4 py-2.5 bg-neutral-50 border border-neutral-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/10"
        >
          <option value="">Select...</option>
          {productTypes.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
      </div>
    </div>
  );
}
