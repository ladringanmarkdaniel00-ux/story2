import React, { useState, useEffect, useCallback } from 'react';
import { X, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Product } from '../../types';
import { useProductGeoPrice } from '../../hooks/useProductGeoPrice';

interface ProductQuickViewProps {
  product: Product;
  onClose: () => void;
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

export function ProductQuickView({ product, onClose }: ProductQuickViewProps) {
  const [currentImage, setCurrentImage] = useState(0);
  const { priceData, isLoading: isGeoLoading } = useProductGeoPrice(product.sku || product.id, product.price);

  const media = product.mediaUrls || [];
  const hasMultiple = media.length > 1;

  const [touchStart, setTouchStart] = useState<number | null>(null);
  const [touchEnd, setTouchEnd] = useState<number | null>(null);

  const minSwipeDistance = 50;

  // Reset image index if product changes
  useEffect(() => {
    setCurrentImage(0);
  }, [product.id]);

  const handleNext = useCallback(() => {
    if (media.length <= 1) return;
    setCurrentImage((prev) => (prev + 1) % media.length);
  }, [media.length]);

  const handlePrev = useCallback(() => {
    if (media.length <= 1) return;
    setCurrentImage((prev) => (prev - 1 + media.length) % media.length);
  }, [media.length]);

  // Keyboard navigation & Escape to close
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, handleNext, handlePrev]);

  // Touch handlers
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) {
      handleNext();
    } else if (distance < -minSwipeDistance) {
      handlePrev();
    }
  };

  const activeMediaUrl = media[currentImage];
  const isVideo = isVideoUrl(activeMediaUrl);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quickview-title"
      className="fixed inset-0 z-[110] flex items-center justify-center p-4 md:p-6 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] relative animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 z-[120] p-2 text-neutral-500 hover:text-neutral-900 bg-white/80 hover:bg-white rounded-full backdrop-blur-md transition-colors shadow-sm cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Media Preview Section */}
        <div
          className="w-full md:w-1/2 relative bg-neutral-100 shrink-0 aspect-square flex items-center justify-center group/media select-none"
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          {media.length > 0 ? (
            <>
              {isVideo ? (
                <video
                  src={activeMediaUrl}
                  className="absolute inset-0 w-full h-full object-contain"
                  autoPlay
                  loop
                  muted
                  playsInline
                />
              ) : (
                <img
                  src={activeMediaUrl}
                  alt={product.title}
                  className="absolute inset-0 w-full h-full object-contain pointer-events-none"
                  draggable={false}
                />
              )}

              {hasMultiple && (
                <>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handlePrev();
                    }}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center text-neutral-800 shadow-md backdrop-blur-sm opacity-0 group-hover/media:opacity-100 transition-opacity z-10 cursor-pointer"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleNext();
                    }}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 bg-white/80 hover:bg-white rounded-full flex items-center justify-center text-neutral-800 shadow-md backdrop-blur-sm opacity-0 group-hover/media:opacity-100 transition-opacity z-10 cursor-pointer"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>

                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                    {media.map((_, i) => (
                      <div
                        key={i}
                        className={`h-1.5 rounded-full shadow-sm transition-all duration-300 ${
                          i === currentImage ? 'w-4 bg-white' : 'w-1.5 bg-white/50'
                        }`}
                      />
                    ))}
                  </div>
                </>
              )}
            </>
          ) : (
            <div className="text-neutral-400 text-sm">No Image Available</div>
          )}
        </div>

        {/* Product Details Section */}
        <div className="w-full md:w-1/2 p-6 md:p-8 overflow-y-auto flex flex-col bg-white">
          <div className="mb-6">
            <div className="flex items-center gap-2 text-xs font-medium text-neutral-500 mb-2 uppercase tracking-wider">
              {product.taxonomy?.department && <span>{product.taxonomy?.department}</span>}
              {product.taxonomy?.department && product.taxonomy?.category && <span>•</span>}
              {product.taxonomy?.category && <span>{product.taxonomy?.category}</span>}
            </div>

            <h2 id="quickview-title" className="text-2xl md:text-3xl font-bold text-neutral-900 leading-tight mb-2">
              {product.title}
            </h2>

            <div className="flex items-center gap-2 mt-1 mb-4">
              {isGeoLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-neutral-400" />
              ) : (
                <p className="text-xl font-semibold text-neutral-900">
                  {priceData ? priceData.formattedDisplayPrice : `₱${Number(product.price || 0).toFixed(2)}`}
                </p>
              )}
            </div>
          </div>

          <div className="flex-grow">
            <h3 className="text-sm font-semibold text-neutral-900 mb-2">Description</h3>
            <p className="text-neutral-600 text-sm leading-relaxed whitespace-pre-wrap">
              {product.description || 'No description available for this product.'}
            </p>

            {(product.taxonomy?.productType || product.taxonomy?.subcategory || product.taxonomy?.series) && (
              <div className="mt-6 pt-6 border-t border-neutral-100">
                <h3 className="text-sm font-semibold text-neutral-900 mb-3">Specifications</h3>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5 text-sm">
                  {product.sku && (
                    <>
                      <dt className="text-neutral-500">SKU</dt>
                      <dd className="font-medium text-neutral-900 text-right">{product.sku}</dd>
                    </>
                  )}
                  {product.taxonomy?.productType && (
                    <>
                      <dt className="text-neutral-500">Product Type</dt>
                      <dd className="font-medium text-neutral-900 text-right">{product.taxonomy?.productType}</dd>
                    </>
                  )}
                  {product.taxonomy?.subcategory && (
                    <>
                      <dt className="text-neutral-500">Subcategory</dt>
                      <dd className="font-medium text-neutral-900 text-right">{product.taxonomy?.subcategory}</dd>
                    </>
                  )}
                  {product.taxonomy?.series && (
                    <>
                      <dt className="text-neutral-500">Series</dt>
                      <dd className="font-medium text-neutral-900 text-right">{product.taxonomy?.series}</dd>
                    </>
                  )}
                </dl>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductQuickView;
