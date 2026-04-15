import { useAppDispatch } from '../../../app/hooks';
import { requestNextPage } from '../mediaSlice';
import type { MediaEntity } from '../types';
import { InfiniteSentinel } from './InfiniteSentinel';
import { MediaCard } from './MediaCard';

interface MediaGridProps {
  items: MediaEntity[];
  isInitialLoading: boolean;
  isPageLoading: boolean;
  fetchError: string | null;
  showEmpty: boolean;
  emptyMessage: string;
  hasMore: boolean;
  showEndOfList: boolean;
}

function SkeletonCard() {
  return (
    <div className="flex w-full max-w-[232px] flex-col gap-4 rounded-[28px] border border-ink/8 bg-white/75 p-4 shadow-card">
      <div className="mx-auto h-[200px] w-[200px] animate-pulse rounded-[22px] bg-[#edf4f8]" />
      <div className="space-y-2">
        <div className="h-4 w-4/5 animate-pulse rounded-full bg-[#e7eef3]" />
        <div className="h-4 w-2/5 animate-pulse rounded-full bg-[#edf3f7]" />
      </div>
    </div>
  );
}

export function MediaGrid({
  items,
  isInitialLoading,
  isPageLoading,
  fetchError,
  showEmpty,
  emptyMessage,
  hasMore,
  showEndOfList
}: MediaGridProps) {
  const dispatch = useAppDispatch();

  if (isInitialLoading) {
    return (
      <div className="grid justify-items-center gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
        {Array.from({ length: 8 }, (_, index) => (
          <SkeletonCard key={index} />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6 pt-5">
      {showEmpty ? (
        <div className="rounded-[26px] border border-dashed border-ink/12 bg-[#f4f8fb] px-6 py-10 text-center text-sm text-ink/58">
          {emptyMessage}
        </div>
      ) : (
        <div className="grid justify-items-center gap-4 [grid-template-columns:repeat(auto-fit,minmax(220px,1fr))]">
          {items.map((item) => (
            <MediaCard key={item.id} item={item} />
          ))}
        </div>
      )}

      {fetchError ? (
        <div className="flex flex-col items-center gap-3 rounded-[24px] border border-rust/16 bg-rust/6 px-5 py-4 text-center sm:flex-row sm:justify-between sm:text-left">
          <p className="text-sm text-rust">{fetchError}</p>
          <button
            type="button"
            onClick={() => dispatch(requestNextPage())}
            className="rounded-full border border-rust/20 bg-white px-3.5 py-2 text-sm font-medium text-rust transition hover:border-rust/30"
          >
            Retry
          </button>
        </div>
      ) : null}

      {isPageLoading ? (
        <div className="flex items-center justify-center gap-3 py-2 text-sm text-ink/55">
          <span className="h-2 w-2 animate-pulse rounded-full bg-olive" />
          <span>Loading more</span>
        </div>
      ) : null}

      {showEndOfList ? (
        <div className="py-1 text-center text-xs font-medium uppercase tracking-[0.28em] text-ink/38">
          End of collection
        </div>
      ) : null}

      {hasMore && !fetchError ? (
        <InfiniteSentinel
          disabled={isPageLoading || isInitialLoading}
          onEnter={() => dispatch(requestNextPage())}
        />
      ) : null}
    </div>
  );
}
