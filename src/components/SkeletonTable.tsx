import React from 'react';

interface SkeletonTableProps {
  rows?: number;
  cols?: number;
}

export default function SkeletonTable({ rows = 5, cols = 6 }: SkeletonTableProps) {
  return (
    <div className="w-full animate-pulse divide-y theme-border">
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-4 px-4 py-4">
          {Array.from({ length: cols }).map((_, c) => (
            <div
              key={c}
              className={`h-4 rounded-md bg-gray-200 dark:bg-gray-800 ${
                c === 0 ? 'w-8' : c === 1 ? 'w-24' : 'flex-1'
              }`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}
