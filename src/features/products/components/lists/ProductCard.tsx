import React, { useState, type KeyboardEvent } from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Product } from '../../types';
import { UserRole } from '../../../../types/user';
import { useProductGeoPrice } from '../../hooks/useProductGeoPrice';

interface ProductCardProps {
  product: Product;
  productIndex?: number;
  userRole?: UserRole;
  onClick?: (product: Product) => void;
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

export function ProductCard({
  product,
  productIndex = 0,
  userRole = 'guest',
  onClick,
}: ProductCardProps) {
  const [currentMediaIndex, setCurrentMediaIndex] = useState(0);
  const { priceData, isLoading: isGeoLoading } = useProductGeoPrice(product.sku || product.id, product.price);
  const mediaList = product.mediaUrls || [];
  const hasMultipleMedia = mediaList.length > 1;

  const handleMediaNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMediaIndex((prev) => (prev + 1 < mediaList.length ? prev + 1 : prev));
  };

  const handleMediaPrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMediaIndex((prev) => (prev - 1 >= 0 ? prev - 1 : prev));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick?.(product);
    }
  };

  const description = product.description?.trim();

  return (
    <article
      id={`product-card-${product.id}`}
      role="button"
      tabIndex={0}
      onClick={() => onClick?.(product)}
      onKeyDown={handleKeyDown}
      aria-label={`View ${product.title}`}
      className="w-full flex flex-col items-center justify-start relative focus:outline-none focus-visible:ring-2 focus-visible:ring-black cursor-pointer select-none"
    >
      {/* Shop Panel (Media Container) */}
      <div className="w-full relative flex items-center justify-center">
        {mediaList.length > 0 ? (
          <div
            className="relative w-full aspect-square bg-neutral-950 flex items-center justify-center overflow-hidden rounded-2xl sm:rounded-3xl shadow-sm ring-1 ring-black/5"
            onPointerDown={(e) => e.stopPropagation()}
          >
            <div
              className="flex w-full h-full transition-transform duration-300 ease-out"
              style={{ transform: `translateX(-${currentMediaIndex * 100}%)` }}
            >
              {mediaList.map((mediaUrl, idx) => {
                const isVideo = isVideoUrl(mediaUrl);
                return (
                  <div
                    key={idx}
                    className="w-full h-full shrink-0 flex items-center justify-center relative"
                  >
                    {isVideo ? (
                      <video
                        src={mediaUrl}
                        preload={productIndex === 0 && idx === 0 ? 'auto' : 'metadata'}
                        controls={userRole === 'admin'}
                        autoPlay
                        loop
                        muted
                        playsInline
                        controlsList="nodownload noplaybackrate"
                        disablePictureInPicture
                        className={`w-full h-full object-cover select-none ${
                          userRole !== 'admin' ? 'pointer-events-none' : ''
                        }`}
                      />
                    ) : (
                      <img
                        src={mediaUrl}
                        alt={`${product.title} - ${idx + 1}`}
                        loading={productIndex === 0 && idx === 0 ? 'eager' : 'lazy'}
                        fetchPriority={productIndex === 0 && idx === 0 ? 'high' : 'auto'}
                        decoding="async"
                        draggable={false}
                        className={`w-full h-full object-cover select-none ${
                          userRole !== 'admin' ? 'pointer-events-none' : ''
                        }`}
                      />
                    )}
                  </div>
                );
              })}
            </div>

            {hasMultipleMedia && (
              <>
                {currentMediaIndex > 0 && (
                  <button
                    type="button"
                    onClick={handleMediaPrev}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 text-white/80 hover:text-white hover:bg-black/60 backdrop-blur-sm transition-all z-10 cursor-pointer"
                    aria-label="Previous image"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}
                {currentMediaIndex < mediaList.length - 1 && (
                  <button
                    type="button"
                    onClick={handleMediaNext}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 rounded-full bg-black/40 text-white/80 hover:text-white hover:bg-black/60 backdrop-blur-sm transition-all z-10 cursor-pointer"
                    aria-label="Next image"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                )}

                <div className="absolute bottom-3.5 left-0 right-0 flex justify-center z-10 px-4">
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-full px-2 py-1 rounded-full bg-black/30 backdrop-blur-sm snap-x">
                    {mediaList.map((_, idx) => (
                      <div
                        key={idx}
                        className={`transition-all duration-300 rounded-full shadow-sm shrink-0 snap-center ${
                          idx === currentMediaIndex
                            ? 'bg-white w-2 h-2'
                            : 'bg-white/50 w-1.5 h-1.5'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="w-full aspect-square bg-neutral-100 rounded-2xl sm:rounded-3xl flex items-center justify-center text-neutral-400 text-sm">
            No Image Available
          </div>
        )}
      </div>

      {/* Centered Title and Price under Shop Panel with Generous Spacing */}
      <div className="w-full shrink-0 flex flex-col items-center justify-center text-center mt-3 sm:mt-4 z-10 px-2">
        {product.title && (
          <h2 className="font-extrabold text-neutral-900 leading-tight text-center text-xl sm:text-2xl lg:text-3xl tracking-tight truncate max-w-full">
            {product.title}
          </h2>
        )}
        <div className="flex items-center gap-2 mt-1">
          {isGeoLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-neutral-400" />
          ) : (
            <span className="font-semibold text-neutral-900 text-base sm:text-lg lg:text-xl tabular-nums leading-snug">
              {priceData ? priceData.formattedDisplayPrice : `₱${Number(product.price || 0).toFixed(2)}`}
            </span>
          )}
        </div>
        {description && (
          <p className="text-neutral-500 text-center text-xs sm:text-sm leading-relaxed mt-1.5 line-clamp-2 max-w-md">
            {description}
          </p>
        )}
      </div>
    </article>
  );
}

export default ProductCard;
