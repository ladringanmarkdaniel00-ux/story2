/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

interface SkeletonProps {
  className?: string;
  variant?: 'rect' | 'circle' | 'text';
}

export function Skeleton({ className = '', variant = 'rect' }: SkeletonProps) {
  const roundedClass =
    variant === 'circle' ? 'rounded-full' : variant === 'text' ? 'rounded' : 'rounded-xl';

  return (
    <div
      aria-hidden="true"
      className={`bg-neutral-200/70 dark:bg-neutral-800 animate-pulse ${roundedClass} ${className}`}
    />
  );
}

export function PostCardSkeleton() {
  return (
    <div className="w-full max-w-sm sm:max-w-md mx-auto p-4 flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Skeleton variant="circle" className="w-9 h-9 shrink-0" />
        <div className="flex flex-col gap-1.5 flex-1">
          <Skeleton variant="text" className="w-24 h-3" />
          <Skeleton variant="text" className="w-16 h-2.5" />
        </div>
      </div>
      <Skeleton className="w-full aspect-[4/5] rounded-2xl" />
      <div className="flex flex-col gap-2 pt-1">
        <Skeleton variant="text" className="w-3/4 h-3.5" />
        <Skeleton variant="text" className="w-1/2 h-3" />
      </div>
    </div>
  );
}
