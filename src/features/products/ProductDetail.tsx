import { useState, useCallback, useEffect } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Product } from './types';
import { UserRole } from '../../types/user';
import { useProductGeoPrice } from './hooks/useProductGeoPrice';

interface ProductDetailProps {
  product: Product;
  userRole?: UserRole;
}

// Pure helper function to detect video URLs safely
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

export function ProductDetail({ product, userRole = 'guest' }: ProductDetailProps) {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const { priceData, isLoading: isGeoLoading } = useProductGeoPrice(product.sku || product.id, product.price);

  const mediaUrls = product.mediaUrls || [];
  const hasMedia = mediaUrls.length > 0;

  // Reset index if product changes
  useEffect(() => {
    setCurrentMediaIndex(0);
  }, [product.id]);

  const handleNext = useCallback(() => {
    if (mediaUrls.length <= 1) return;
    setCurrentMediaIndex((prev) => (prev + 1 < mediaUrls.length ? prev + 1 : 0));
  }, [mediaUrls.length]);

  const handlePrev = useCallback(() => {
    if (mediaUrls.length <= 1) return;
    setCurrentMediaIndex((prev) => (prev - 1 >= 0 ? prev - 1 : mediaUrls.length - 1));
  }, [mediaUrls.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleNext, handlePrev]);

  return (
    <article className="w-full max-w-7xl mx-auto px-4 py-8 lg:py-12">
      <div className="flex flex-col lg:flex-row gap-8 lg:gap-12">
        {/* Media Gallery */}
        <div className="w-full lg:w-3/5">
          <div className="relative aspect-square sm:aspect-[4/3] lg:aspect-square bg-neutral-100 rounded-2xl overflow-hidden flex items-center justify-center group">
            {!hasMedia ? (
              <div className="text-neutral-400 font-medium">No Image Available</div>
            ) : (
              <>
                <div
                  className="flex w-full h-full transition-transform duration-300 ease-out"
                  style={{ transform: `translateX(-${currentMediaIndex * 100}%)` }}
                >
                  {mediaUrls.map((url, idx) => {
                    const isVideo = isVideoUrl(url);

                    return (
                      <div
                        key={idx}
                        className="w-full h-full shrink-0 flex items-center justify-center relative bg-white"
                      >
                        {isVideo ? (
                          <video
                            src={url}
                            className={`w-full h-full object-contain select-none ${
                              userRole !== 'admin' ? 'pointer-events-none' : ''
                            }`}
                            onContextMenu={(e) => e.preventDefault()}
                            onDragStart={(e) => e.preventDefault()}
                            autoPlay
                            loop
                            muted
                            playsInline
                          />
                        ) : (
                          <img
                            src={url}
                            alt={`${product.title} - view ${idx + 1}`}
                            className={`w-full h-full object-contain select-none ${
                              userRole !== 'admin' ? 'pointer-events-none' : ''
                            }`}
                            onContextMenu={(e) => e.preventDefault()}
                            onDragStart={(e) => e.preventDefault()}
                            draggable={false}
                            loading={idx === 0 ? 'eager' : 'lazy'}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Left/Right Navigation Chevrons */}
                {mediaUrls.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={handlePrev}
                      aria-label="Previous image"
                      className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 backdrop-blur-md shadow-md text-neutral-800 hover:bg-white transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <button
                      type="button"
                      onClick={handleNext}
                      aria-label="Next image"
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full bg-white/80 backdrop-blur-md shadow-md text-neutral-800 hover:bg-white transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>

                    {/* Dot Indicators */}
                    <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2 z-20">
                      {mediaUrls.map((_, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setCurrentMediaIndex(idx)}
                          aria-label={`Go to slide ${idx + 1}`}
                          className={`transition-all duration-300 rounded-full cursor-pointer ${
                            idx === currentMediaIndex
                              ? 'bg-black w-6 h-2'
                              : 'bg-black/30 hover:bg-black/50 w-2 h-2'
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </>
            )}
          </div>

          {/* Thumbnails */}
          {hasMedia && mediaUrls.length > 1 && (
            <div
              role="tablist"
              aria-label="Product thumbnails"
              className="flex gap-3 mt-4 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
              {mediaUrls.map((url, idx) => {
                const isVideo = isVideoUrl(url);

                return (
                  <button
                    key={idx}
                    type="button"
                    role="tab"
                    aria-selected={idx === currentMediaIndex}
                    aria-label={`Select media ${idx + 1}`}
                    onClick={() => setCurrentMediaIndex(idx)}
                    className={`relative w-20 h-20 shrink-0 rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                      idx === currentMediaIndex
                        ? 'border-black ring-1 ring-black/10'
                        : 'border-transparent opacity-60 hover:opacity-100'
                    }`}
                  >
                    {isVideo ? (
                      <video src={url} className="w-full h-full object-cover" muted playsInline />
                    ) : (
                      <img
                        src={url}
                        alt={`Thumbnail ${idx + 1}`}
                        className="w-full h-full object-cover"
                        draggable={false}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Product Details & Specifications */}
        <div className="w-full lg:w-2/5 flex flex-col pt-2 lg:pt-8">
          <h1 className="text-3xl lg:text-4xl font-bold text-neutral-900 tracking-tight">
            {product.title}
          </h1>

          {product.name && (
            <p className="text-sm font-medium text-neutral-500 mt-1">{product.name}</p>
          )}

          <div className="mt-4 flex items-center gap-3">
            {isGeoLoading ? (
              <Loader2 className="w-6 h-6 animate-spin text-neutral-400" />
            ) : (
              <div className="text-2xl font-medium text-neutral-900">
                {priceData ? priceData.formattedDisplayPrice : `₱${Number(product.price || 0).toFixed(2)}`}
              </div>
            )}
            {priceData && !isGeoLoading && priceData.taxMode === 'EXCLUSIVE' && (
              <span className="text-sm text-neutral-500 mt-1">+ tax</span>
            )}
          </div>

          {product.description && (
            <div className="mt-6 prose prose-neutral max-w-none text-neutral-600">
              <p className="leading-relaxed whitespace-pre-wrap">{product.description}</p>
            </div>
          )}

          {/* Metadata Badges */}
          <div className="mt-6 flex flex-wrap gap-2">
            {product.sku && (
              <span className="px-2.5 py-1 text-xs rounded-md bg-neutral-100 text-neutral-700 font-medium">
                SKU: {product.sku}
              </span>
            )}
            {product.taxonomy?.department && (
              <span className="px-2.5 py-1 text-xs rounded-md bg-neutral-100 text-neutral-700 font-medium">
                {product.taxonomy?.department}
              </span>
            )}
            {product.taxonomy?.category && (
              <span className="px-2.5 py-1 text-xs rounded-md bg-neutral-100 text-neutral-700 font-medium">
                {product.taxonomy?.category}
              </span>
            )}
            {product.taxonomy?.productType && (
              <span className="px-2.5 py-1 text-xs rounded-md bg-neutral-100 text-neutral-700 font-medium">
                {product.taxonomy?.productType}
              </span>
            )}
          </div>

          <div className="mt-8 pt-8 border-t border-neutral-100 space-y-4">
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">Shipping</span>
              <span className="font-medium text-neutral-900">Calculated at checkout</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">Stock</span>
              <span className="font-medium text-neutral-900">
                {product.stock && product.stock > 0 ? `${product.stock} units available` : 'In Stock'}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-neutral-500">Returns</span>
              <span className="font-medium text-neutral-900">30-day return policy</span>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export default ProductDetail;
