import { createContext, useContext, useMemo, useCallback, useState, type ReactNode } from 'react';
import { Product } from './types';

interface ProductContextType {
  products: Product[];
  addProduct: (product: Omit<Product, 'id' | 'createdAt'>) => void;
  updateProduct: (id: string, updates: Partial<Product>) => void;
  deleteProduct: (id: string) => void;
}

const ProductContext = createContext<ProductContextType | undefined>(undefined);

// Collision-proof ID generator
function generateId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function ProductProvider({ children }: { children: ReactNode }) {
  const [products, setProducts] = useState<Product[]>([]);

  const addProduct = useCallback(
    (productData: Omit<Product, 'id' | 'createdAt'>) => {
      const newProduct: Product = {
        ...productData,
        id: generateId(),
        createdAt: Date.now(),
      };
      setProducts([newProduct, ...products]);
    },
    [products, setProducts]
  );

  const updateProduct = useCallback(
    (id: string, updates: Partial<Product>) => {
      setProducts(
        products.map((p) => (p.id === id ? { ...p, ...updates } : p))
      );
    },
    [products, setProducts]
  );

  const deleteProduct = useCallback(
    (id: string) => {
      setProducts(products.filter((p) => p.id !== id));
    },
    [products, setProducts]
  );

  const contextValue = useMemo(
    () => ({
      products,
      addProduct,
      updateProduct,
      deleteProduct,
    }),
    [products, addProduct, updateProduct, deleteProduct]
  );

  return (
    <ProductContext.Provider value={contextValue}>
      {children}
    </ProductContext.Provider>
  );
}

export function useProducts(): ProductContextType {
  const context = useContext(ProductContext);
  if (!context) {
    throw new Error('useProducts must be used within a ProductProvider');
  }
  return context;
}
