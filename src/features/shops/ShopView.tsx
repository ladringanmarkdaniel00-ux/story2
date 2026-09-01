import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { UserRole } from '../../types/user';
import { ShopHero } from './ShopHero';
import { CreateShopHero, type ShopHeroMediaItem } from './components/CreateShopHero';
import { ProductCarousel, Product, ProductQuickView, useProducts } from '../products';
import { useStore } from '../../store';
import { useMediaProtection } from '../../hooks/useMediaProtection';

export function ShopView(): React.JSX.Element {
  const profile = useStore((state) => state.profile);
  const userRole = (profile?.role as UserRole) || 'guest';
  const containerRef = useRef<HTMLElement>(null);
  
  // Scoped media protection for non-admin users
  useMediaProtection(containerRef, userRole !== 'admin');

  const navigate = useNavigate();
  const { products } = useProducts();

  // Hero Banner State
  const [heroMedia, setHeroMedia] = useState<ShopHeroMediaItem[]>([]);
  const [isHeroPinned, setIsHeroPinned] = useState(false);
  const [isCreateHeroOpen, setIsCreateHeroOpen] = useState(false);
  const [heroModalMode, setHeroModalMode] = useState<'create' | 'add' | 'edit'>('create');

  // Modal State
  const [quickViewProduct, setQuickViewProduct] = useState<Product | null>(null);

  // Group active products by highest taxonomy block
  const productsByTaxonomyBlock = useMemo(() => {
    const active = products.filter((p) => p.status === 'active');
    return active.reduce((acc, product) => {
      let blockName = 'Other';
      if (product.taxonomy?.department?.trim()) {
        blockName = product.taxonomy?.department.trim();
      } else if (product.taxonomy?.category?.trim()) {
        blockName = product.taxonomy?.category.trim();
      } else if (product.taxonomy?.subcategory?.trim()) {
        blockName = product.taxonomy?.subcategory.trim();
      } else if (product.taxonomy?.productType?.trim()) {
        blockName = product.taxonomy?.productType.trim();
      } else if (product.taxonomy?.series?.trim()) {
        blockName = product.taxonomy?.series.trim();
      }

      if (!acc[blockName]) acc[blockName] = [];
      acc[blockName].push(product);
      return acc;
    }, {} as Record<string, Product[]>);
  }, [products]);

  const taxonomyBlocks = useMemo(
    () => Object.keys(productsByTaxonomyBlock).sort(),
    [productsByTaxonomyBlock]
  );

  const handleProductClick = useCallback(
    (product: Product) => {
      if (userRole === 'admin') {
        navigate(`/product/${product.id}`);
      } else {
        setQuickViewProduct(product);
      }
    },
    [userRole, navigate]
  );

  const handleHeroCreated = (mediaList: ShopHeroMediaItem[]) => {
    if (heroModalMode === 'add') {
      setHeroMedia((prev) => [...prev, ...mediaList]);
    } else {
      setHeroMedia(mediaList);
    }
    setIsCreateHeroOpen(false);
  };

  const handleHeroDelete = (index: number) => {
    setHeroMedia((prev) => {
      const next = prev.filter((_, idx) => idx !== index);
      if (next.length === 0) setIsHeroPinned(false);
      return next;
    });
  };

  const handleHeroEdit = () => {
    setHeroModalMode('edit');
    setIsCreateHeroOpen(true);
  };

  const handleHeroPin = () => {
    setIsHeroPinned((prev) => !prev);
  };

  return (
    <main 
      ref={containerRef}
      id="page-shop"
      className="w-full min-h-screen bg-white flex flex-col items-center pb-20 overflow-x-hidden"
    >
      {/* Top Hero Section */}
      <ShopHero
        userRole={userRole}
        onOpenCreate={() => {
          setHeroModalMode(heroMedia.length > 0 ? 'add' : 'create');
          setIsCreateHeroOpen(true);
        }}
        mediaList={heroMedia}
        isPinned={isHeroPinned}
        onPinHero={handleHeroPin}
        onEditHero={handleHeroEdit}
        onDeleteHero={handleHeroDelete}
      />

      {/* Taxonomy Carousels */}
      <section aria-label="Product Sections" className="w-full flex flex-col gap-4 mt-4">
        {taxonomyBlocks.length > 0 ? (
          taxonomyBlocks.map((block) => (
            <ProductCarousel
              key={block}
              blockTitle={block}
              products={productsByTaxonomyBlock[block]}
              userRole={userRole}
              onProductClick={handleProductClick}
            />
          ))
        ) : (
          <div className="w-full max-w-7xl mx-auto px-4 py-16 text-center text-neutral-400 text-sm border border-neutral-100 rounded-2xl mt-6">
            <p className="font-medium text-neutral-500">No products available yet.</p>
            <p className="text-xs text-neutral-400 mt-1">Check back later or add new products as an admin.</p>
          </div>
        )}
      </section>

      {/* Quick View Modal */}
      {quickViewProduct && (
        <ProductQuickView
          product={quickViewProduct}
          onClose={() => setQuickViewProduct(null)}
        />
      )}

      {/* Hero Creator Modal */}
      {isCreateHeroOpen && (
        <CreateShopHero
          mode={heroModalMode}
          initialMedia={heroMedia}
          onClose={() => setIsCreateHeroOpen(false)}
          onHeroCreated={handleHeroCreated}
        />
      )}
    </main>
  );
}

export default ShopView;
