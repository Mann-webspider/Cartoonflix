/**
 * One loading treatment, shared by every page that waits on the catalogue.
 *
 * It holds the page's shape rather than showing a spinner, so nothing jumps
 * when the content lands. The shimmer runs on the world's own ease instead of
 * Tailwind's stock pulse, and stops entirely under reduced motion.
 */
export function SkeletonBlock({ className = "" }) {
  return <div className={`animate-[skeleton_1.6s_var(--ease)_infinite] bg-surface ${className}`} />;
}

export function BrowseSkeleton() {
  return (
    <div>
      <SkeletonBlock className="min-h-[78vh] sm:min-h-[86vh]" />
      <div className="space-y-10 px-5 py-10 sm:px-8 lg:px-14">
        {[0, 1].map((row) => (
          <div key={row}>
            <SkeletonBlock className="h-6 w-44 rounded" />
            <div className="mt-4 flex gap-4">
              {[0, 1, 2, 3, 4].map((card) => (
                <SkeletonBlock
                  key={card}
                  className="aspect-video w-[16.5rem] shrink-0 rounded sm:w-[19rem]"
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function DetailSkeleton() {
  return (
    <div className="px-5 pt-32 sm:px-8 sm:pt-40 lg:px-14 lg:pt-48">
      <SkeletonBlock className="h-14 w-full max-w-xl rounded" />
      <SkeletonBlock className="mt-5 h-4 w-64 rounded" />
      <SkeletonBlock className="mt-6 h-24 w-full max-w-prose rounded" />
      <SkeletonBlock className="mt-8 h-14 w-48 rounded" />
    </div>
  );
}
