import { useState, useEffect, useCallback } from 'react';
import { Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { UserRole } from '../../types/user';
import { ShopHeroMenu } from './ShopHeroMenu';
import { type ShopHeroMediaItem } from './components/CreateShopHero';

interface ShopHeroProps {
  userRole?: UserRole;
  onOpenCreate?: () => void;
  mediaList?: ShopHeroMediaItem[] | null;
  isPinned?: boolean;
  onPinHero?: (index: number) => void;
  onEditHero?: (index: number) => void;
  onDeleteHero?: (index: number) => void;
}

export function ShopHero({
  userRole = 'guest',
  onOpenCreate,
  mediaList,
  isPinned,
  onPinHero,
  onEditHero,
  onDeleteHero,
}: ShopHeroProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const items = mediaList || [];
  const hasMedia = items.length > 0;

  // Keep currentIndex bounded if slides are deleted
  useEffect(() => {
    if (items.length === 0) {
      setCurrentIndex(0);
    } else if (currentIndex >= items.length) {
      setCurrentIndex(items.length - 1);
    }
  }, [items.length, currentIndex]);

  const handleNext = useCallback(() => {
    if (items.length <= 1) return;
    setCurrentIndex((prev) => (prev + 1 < items.length ? prev + 1 : 0));
  }, [items.length]);

  const handlePrev = useCallback(() => {
    if (items.length <= 1) return;
    setCurrentIndex((prev) => (prev - 1 >= 0 ? prev - 1 : items.length - 1));
  }, [items.length]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!hasMedia) return;
      if (e.key === 'ArrowRight') handleNext();
      if (e.key === 'ArrowLeft') handlePrev();
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [hasMedia, handleNext, handlePrev]);

  return (
    <section
      aria-label="Shop hero banner"
      className="w-full h-[50vh] min-h-[320px] bg-neutral-950 relative flex items-center justify-center overflow-hidden select-none m-0 p-0"
    >
      {/* Top Left Admin Add Button */}
      {userRole === 'admin' && (
        <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-30">
          <button
            type="button"
            onClick={onOpenCreate}
            aria-label={hasMedia ? 'Add Shop Hero Media' : 'Create Shop Hero'}
            title={hasMedia ? 'Add Media' : 'Create Hero'}
            className="w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 text-white shadow-sm flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer backdrop-blur-md border border-white/10"
          >
            <Plus className="w-4 h-4 stroke-[2.5]" />
          </button>
        </div>
      )}

      {/* Top Right Admin Options for Active Slide */}
      {userRole === 'admin' && hasMedia && (
        <div className="absolute top-3 right-3 sm:top-4 sm:right-4 z-30">
          <ShopHeroMenu
            isPinned={isPinned}
            onPin={() => onPinHero?.(currentIndex)}
            onEdit={() => onEditHero?.(currentIndex)}
            onDelete={() => onDeleteHero?.(currentIndex)}
          />
        </div>
      )}

      {/* Main Slide Track */}
      <div className="relative w-full h-full max-w-full max-h-full flex items-center justify-center z-10">
        {!hasMedia ? (
          <div className="text-neutral-500 font-medium text-sm">
            No Hero Media
          </div>
        ) : (
          <>
            <div
              className="flex w-full h-full transition-transform duration-300 ease-out"
              style={{ transform: `translateX(-${currentIndex * 100}%)` }}
            >
              {items.map((media, idx) => (
                <div key={idx} className="w-full h-full shrink-0 flex items-center justify-center relative">
                  {media.type === 'video' ? (
                    <video
                      src={media.url}
                      className={`w-full h-full object-cover select-none ${
                        userRole !== 'admin' ? 'pointer-events-none' : ''
                      }`}
                      autoPlay
                      muted
                      loop
                      playsInline
                      onContextMenu={(e) => e.preventDefault()}
                      onDragStart={(e) => e.preventDefault()}
                    />
                  ) : (
                    <img
                      src={media.url}
                      alt={`Shop hero media ${idx + 1}`}
                      className={`w-full h-full object-cover select-none ${
                        userRole !== 'admin' ? 'pointer-events-none' : ''
                      }`}
                      loading={idx === 0 ? 'eager' : 'lazy'}
                      decoding="async"
                      onContextMenu={(e) => e.preventDefault()}
                      onDragStart={(e) => e.preventDefault()}
                      draggable={false}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Navigation Chevrons */}
            {items.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-sm border border-white/10 hover:bg-black/70 transition-colors z-20 shadow-md cursor-pointer"
                  aria-label="Previous slide"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>

                <button
                  type="button"
                  onClick={handleNext}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-sm border border-white/10 hover:bg-black/70 transition-colors z-20 shadow-md cursor-pointer"
                  aria-label="Next slide"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>

                {/* Interactive Indicator Dots */}
                <div
                  role="tablist"
                  aria-label="Hero slides"
                  className="absolute bottom-4 left-0 right-0 flex justify-center items-center gap-1.5 z-20"
                >
                  {items.map((_, idx) => (
                    <button
                      key={idx}
                      type="button"
                      role="tab"
                      aria-selected={idx === currentIndex}
                      aria-label={`Go to slide ${idx + 1}`}
                      onClick={() => setCurrentIndex(idx)}
                      className={`transition-all duration-300 rounded-full cursor-pointer ${
                        idx === currentIndex
                          ? 'w-4 h-1.5 bg-white shadow-sm'
                          : 'w-1.5 h-1.5 bg-white/50 hover:bg-white/80'
                      }`}
                    />
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>
    </section>
  );
}

export default ShopHero;
