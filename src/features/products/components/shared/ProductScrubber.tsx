import React, { useState, useEffect, useRef, useCallback } from 'react';

interface ProductScrubberProps {
  count: number;
  activeIndex: number;
  onSelectIndex: (index: number) => void;
}

export function ProductScrubber({ count, activeIndex, onSelectIndex }: ProductScrubberProps) {
  const [isScrubbing, setIsScrubbing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const isPointerDownRef = useRef(false);

  // Auto-scroll active dot into center view
  useEffect(() => {
    if (!containerRef.current || isScrubbing) return;
    const container = containerRef.current;
    const buttons = Array.from(container.children).filter(
      (c) => (c as HTMLElement).tagName === 'BUTTON'
    ) as HTMLElement[];
    const activeDot = buttons[activeIndex];

    if (activeDot) {
      const scrollPosition = activeDot.offsetLeft + activeDot.offsetWidth / 2 - container.clientWidth / 2;
      container.scrollTo({ left: scrollPosition, behavior: 'smooth' });
    }
  }, [activeIndex, isScrubbing]);

  const calculateIndexFromPointer = useCallback(
    (clientX: number): number => {
      if (!containerRef.current || count <= 0) return activeIndex;
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
      const percentage = rect.width > 0 ? x / rect.width : 0;

      const maxScroll = container.scrollWidth - container.clientWidth;
      if (maxScroll > 0) {
        container.scrollLeft = percentage * maxScroll;
      }

      const physicalX = x + container.scrollLeft;
      const buttons = Array.from(container.children).filter(
        (c) => (c as HTMLElement).tagName === 'BUTTON'
      ) as HTMLElement[];

      if (buttons.length === 0) return 0;

      let closestIdx = 0;
      let minDistance = Infinity;

      buttons.forEach((btn, idx) => {
        const btnCenter = btn.offsetLeft + btn.offsetWidth / 2;
        const dist = Math.abs(btnCenter - physicalX);
        if (dist < minDistance) {
          minDistance = dist;
          closestIdx = idx;
        }
      });

      return Math.max(0, Math.min(closestIdx, count - 1));
    },
    [count, activeIndex]
  );

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    isPointerDownRef.current = true;
    setIsScrubbing(true);

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // Ignored if pointer capture fails in specific iframe environments
    }

    const newIdx = calculateIndexFromPointer(e.clientX);
    if (newIdx !== activeIndex) {
      onSelectIndex(newIdx);
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current) return;
    e.preventDefault();
    const newIdx = calculateIndexFromPointer(e.clientX);
    if (newIdx !== activeIndex) {
      onSelectIndex(newIdx);
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isPointerDownRef.current = false;
    setIsScrubbing(false);
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // Ignored
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      onSelectIndex(Math.min(count - 1, activeIndex + 1));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      onSelectIndex(Math.max(0, activeIndex - 1));
    } else if (e.key === 'Home') {
      e.preventDefault();
      onSelectIndex(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      onSelectIndex(count - 1);
    }
  };

  if (count <= 1) return null;

  return (
    <div
      role="group"
      aria-label="Department carousel pagination"
      className="flex flex-col items-center justify-center w-full max-w-full shrink-0 relative mt-0 select-none"
    >
      <div
        ref={containerRef}
        tabIndex={0}
        role="slider"
        aria-valuemin={1}
        aria-valuemax={count}
        aria-valuenow={activeIndex + 1}
        aria-label={`Slide ${activeIndex + 1} of ${count}`}
        onKeyDown={handleKeyDown}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        className={`relative flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar w-max mx-auto max-w-full px-3 py-1 cursor-grab active:cursor-grabbing focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 rounded-full transition-transform ${
          isScrubbing ? 'scale-105' : 'snap-x'
        }`}
        style={{ touchAction: 'none' }}
      >
        {Array.from({ length: count }).map((_, idx) => (
          <button
            key={idx}
            type="button"
            tabIndex={-1}
            onClick={(e) => {
              e.stopPropagation();
              onSelectIndex(idx);
            }}
            aria-label={`Go to item ${idx + 1}`}
            className={`transition-all duration-300 ease-out rounded-full cursor-pointer snap-center ${
              idx === activeIndex
                ? 'w-6 h-2 bg-neutral-900 shadow-sm'
                : 'w-2 h-2 bg-neutral-300 hover:bg-neutral-400'
            }`}
          />
        ))}
      </div>
    </div>
  );
}

export default ProductScrubber;
