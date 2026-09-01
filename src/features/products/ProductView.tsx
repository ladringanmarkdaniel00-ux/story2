import { useState, useMemo } from 'react';
import { Shield } from 'lucide-react';
import { 
  ManageProduct, 
  ProductAdminList, 
  Product as ProductType, 
  useProducts 
} from './index';
import { CreateProduct } from './components/forms/CreateProduct';
import { EditProduct } from './components/forms/EditProduct';
import { ProductFilterDrawer } from './components/modals/ProductFilterDrawer';
import { DeleteProductModal } from './components/modals/DeleteProductModal';
import { ProductToolbar } from './components/shared/ProductToolbar';
import { ProductFilters, INITIAL_FILTERS } from './types';
import { useStore } from '../../store';

export function ProductView() {
  const profile = useStore((state) => state.profile);
  const userRole = profile?.role;
  const { products, addProduct, updateProduct, deleteProduct } = useProducts();

  // Dialog / Modal states
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isManageOpen, setIsManageOpen] = useState(false);
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductType | null>(null);
  const [deletingProduct, setDeletingProduct] = useState<ProductType | null>(null);

  // Unified Filter State
  const [filters, setFilters] = useState<ProductFilters>(INITIAL_FILTERS);

  // Memoized Search & Filter Execution
  const filteredProducts = useMemo(() => {
    const searchLower = filters.search.trim().toLowerCase();

    return products.filter((p) => {
      const matchDept = filters.taxonomy.department === 'All' || p.taxonomy?.department === filters.taxonomy.department;
      const matchCat = filters.taxonomy.category === 'All' || p.taxonomy?.category === filters.taxonomy.category;
      const matchSub = filters.taxonomy.subcategory === 'All' || p.taxonomy?.subcategory === filters.taxonomy.subcategory;
      const matchType = filters.taxonomy.productType === 'All' || p.taxonomy?.productType === filters.taxonomy.productType;
      const matchSeries = filters.taxonomy.series === 'All' || p.taxonomy?.series === filters.taxonomy.series;

      // Price filter
      const minP = filters.minPrice !== '' ? Number(filters.minPrice) : null;
      const maxP = filters.maxPrice !== '' ? Number(filters.maxPrice) : null;
      const priceVal = Number(p.price ?? 0);
      const matchMinPrice = minP === null || priceVal >= minP;
      const matchMaxPrice = maxP === null || priceVal <= maxP;

      // Stock filter
      const stockVal = Number(p.stock ?? 0);
      const matchStockStatus =
        filters.stockStatus === 'all'
          ? true
          : filters.stockStatus === 'in_stock'
          ? stockVal > 0
          : stockVal === 0;

      const minStockNum = filters.minStock !== '' ? Number(filters.minStock) : null;
      const matchMinStock = minStockNum === null || stockVal >= minStockNum;

      const matchSearch =
        !searchLower ||
        p.title?.toLowerCase().includes(searchLower) ||
        p.name?.toLowerCase().includes(searchLower) ||
        p.description?.toLowerCase().includes(searchLower) ||
        p.taxonomy?.department?.toLowerCase().includes(searchLower) ||
        p.taxonomy?.category?.toLowerCase().includes(searchLower) ||
        p.taxonomy?.subcategory?.toLowerCase().includes(searchLower);

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
    });
  }, [products, filters]);

  // Route-level authorization check
  if (userRole !== 'admin') {
    return (
      <div className="w-full relative bg-white min-h-screen pb-20 flex flex-col items-center justify-center px-4 text-center">
        <Shield className="w-16 h-16 text-red-500/20 mb-4" />
        <h1 className="text-2xl font-bold text-neutral-900 mb-2">Access Denied</h1>
        <p className="text-neutral-500 max-w-md">
          You do not have permission to view the product administration page. Administrator access is required.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full relative bg-white min-h-screen pb-20">
      {/* Top Toolbar: Search, Actions, Filter Badges */}
      <ProductToolbar
        filters={filters}
        onFilterChange={setFilters}
        onOpenFilters={() => setIsFilterOpen(true)}
        onOpenManage={() => setIsManageOpen(true)}
        onOpenCreate={() => setIsCreateOpen(true)}
      />

      {/* Main Content Area */}
      <main className="p-6 max-w-7xl mx-auto">
        {filteredProducts.length > 0 ? (
          <ProductAdminList
            products={filteredProducts}
            onEdit={setEditingProduct}
            onDelete={setDeletingProduct}
          />
        ) : (
          <div className="w-full min-h-[400px] border border-neutral-200 border-dashed rounded-2xl flex flex-col items-center justify-center bg-neutral-50/50">
            <p className="text-neutral-500 text-sm">No products available yet.</p>
          </div>
        )}
      </main>

      {/* Forms & Dialogs */}
      {isCreateOpen && (
        <CreateProduct
          onClose={() => setIsCreateOpen(false)}
          onProductCreated={(product) => {
            addProduct(product);
            setIsCreateOpen(false);
          }}
        />
      )}

      {editingProduct && (
        <EditProduct
          product={editingProduct}
          onClose={() => setEditingProduct(null)}
          onProductUpdated={(updates) => {
            updateProduct(editingProduct.id, updates);
            setEditingProduct(null);
          }}
        />
      )}

      {isManageOpen && <ManageProduct onClose={() => setIsManageOpen(false)} />}

      {deletingProduct && (
        <DeleteProductModal
          product={deletingProduct}
          onClose={() => setDeletingProduct(null)}
          onConfirm={(id) => {
            deleteProduct(id);
            setDeletingProduct(null);
          }}
        />
      )}

      {isFilterOpen && (
        <ProductFilterDrawer
          filters={filters}
          onFilterChange={setFilters}
          onClose={() => setIsFilterOpen(false)}
        />
      )}
    </div>
  );
}
