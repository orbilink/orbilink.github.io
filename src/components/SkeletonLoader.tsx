import React from 'react';

export const ChatListSkeleton: React.FC = () => {
  return (
    <div className="space-y-2 p-2">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-neutral-900/40 border border-neutral-800/40 animate-pulse">
          <div className="w-12 h-12 rounded-full bg-neutral-800 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="flex justify-between items-center">
              <div className="h-4 bg-neutral-800 rounded w-1/3" />
              <div className="h-3 bg-neutral-800/60 rounded w-12" />
            </div>
            <div className="h-3 bg-neutral-800/40 rounded w-3/4" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const MessagesSkeleton: React.FC = () => {
  return (
    <div className="space-y-4 p-4 flex-1">
      <div className="flex justify-start">
        <div className="w-2/3 h-16 bg-neutral-900/60 border border-neutral-800/50 rounded-2xl rounded-tl-none animate-pulse" />
      </div>
      <div className="flex justify-end">
        <div className="w-1/2 h-12 bg-emerald-950/40 border border-emerald-800/30 rounded-2xl rounded-tr-none animate-pulse" />
      </div>
      <div className="flex justify-start">
        <div className="w-3/5 h-20 bg-neutral-900/60 border border-neutral-800/50 rounded-2xl rounded-tl-none animate-pulse" />
      </div>
      <div className="flex justify-end">
        <div className="w-2/5 h-10 bg-emerald-950/40 border border-emerald-800/30 rounded-2xl rounded-tr-none animate-pulse" />
      </div>
    </div>
  );
};
