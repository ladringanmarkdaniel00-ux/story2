import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Product } from '../../types';
import { UserRole } from '../../../../types/user';
import { ProductCard } from './ProductCard';
import { ProductScrubber } from '../shared/ProductScrubber';

interface ProductCarouselProps {
  key?: React.Key;
  blockTitle: string;
  products: Product[];
  userRole?: UserRole;
  onProductClick?: (product: Product) => void;
}

const swipeConfidenceThreshold = 10000;
const swipePower = (offset: number, velocity: number) => {
  return Math.abs(offset) * velocity;
};

export function ProductCarousel({
  blockTitle,
  products,
  userRole = 'guest',
  onProductClick,
}: ProductCarouselProps) {
  const [[page, direction], setPage] = useState([0, 0]);

  const productCount = products.length;
  const currentProductIndex = ((page % productCount) + productCount) % productCount;

  // Reset page when blockTitle changes
  useEffect(() => {
    setPage([0, 0]);
  }, [blockTitle]);

  const paginate = useCallback((newDirection: number) => {
    setPage(([prevPage]) => [prevPage + newDirection, newDirection]);
  }, []);

  const handleSelectIndex = useCallback(
    (index: number) => {
      const diff = index - currentProductIndex;
      if (diff !== 0) {
        setPage([page + diff, diff > 0 ? 1 : -1]);
      }
    },
    [page, currentProductIndex]
  );

  if (productCount === 0) return null;

  const currentProduct = products[currentProductIndex];

  const variants = {
    enter: (direction: number) => ({
      zIndex: 0,
      x: direction > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.95,
    }),
    center: {
      zIndex: 1,
      x: 0,
      opacity: 1,
      scale: 1,
    },
    exit: (direction: number) => ({
      zIndex: 0,
      x: direction < 0 ? 300 : -300,
      opacity: 0,
      scale: 0.95,
    }),
  };

  return (
    <section
      aria-label={`${blockTitle} feed`}
      className="w-full py-6 sm:py-10 md:py-12 border-b border-neutral-100 last:border-b-0 flex flex-col items-center relative overflow-hidden"
    >
      {/* Block Title Header with spacious breathing room */}
      <div className="w-full max-w-7xl px-4 sm:px-8 text-center mb-4 sm:mb-6">
        <h2 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-black text-neutral-900 tracking-tight uppercase">
          {blockTitle}
        </h2>
      </div>

      {/* Main Feed Card Container */}
      <div className="w-full flex flex-col items-center justify-center px-4 sm:px-8">
        <div className="w-full flex flex-col items-center justify-center max-w-[min(100%,380px)] sm:max-w-[min(100%,430px)] md:max-w-[min(100%,480px)]">
          {/* Frame with Curved Corners & Adjusted Height for Spacing */}
          <div className="w-full relative flex flex-col shrink-0 rounded-2xl sm:rounded-3xl">
            <div className="w-full aspect-[1/1.22] sm:aspect-[1/1.2] relative">
              <AnimatePresence initial={false} custom={direction}>
                <motion.div
                  key={page}
                  custom={direction}
                  variants={variants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{
                    x: { type: 'spring', stiffness: 300, damping: 30 },
                    opacity: { duration: 0.2 },
                    scale: { duration: 0.2 },
                  }}
                  drag={productCount > 1 ? "x" : false}
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={1}
                  onDragEnd={(_, { offset, velocity }) => {
                    if (productCount <= 1) return;
                    const swipe = swipePower(offset.x, velocity.x);
                    if (swipe < -swipeConfidenceThreshold || offset.x < -100) {
                      paginate(1);
                    } else if (swipe > swipeConfidenceThreshold || offset.x > 100) {
                      paginate(-1);
                    }
                  }}
                  className={`absolute inset-0 w-full h-full overflow-hidden flex flex-col rounded-2xl sm:rounded-3xl ${productCount > 1 ? 'cursor-grab active:cursor-grabbing' : ''}`}
                >
                  <ProductCard
                    product={currentProduct}
                    productIndex={currentProductIndex}
                    userRole={userRole}
                    onClick={onProductClick}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Smooth Draggable Style Carousel Scrubber Dots flush with minimal gap */}
        {productCount > 1 && (
          <div className="mt-0 pt-0">
            <ProductScrubber
              count={productCount}
              activeIndex={currentProductIndex}
              onSelectIndex={handleSelectIndex}
            />
          </div>
        )}
      </div>
    </section>
  );
}

export default ProductCarousel;
