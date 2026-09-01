import { useState } from 'react';
import { X, Tag, Layers, FolderTree, Box } from 'lucide-react';
import { TaxonomySection } from './components/lists/TaxonomySection';

export interface ManageProductProps {
  onClose: () => void;
  departments?: string[];
  setDepartments?: (val: string[]) => void;
  categories?: string[];
  setCategories?: (val: string[]) => void;
  subcategories?: string[];
  setSubcategories?: (val: string[]) => void;
  productTypes?: string[];
  setProductTypes?: (t: string[]) => void;
  series?: string[];
  setSeries?: (t: string[]) => void;
}

export function ManageProduct({
  onClose,
  departments: propDepartments,
  setDepartments: propSetDepartments,
  categories: propCategories,
  setCategories: propSetCategories,
  subcategories: propSubcategories,
  setSubcategories: propSetSubcategories,
  productTypes: propProductTypes,
  setProductTypes: propSetProductTypes,
  series: propSeries,
  setSeries: propSetSeries,
}: ManageProductProps) {
  const [activeTab, setActiveTab] = useState<'taxonomy' | 'general'>('taxonomy');

  const [storeDepartments, storeSetDepartments] = useState<string[]>([]);
  const [storeCategories, storeSetCategories] = useState<string[]>([]);
  const [storeSubcategories, storeSetSubcategories] = useState<string[]>([]);
  const [storeProductTypes, storeSetProductTypes] = useState<string[]>([]);
  const [storeSeries, storeSetSeries] = useState<string[]>([]);

  const departments = propDepartments ?? storeDepartments;
  const setDepartments = propSetDepartments ?? storeSetDepartments;
  const categories = propCategories ?? storeCategories;
  const setCategories = propSetCategories ?? storeSetCategories;
  const subcategories = propSubcategories ?? storeSubcategories;
  const setSubcategories = propSetSubcategories ?? storeSetSubcategories;
  const productTypes = propProductTypes ?? storeProductTypes;
  const setProductTypes = propSetProductTypes ?? storeSetProductTypes;
  const series = propSeries ?? storeSeries;
  const setSeries = propSetSeries ?? storeSetSeries;

  const createAddHandler = (list: string[], setList: (items: string[]) => void) => (item: string) => {
    if (!list.includes(item)) setList([...list, item]);
  };

  const createRemoveHandler = (list: string[], setList: (items: string[]) => void) => (itemToRemove: string) => {
    setList(list.filter((i) => i !== itemToRemove));
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="manage-product-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200"
    >
      <div className="bg-white w-full max-w-6xl rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-neutral-100">
          <h2 id="manage-product-title" className="text-lg font-semibold text-neutral-900">
            Manage Taxonomy & Types
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="p-2 text-neutral-400 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="w-full border-b border-neutral-100 px-6 pt-2">
          <div className="flex gap-6">
            <button
              type="button"
              onClick={() => setActiveTab('taxonomy')}
              className={`py-3 border-b-2 font-medium text-sm transition-colors cursor-pointer ${
                activeTab === 'taxonomy'
                  ? 'border-black text-neutral-900'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700'
              }`}
            >
              Taxonomy
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('general')}
              className={`py-3 border-b-2 font-medium text-sm transition-colors cursor-pointer ${
                activeTab === 'general'
                  ? 'border-black text-neutral-900'
                  : 'border-transparent text-neutral-500 hover:text-neutral-700'
              }`}
            >
              General Settings
            </button>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto bg-white flex-1">
          {activeTab === 'taxonomy' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <TaxonomySection
                title="Departments"
                icon={<Layers className="w-4 h-4" />}
                items={departments}
                onAdd={createAddHandler(departments, setDepartments)}
                onRemove={createRemoveHandler(departments, setDepartments)}
                placeholder="Add department..."
              />
              <TaxonomySection
                title="Categories"
                icon={<FolderTree className="w-4 h-4" />}
                items={categories}
                onAdd={createAddHandler(categories, setCategories)}
                onRemove={createRemoveHandler(categories, setCategories)}
                placeholder="Add category..."
              />
              <TaxonomySection
                title="Subcategories"
                icon={<Tag className="w-4 h-4" />}
                items={subcategories}
                onAdd={createAddHandler(subcategories, setSubcategories)}
                onRemove={createRemoveHandler(subcategories, setSubcategories)}
                placeholder="Add subcategory..."
              />
              <TaxonomySection
                title="Product Types"
                icon={<Box className="w-4 h-4" />}
                items={productTypes}
                onAdd={createAddHandler(productTypes, setProductTypes)}
                onRemove={createRemoveHandler(productTypes, setProductTypes)}
                placeholder="Add product type..."
              />
              <TaxonomySection
                title="Series"
                icon={<Tag className="w-4 h-4" />}
                items={series}
                onAdd={createAddHandler(series, setSeries)}
                onRemove={createRemoveHandler(series, setSeries)}
                placeholder="Add series..."
              />
            </div>
          )}

          {activeTab === 'general' && (
            <div className="flex flex-col items-center justify-center h-48 text-neutral-400 text-sm">
              Additional product settings go here.
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-neutral-100 flex justify-end bg-neutral-50">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2 text-sm font-medium text-white bg-black rounded-full hover:bg-neutral-800 transition-colors cursor-pointer"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default ManageProduct;
