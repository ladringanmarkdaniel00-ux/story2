export interface TaxonomyFilters {
  department: string;
  category: string;
  subcategory: string;
  productType: string;
  series: string;
}

export interface ProductFilters {
  taxonomy: TaxonomyFilters;
  search: string;
  minPrice: number | '';
  maxPrice: number | '';
  stockStatus: 'all' | 'in_stock' | 'out_of_stock';
  minStock: number | '';
}

export const INITIAL_FILTERS: ProductFilters = {
  taxonomy: {
    department: 'All',
    category: 'All',
    subcategory: 'All',
    productType: 'All',
    series: 'All',
  },
  search: '',
  minPrice: '',
  maxPrice: '',
  stockStatus: 'all',
  minStock: '',
};
