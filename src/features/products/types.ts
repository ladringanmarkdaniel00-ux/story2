export interface Taxonomy {
  department?: string;
  category?: string;
  subcategory?: string;
  productType?: string;
  series?: string;
}

export interface Product {
  id: string;
  sku?: string;
  name?: string;
  title: string;
  price: number;
  stock?: number;
  taxonomy?: Taxonomy;
  status?: 'active' | 'draft' | 'archived';
  description?: string;
  mediaUrls: string[];
  createdAt: number;
}

export * from '../../types/filters';

