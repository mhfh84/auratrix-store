import React from 'react';

interface SkeletonCardProps {
  count?: number;
}

export default function SkeletonCard({ count = 4 }: SkeletonCardProps) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div
          key={i}
          className="glass-panel rounded-3xl border theme-border p-4 flex flex-col gap-3 animate-pulse overflow-hidden"
        >
          {/* Image placeholder */}
          <div className="w-full aspect-square rounded-2xl bg-gray-200 dark:bg-gray-800" />
          
          {/* Category / Subtitle */}
          <div className="w-1/3 h-3 rounded-md bg-gray-200 dark:bg-gray-800 mt-1" />
          
          {/* Title */}
          <div className="w-3/4 h-4 rounded-md bg-gray-200 dark:bg-gray-800" />
          
          {/* Rating */}
          <div className="w-1/2 h-3 rounded-md bg-gray-200 dark:bg-gray-800" />
          
          {/* Price & Button */}
          <div className="flex items-center justify-between mt-2 pt-2 border-t theme-border">
            <div className="w-1/3 h-5 rounded-md bg-gray-200 dark:bg-gray-800" />
            <div className="w-8 h-8 rounded-xl bg-gray-200 dark:bg-gray-800" />
          </div>
        </div>
      ))}
    </div>
  );
}
