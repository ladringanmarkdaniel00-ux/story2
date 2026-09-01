import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Product } from '../../types';

interface ProductGridProps {
  products: Product[];
}

function isVideoUrl(url?: string): boolean {
  if (!url) return false;
  const cleanUrl = url.split('?')[0].toLowerCase();
  return (
    cleanUrl.startsWith('data:video/') ||
    cleanUrl.endsWith('.mp4') ||
    cleanUrl.endsWith('.webm') ||
    cleanUrl.endsWith('.mov')
  );
}

function ProductCard({ product }: { product: Product; key?: React.Key }) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const media = product.mediaUrls || [];
  const hasMultiple = media.length > 1;

  const currentMediaUrl = media[currentImageIndex];
  const isVideo = isVideoUrl(currentMediaUrl);

  const handleNext = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev + 1) % media.length);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev - 1 + media.length) % media.length);
  };

  return (
    <Link
      to={`/product/${product.id}`}
      className="group flex flex-col focus:outline-none focus-visible:ring-2 focus-visible:ring-black rounded-xl"
      aria-label={`View ${product.title}`}
    >
      {/* Media Container */}
      <div className="relative aspect-[4/5] bg-neutral-100 rounded-xl overflow-hidden mb-3 select-none">
        {media.length > 0 ? (
          <>
            {isVideo ? (
              <video
                src={currentMediaUrl}
                className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                autoPlay
                loop
                muted
                playsInline
                draggable={false}
              />
            ) : (
              <img
                src={currentMediaUrl}
                alt={product.title}
                loading="lazy"
                decoding="async"
                className="w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105 pointer-events-none"
                draggable={false}
              />
            )}

            {/* Carousel Navigation Chevrons */}
            {hasMultiple && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 sm:w-8 sm:h-8 bg-white/80 hover:bg-white rounded-full flex items-center justify-center text-neutral-800 shadow-sm backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer"
                  aria-label="Previous image"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 sm:w-8 sm:h-8 bg-white/80 hover:bg-white rounded-full flex items-center justify-center text-neutral-800 shadow-sm backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity z-10 cursor-pointer"
                  aria-label="Next image"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>

                {/* Dot Indicators */}
                <div className="absolute bottom-2 left-0 right-0 flex justify-center gap-1 z-10">
                  {media.map((_, idx) => (
                    <div
                      key={idx}
                      className={`h-1.5 rounded-full transition-all duration-300 ${
                        idx === currentImageIndex ? 'w-4 bg-white shadow-sm' : 'w-1.5 bg-white/50'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-400 text-sm">
            No Image
          </div>
        )}
      </div>

      {/* Product Title & Details */}
      <h3 className="font-medium text-neutral-900 text-sm md:text-base leading-tight truncate">
        {product.title}
      </h3>

      {product.name && (
        <p className="text-xs text-neutral-500 truncate mt-0.5">{product.name}</p>
      )}

      {/* Price */}
      <p className="text-neutral-900 font-semibold text-sm mt-1">
        ${Number(product.price || 0).toFixed(2)}
      </p>
    </Link>
  );
}

export function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="w-full py-16 text-center text-neutral-400">
        <p className="text-base font-medium">No products found</p>
      </div>
    );
  }

  return (
    <section aria-label="Product Grid" className="w-full max-w-7xl mx-auto px-4 py-8">
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

export default ProductGrid;
